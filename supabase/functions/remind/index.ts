// Cron gọi định kỳ:
//   1) quét task tới giờ nhắc -> Web Push + tạo notification
//   2) nhắc chu kỳ: sắp tới / tới ngày / quá ngày dự kiến (ba-spec 01, NV7–NV8)
// Deploy: supabase functions deploy remind --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
import webpush from "npm:web-push@3.6.7";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

// Gửi push tới mọi subscription của 1 user; dọn subscription hết hạn. Trả về số push đã gửi.
async function pushTo(admin: SupabaseClient, userId: string, payload: string): Promise<number> {
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", userId);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      const code = (e as { statusCode?: number })?.statusCode;
      if (code === 410 || code === 404) {
        await admin.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
  }
  return sent;
}

async function remindTasks(admin: SupabaseClient, now: number) {
  const graceMs = 15 * 60 * 1000;

  // Ứng viên: chưa xong, có bật nhắc, chưa nhắc, chưa quá hạn quá lâu
  const { data: tasks, error } = await admin
    .from("tasks")
    .select("id, title, assigned_to, due_date, remind_before_min")
    .eq("is_completed", false)
    .is("reminded_at", null)
    .not("remind_before_min", "is", null)
    .gte("due_date", new Date(now - graceMs).toISOString())
    .lte("due_date", new Date(now + 24 * 60 * 60 * 1000).toISOString());
  if (error) throw error;

  let sent = 0;
  for (const t of tasks ?? []) {
    const remindAt = new Date(t.due_date).getTime() - (t.remind_before_min ?? 0) * 60000;
    if (remindAt > now) continue; // chưa tới giờ nhắc
    if (!t.assigned_to) continue;

    sent += await pushTo(
      admin,
      t.assigned_to,
      JSON.stringify({ title: "Nhắc việc ⏰", body: t.title, url: `/tasks/${t.id}` }),
    );

    // Notification trong app + đánh dấu đã nhắc
    await admin.from("notifications").insert({
      user_id: t.assigned_to,
      actor_id: t.assigned_to,
      type: "reminder",
      title: "Nhắc việc ⏰",
      body: t.title,
      url: `/tasks/${t.id}`,
      entity_id: t.id,
    });
    await admin.from("tasks").update({ reminded_at: new Date().toISOString() }).eq("id", t.id);
  }
  return { checked: tasks?.length ?? 0, sent };
}

type CycleKind = "period_upcoming" | "period_due" | "period_late";

// Giờ + ngày theo Asia/Ho_Chi_Minh (UTC+7, không có giờ mùa hè).
function vnClock(now: number) {
  const vn = new Date(now + 7 * 60 * 60 * 1000);
  return { hour: vn.getUTCHours(), today: vn.toISOString().slice(0, 10) };
}

const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);

// Cửa sổ nhắc không giao nhau (R5): sắp tới [pred−lead, pred−1] · tới ngày [pred, pred+2] · quá ngày ≥ pred+3
function kindFor(daysUntil: number, lead: number): CycleKind | null {
  if (daysUntil >= 1 && daysUntil <= lead) return "period_upcoming";
  if (daysUntil <= 0 && daysUntil >= -2) return "period_due";
  if (daysUntil <= -3) return "period_late";
  return null;
}

function cycleMessage(kind: CycleKind, days: number, self: boolean, name: string) {
  const whose = self ? "" : ` của ${name}`;
  if (kind === "period_upcoming") {
    return {
      title: "Sắp tới kỳ 🌸",
      body: self
        ? `Còn ${days} ngày tới kỳ 🌸`
        : `Còn ${days} ngày tới kỳ${whose}, nhớ quan tâm nhé 💕`,
    };
  }
  if (kind === "period_due") {
    return {
      title: "Ngày dự kiến tới kỳ 🌸",
      body: days === 0
        ? `Hôm nay là ngày dự kiến tới kỳ${whose} ${self ? "🌸" : "💕"}`
        : `Đã qua ngày dự kiến tới kỳ${whose} ${days} ngày`,
    };
  }
  return {
    title: "Đã qua ngày dự kiến",
    body: `Đã qua ngày dự kiến ${days} ngày. Nếu kỳ đã bắt đầu, ghi lại để dự đoán chính xác hơn nhé`,
  };
}

