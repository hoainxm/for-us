import { Outlet, useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

// Khung app: giới hạn max-w-md trên desktop, full màn trên mobile.
// Nội dung cuộn riêng, chừa chỗ cho BottomNav + safe-area iOS.
export function AppShell() {
  const location = useLocation();

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-background">
      {/* key theo path -> remount -> chạy lại animation chuyển trang */}
      <main
        key={location.pathname}
        className="no-scrollbar animate-page flex-1 overflow-y-auto"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)",
        }}
      >
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
