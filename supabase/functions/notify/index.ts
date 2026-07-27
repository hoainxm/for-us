// Supabase Edge Function: gửi Web Push cho người nhận.
// Deploy: supabase functions deploy notify
// Secrets cần set: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mailto:...)
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, data: unknown) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

webpush.setVapidDetails(
  Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@for-us.app",
  Deno.env.get("VAPID_PUBLIC_KEY")!,
  Deno.env.get("VAPID_PRIVATE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "method not allowed" });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(401, { error: "missing authorization" });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Xác thực người gọi
  const { data: caller } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!caller.user) return json(401, { error: "invalid token" });

  const { targetUserId, title, body, url } = await req.json().catch(() => ({}));
  if (!targetUserId) return json(400, { error: "targetUserId required" });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", targetUserId);
  if (error) return json(500, { error: error.message });
  if (!subs || subs.length === 0) return json(200, { sent: 0, note: "no subscriptions" });

  const payload = JSON.stringify({ title: title ?? "For Us 💕", body: body ?? "", url: url ?? "/" });

  const results = await Promise.allSettled(
    subs.map((s) =>
      webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
      ),
    ),
  );

  // Dọn subscription hết hạn (410 Gone / 404)
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    if (r.status === "rejected") {
      const code = (r.reason as { statusCode?: number })?.statusCode;
      if (code === 410 || code === 404) {
        await admin.from("push_subscriptions").delete().eq("endpoint", subs[i].endpoint);
      }
    }
  }

  return json(200, { sent: results.filter((r) => r.status === "fulfilled").length });
});