async function remindCycles(admin: SupabaseClient, now: number) {
  const { hour, today } = vnClock(now);
  if (hour < 8 || hour >= 21) return { skipped: "outside 08:00-21:00 VN", sent: 0 }; // R6

  const [{ data: subjects, error }, { data: allSettings }, { data: profiles }] = await Promise.all([
    admin.from("cycle_settings").select("user_id, lead_days, notify_enabled").eq("is_tracking", true),
    admin.from("cycle_settings").select("user_id, notify_enabled"),
    admin.from("profiles").select("id, display_name"),
  ]);
  if (error) throw error;

  const notifyOn = (uid: string) =>
    (allSettings ?? []).find((s) => s.user_id === uid)?.notify_enabled ?? true; // mặc định bật

  let sent = 0;
  for (const subj of subjects ?? []) {
    const { data: st, error: stErr } = await admin.rpc("cycle_status", {
      p_user: subj.user_id,
      p_on: today,
    });
    if (stErr || !st?.last_period_id || !st.next_start || st.data_status === "in_period") continue;

    const daysUntil = daysBetween(today, st.next_start);
    const kind = kindFor(daysUntil, subj.lead_days);
    if (!kind) continue;

    const partner = (profiles ?? []).find((p) => p.id !== subj.user_id);
    const name = (profiles ?? []).find((p) => p.id === subj.user_id)?.display_name || "người ấy";

    // Người nhận: chủ dữ liệu (nếu bật) + người đồng hành (trừ "quá ngày" — yêu cầu hành động chỉ U1 làm được)
    const recipients: string[] = [];
    if (notifyOn(subj.user_id)) recipients.push(subj.user_id);
    if (partner && kind !== "period_late" && notifyOn(partner.id)) recipients.push(partner.id);
    if (recipients.length === 0) continue;

    // Chống trùng (R5): chỉ người nhận vừa được ghi log mới được gửi
    const { data: fresh } = await admin
      .from("cycle_reminder_log")
      .upsert(
        recipients.map((r) => ({ period_id: st.last_period_id, kind, recipient_id: r })),
        { onConflict: "period_id,kind,recipient_id", ignoreDuplicates: true },
      )
      .select("recipient_id");

    const days = kind === "period_upcoming" ? daysUntil : -daysUntil;
    for (const { recipient_id } of fresh ?? []) {
      const msg = cycleMessage(kind, days, recipient_id === subj.user_id, name);
      sent += await pushTo(admin, recipient_id, JSON.stringify({ ...msg, url: "/cycle" }));
      await admin.from("notifications").insert({
        user_id: recipient_id,
        actor_id: subj.user_id,
        type: kind,
        title: msg.title,
        body: msg.body,
        url: "/cycle",
        entity_id: st.last_period_id,
      });
    }
  }
  return { checked: subjects?.length ?? 0, sent };
}

Deno.serve(async (req) => {
  // Chỉ cho cron gọi (secret header)
  const secret = req.headers.get("x-cron-secret");
  if (!secret || secret !== Deno.env.get("CRON_SECRET")) {
    return json(401, { error: "unauthorized" });
  }

  const vapidPublic = Deno.env.get("VAPID_PUBLIC_KEY")?.trim();
  const vapidPrivate = Deno.env.get("VAPID_PRIVATE_KEY")?.trim();
  if (!vapidPublic || !vapidPrivate) return json(500, { error: "missing VAPID secrets" });
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT")?.trim() || "mailto:admin@for-us.app",
    vapidPublic,
    vapidPrivate,
  );

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const now = Date.now();
  try {
    const tasks = await remindTasks(admin, now);
    const cycles = await remindCycles(admin, now);
    return json(200, { ...tasks, cycles });
  } catch (e) {
    return json(500, { error: (e as Error).message });
  }
});
