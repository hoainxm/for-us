import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { useAuth } from "@/providers/AuthProvider";
import { useNotifications } from "@/hooks/useNotifications";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";

export function NotificationBell() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data } = useNotifications(user?.id);
  const unread = (data ?? []).filter((n) => !n.is_read).length;

  useRealtimeInvalidate(`notif-badge:${user?.id}`, [
    { table: "notifications", queryKey: ["notifications", user?.id], filter: `user_id=eq.${user?.id}` },
  ]);

  return (
    <button
      onClick={() => navigate("/notifications")}
      aria-label="Thông báo"
      className="active-press relative flex size-9 items-center justify-center rounded-full"
    >
      <Bell className="size-6 text-foreground" />
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  );
}
