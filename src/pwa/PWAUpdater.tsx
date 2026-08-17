import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { notify } from "@/lib/toast";

// Cờ đặt trước khi reload, đọc lại sau khi bản mới chạy để báo thành công.
const UPDATED_FLAG = "pwa-updated";

// Đăng ký Service Worker + nhắc cập nhật khi có bản mới (registerType: "prompt").
export function PWAUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  // Vừa reload xong sau khi cập nhật -> báo thành công.
  useEffect(() => {
    if (localStorage.getItem(UPDATED_FLAG) !== "1") return;
    localStorage.removeItem(UPDATED_FLAG);
    notify.success("Đã cập nhật bản mới nhất 🎉", {
      description: "App đang chạy phiên bản mới, không cần đăng nhập lại.",
    });
  }, []);

  useEffect(() => {
    if (offlineReady) {
      notify.success("Đã sẵn sàng dùng offline");
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    notify.info("Có bản cập nhật mới", {
      duration: Infinity,
      description: "Tải lại để dùng bản mới nhất, phiên đăng nhập vẫn giữ nguyên.",
      action: {
        label: "Cập nhật",
        onClick: () => {
          localStorage.setItem(UPDATED_FLAG, "1");
          updateServiceWorker(true); // kích hoạt SW mới + reload
        },
      },
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
