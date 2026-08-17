import { useEffect } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { notify } from "@/lib/toast";
import { supabase } from "@/lib/supabase";

// Đăng ký Service Worker + nhắc cập nhật khi có bản mới (registerType: "prompt").
export function PWAUpdater() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    if (offlineReady) {
      notify.success("Đã sẵn sàng dùng offline");
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  useEffect(() => {
    if (!needRefresh) return;
    // Bản mới -> đăng xuất rồi reload để test lại luồng đăng nhập mỗi lần cập nhật.
    const applyUpdate = async () => {
      try {
        await supabase.auth.signOut();
      } catch {
        // kệ, vẫn cập nhật
      }
      updateServiceWorker(true); // kích hoạt SW mới + reload
    };
    notify.info("Có bản cập nhật mới", {
      duration: Infinity,
      description: "Cập nhật sẽ đăng xuất để đăng nhập lại.",
      action: { label: "Cập nhật", onClick: applyUpdate },
      onDismiss: () => setNeedRefresh(false),
    });
  }, [needRefresh, setNeedRefresh, updateServiceWorker]);

  return null;
}
