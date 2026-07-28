import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  CheckSquare,
  Clock,
  Heart,
  MessageCircle,
  NotebookPen,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import {
  useMarkAllRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/hooks/useNotifications";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import type { NotificationType } from "@/types";

const iconFor: Record<NotificationType, typeof Bell> = {
  task_created: CheckSquare,
  task_comment: MessageCircle,
  note_created: NotebookPen,
  note_comment: MessageCircle,
  reaction: Heart,
  event_post: Heart,
  reminder: Clock,
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data, isLoading } = useNotifications(user?.id);
  const markRead = useMarkNotificationRead(user?.id);
  const markAll = useMarkAllRead(user?.id);

  useRealtimeInvalidate(`notifications:${user?.id}`, [
    { table: "notifications", queryKey: ["notifications", user?.id], filter: `user_id=eq.${user?.id}` },
  ]);

  const open = (id: string, url: string, isRead: boolean) => {
    if (!isRead) markRead.mutate(id);
    navigate(url);
  };

  const hasUnread = (data ?? []).some((n) => !n.is_read);

  return (
    <div>
      <PageHeader
        title="Thông báo"
        avatar={false}
        action={
          <div className="flex items-center gap-1">
            {hasUnread && (
              <button
                onClick={() => markAll.mutate()}
                className="active-press flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary"
              >
                <CheckCheck className="size-4" />
                Đọc hết
              </button>
            )}
            <button onClick={() => navigate(-1)} aria-label="Quay lại" className="active-press">
              <ArrowLeft className="size-5" />
            </button>
          </div>
        }
      />

      <div className="space-y-2 p-4">
        {isLoading && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {data && data.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Chưa có thông báo nào 🔔
          </div>
        )}
        {data?.map((n) => {
          const Icon = iconFor[n.type] ?? Bell;
          return (
            <button
              key={n.id}
              onClick={() => open(n.id, n.url, n.is_read)}
              className="active-press block w-full text-left"
            >
              <Card
                className={cn(
                  "flex items-start gap-3 p-3",
                  !n.is_read && "border-primary/30 bg-primary/5",
                )}
              >
                <div
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    n.is_read ? "bg-secondary text-secondary-foreground" : "bg-primary/15 text-primary",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">{n.title}</p>
                  {n.body && <p className="truncate text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: vi })}
                  </p>
                </div>
                {!n.is_read && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
              </Card>
            </button>
          );
        })}
      </div>
    </div>
  );
}
