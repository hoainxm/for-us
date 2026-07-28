// Cron gọi định kỳ: quét task tới giờ nhắc -> Web Push + tạo notification.
// Deploy: supabase functions deploy remind --no-verify-jwt
// Secrets: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_SECRET
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });

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
  if (error) return json(500, { error: error.message });

  let sent = 0;
  for (const t of tasks ?? []) {
    const remindAt = new Date(t.due_date).getTime() - (t.remind_before_min ?? 0) * 60000;
    if (remindAt > now) continue; // chưa tới giờ nhắc
    if (!t.assigned_to) continue;

    const payload = JSON.stringify({
      title: "Nhắc việc ⏰",
      body: t.title,
      url: `/tasks/${t.id}`,
    });

    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", t.assigned_to);

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

  return json(200, { checked: tasks?.length ?? 0, sent });
});
