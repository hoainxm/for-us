import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import {
  notificationsSupported,
  requestNotificationPermission,
  showLocalNotification,
  subscribeToPush,
} from "@/pwa/notifications";

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

export function usePush() {
  const { user } = useAuth();
  const { data: profiles } = useProfiles();
  const partnerId = profiles?.find((p) => p.id !== user?.id)?.id;

  // Bật thông báo: xin quyền -> subscribe push -> lưu subscription vào DB.
  const enable = async (): Promise<
    "ok" | "denied" | "unsupported" | "no-vapid" | "push-unavailable"
  > => {
    if (!notificationsSupported()) return "unsupported";
    const perm = await requestNotificationPermission();
    if (perm !== "granted") return "denied";

    let sub: PushSubscription | null;
    try {
      sub = await subscribeToPush();
    } catch (e) {
      // pushManager.subscribe ném khi push service không dùng được
      // (Incognito, Brave chưa bật Google push, Chromium de-Google, mạng chặn FCM).
      const msg = (e as Error).message || "";
      if (/push service|not available|AbortError|Registration failed/i.test(msg)) {
        return "push-unavailable";
      }
      throw e;
    }
    if (!sub) {
      // Không có VAPID key -> vẫn cho local notification, nhưng không push server được.
      await showLocalNotification("Couple App 💕", "Đã bật thông báo (chưa cấu hình push server).");
      return "no-vapid";
    }

    const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
    if (user) {
      const { error } = await supabase.from("push_subscriptions").upsert({
        endpoint: json.endpoint,
        user_id: user.id,
        p256dh: json.keys.p256dh,
        auth: json.keys.auth,
      });
      if (error) throw error;
    }
    await showLocalNotification("Couple App 💕", "Đã bật thông báo đẩy thành công!");
    return "ok";
  };

  // Gọi Edge Function gửi push cho người nhận (bỏ qua nếu là chính mình).
  const notify = async (targetUserId: string | undefined | null, payload: PushPayload) => {
    if (!targetUserId || targetUserId === user?.id) return;
    try {
      await supabase.functions.invoke("notify", {
        body: { targetUserId, ...payload },
      });
    } catch {
      // Thông báo là phụ trợ — lỗi push không chặn luồng chính.
    }
  };

  // Gửi push thử về CHÍNH mình (để test pipeline trên 1 máy). Trả số sent.
  const test = async (): Promise<number> => {
    if (!user) return 0;
    const { data, error } = await supabase.functions.invoke("notify", {
      body: {
        targetUserId: user.id,
        title: "Thử thông báo 🔔",
        body: "Web Push hoạt động!",
        url: "/",
      },
    });
    if (error) throw error;
    return (data as { sent?: number })?.sent ?? 0;
  };

  return { enable, notify, test, partnerId, supported: notificationsSupported() };
}
