// Web Push — phần client. Push từ server (VAPID + Edge Function) là bước tuỳ chọn,
// xem README. Ở đây: xin quyền + demo local notification qua Service Worker.

export function notificationsSupported() {
  return "Notification" in window && "serviceWorker" in navigator;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return "denied";
  return Notification.requestPermission();
}

export async function showLocalNotification(title: string, body: string) {
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification(title, {
    body,
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
  });
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

// Chỉ chạy nếu có VAPID public key (VITE_VAPID_PUBLIC_KEY). Trả về subscription
// để gửi lên backend/Edge Function lưu lại. Chưa cấu hình -> trả null.
export async function subscribeToPush(): Promise<PushSubscription | null> {
  const vapid = (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined)?.trim();
  if (!vapid || !notificationsSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;
  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid),
  });
}
