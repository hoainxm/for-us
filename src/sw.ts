/// <reference lib="webworker" />
import { precacheAndRoute } from "workbox-precaching";

declare const self: ServiceWorkerGlobalScope;

// Precache app shell (vite-plugin-pwa inject danh sách vào __WB_MANIFEST)
precacheAndRoute(self.__WB_MANIFEST);

// Cho phép prompt "Cập nhật" (registerType: prompt) kích hoạt SW mới.
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

// --- Web Push: nhận payload từ Edge Function -> hiện notification ---
self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data?.json() ?? {};
  } catch {
    data = { body: event.data?.text() };
  }
  const title = data.title ?? "Couple App 💕";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body ?? "",
      icon: "/pwa-192x192.png",
      badge: "/pwa-192x192.png",
      data: { url: data.url ?? "/" },
    }),
  );
});

// Bấm notification -> focus tab đang mở hoặc mở mới, điều hướng đúng trang.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            (client as WindowClient).navigate(url);
            return (client as WindowClient).focus();
          }
        }
        return self.clients.openWindow(url);
      }),
  );
});

// --- Cache-first cho ảnh Supabase Storage (offline vẫn xem lại) ---
const IMG_CACHE = "supabase-images";
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  const isSupabaseImage =
    event.request.method === "GET" &&
    url.hostname.endsWith(".supabase.co") &&
    url.pathname.includes("/storage/v1/object/public/");
  if (!isSupabaseImage) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(IMG_CACHE);
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const res = await fetch(event.request);
      if (res.ok) cache.put(event.request, res.clone());
      return res;
    })(),
  );
});
