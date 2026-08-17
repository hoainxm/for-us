import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, CalendarClock, Loader2, Repeat, Send } from "lucide-react";
import { notify } from "@/lib/toast";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { useTask } from "@/hooks/useTasks";
import { useAddComment, useTaskComments } from "@/hooks/useTaskComments";
import { usePush } from "@/hooks/usePush";

const recurrenceLabel: Record<string, string> = {
  daily: "Hằng ngày",
  weekly: "Hằng tuần",
  monthly: "Hằng tháng",
};

export default function TaskDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const task = useTask(id);
  const comments = useTaskComments(id);
  const addComment = useAddComment(id);
  const { data: profiles } = useProfiles();
  const nameOf = (uid: string) => profiles?.find((p) => p.id === uid);
  const push = usePush();

  const [text, setText] = useState("");

  // Realtime cho comments (LUẬT 4)
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`task_comments:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "task_comments", filter: `task_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["task_comments", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, qc]);

  const send = () => {
    const content = text.trim();
    if (!content || !user) return;
    addComment.mutate(
      { authorId: user.id, content },
      {
        onSuccess: () => {
          setText("");
          push.notify(push.partnerId, {
            title: `Bình luận việc 💬`,
            body: content,
            url: `/tasks/${id}`,
          });
        },
        onError: (e) => notify.error("Không gửi được", { description: (e as Error).message }),
      },
    );
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header
        className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-background px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => navigate(-1)} aria-label="Quay lại" className="active-press">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="font-semibold">Chi tiết việc</h1>
      </header>

      {/* Body cuộn */}
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {task.isLoading && <div className="h-28 animate-pulse rounded-xl bg-muted" />}
        {task.data && (
          <Card className="space-y-3 p-4">
            <h2 className="text-lg font-bold leading-snug">{task.data.title}</h2>
            <div className="flex flex-wrap gap-1.5">
              {task.data.tags.map((t) => (
                <Badge key={t} variant="secondary">
                  {t}
                </Badge>
              ))}
              {task.data.recurrence_rule && (
                <Badge variant="outline">
                  <Repeat className="size-3" />
                  {recurrenceLabel[task.data.recurrence_rule]}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock className="size-4" />
              {format(new Date(task.data.due_date), "EEEE, dd/MM/yyyy HH:mm", { locale: vi })}
            </div>
            <div className="flex items-center gap-2 pt-1">
              <Avatar
                name={nameOf(task.data.assigned_to)?.display_name}
                src={nameOf(task.data.assigned_to)?.avatar_url}
                className="size-7"
              />
              <span className="text-sm">
                Giao cho{" "}
                <span className="font-medium">
                  {nameOf(task.data.assigned_to)?.display_name ?? "?"}
                </span>
              </span>
            </div>
          </Card>
        )}

        {/* Comments */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
            Bình luận ({comments.data?.length ?? 0})
          </h3>
          {comments.isLoading && <div className="h-16 animate-pulse rounded-xl bg-muted" />}
          <div className="space-y-3">
            {comments.data?.map((c) => {
              const author = nameOf(c.author_id);
              const mine = c.author_id === user?.id;
              return (
                <div key={c.id} className={cnRow(mine)}>
                  {!mine && (
                    <Avatar name={author?.display_name} src={author?.avatar_url} className="size-8" />
                  )}
                  <div className={bubble(mine)}>
                    {!mine && (
                      <p className="mb-0.5 text-xs font-semibold">{author?.display_name}</p>
                    )}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{c.content}</p>
                    <p className={mine ? "mt-1 text-right text-[10px] opacity-80" : "mt-1 text-[10px] text-muted-foreground"}>
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              );
            })}
            {comments.data && comments.data.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Chưa có bình luận. Nhắn gì đó cho nhau đi 💬
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Input gửi comment */}
      <div
        className="flex shrink-0 items-center gap-2 border-t border-border/60 bg-background p-3"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Viết bình luận..."
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <Button
          size="icon"
          className="size-12 shrink-0"
          onClick={send}
          disabled={addComment.isPending || !text.trim()}
          aria-label="Gửi"
        >
          {addComment.isPending ? <Loader2 className="size-5 animate-spin" /> : <Send className="size-5" />}
        </Button>
      </div>
    </div>
  );
}

function cnRow(mine: boolean) {
  return mine ? "flex justify-end gap-2" : "flex items-start gap-2";
}
function bubble(mine: boolean) {
  return mine
    ? "max-w-[78%] rounded-2xl rounded-br-md bg-primary px-3 py-2 text-primary-foreground"
    : "max-w-[78%] rounded-2xl rounded-tl-md bg-secondary px-3 py-2";
}
