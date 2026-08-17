import { useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { differenceInCalendarDays, format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, ImagePlus, Loader2, Send, Trash2, X } from "lucide-react";
import { notify } from "@/lib/toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useEvent, useDeleteEvent } from "@/hooks/useEvents";
import { useCreateEventPost, useEventPosts } from "@/hooks/useEventPosts";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";

export default function EventDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const event = useEvent(id);
  const posts = useEventPosts(id);
  const { data: profiles } = useProfiles();
  const createPost = useCreateEventPost();
  const deleteEvent = useDeleteEvent();
  const nameOf = (uid: string) => profiles?.find((p) => p.id === uid);

  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useRealtimeInvalidate(`event_posts:${id}`, [
    { table: "event_posts", queryKey: ["event_posts", id], filter: `event_id=eq.${id}` },
  ]);

  const ev = event.data;
  const diff = ev ? differenceInCalendarDays(new Date(ev.event_date), new Date()) : 0;
  const isAnniversary = ev?.type === "anniversary";
  const label = isAnniversary
    ? diff <= 0
      ? "ngày đã qua"
      : "ngày nữa"
    : diff >= 0
      ? "ngày nữa"
      : "ngày trước";

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(e.target.files ?? []);
    if (picked.some((f) => f.size > 5 * 1024 * 1024)) {
      notify.error("Mỗi ảnh tối đa 5MB");
      return;
    }
    setFiles((p) => [...p, ...picked].slice(0, 10));
    e.target.value = "";
  };

  const submit = () => {
    if (!user || !id) return;
    if (!content.trim() && files.length === 0) return notify.error("Viết gì đó hoặc thêm ảnh");
    createPost.mutate(
      { eventId: id, authorId: user.id, content: content.trim(), files },
      {
        onSuccess: () => {
          setContent("");
          setFiles([]);
          notify.success("Đã đăng");
        },
        onError: (e) => notify.error("Lỗi đăng", { description: (e as Error).message }),
      },
    );
  };

  const [askDelete, setAskDelete] = useState(false);

  const removeEvent = () => {
    if (!id) return;
    deleteEvent.mutate(id, {
      onSuccess: () => {
        setAskDelete(false);
        notify.success("Đã xoá sự kiện");
        navigate("/events");
      },
      onError: (e) => {
        setAskDelete(false);
        notify.error("Lỗi xoá", { description: (e as Error).message });
      },
    });
  };

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      <header
        className="sticky top-0 z-20 flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-lg"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => navigate(-1)} aria-label="Quay lại" className="active-press">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="flex-1 truncate font-semibold">{ev?.title ?? "Sự kiện"}</h1>
        <button
          onClick={() => setAskDelete(true)}
          aria-label="Xoá"
          className="active-press text-destructive"
        >
          <Trash2 className="size-5" />
        </button>
      </header>

      <div className="space-y-5 p-4">
        {/* Countdown card */}
        {event.isLoading && <div className="h-32 animate-pulse rounded-xl bg-muted" />}
        {ev && (
          <Card
            className={cn(
              "flex flex-col items-center gap-1 p-6 text-center",
              isAnniversary
                ? "bg-gradient-to-br from-accent to-card"
                : "bg-gradient-to-br from-primary/10 to-card",
            )}
          >
            {ev.category && <Badge variant="secondary">{ev.category}</Badge>}
            <p
              className={cn(
                "mt-1 text-5xl font-bold tabular-nums",
                isAnniversary ? "text-accent-foreground" : "text-primary",
              )}
            >
              {Math.abs(diff)}
            </p>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium">
              {format(new Date(ev.event_date), "EEEE, dd/MM/yyyy", { locale: vi })}
            </p>
          </Card>
        )}

        {/* Composer */}
        <Card className="space-y-3 p-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            placeholder="Viết kỷ niệm về sự kiện này..."
            className="w-full resize-none rounded-lg bg-transparent p-1 text-base outline-none placeholder:text-muted-foreground"
          />
          {files.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square">
                  <img src={URL.createObjectURL(f)} alt="" className="size-full rounded-lg object-cover" />
                  <button
                    onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))}
                    className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              onClick={() => fileRef.current?.click()}
              className="active-press flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm text-muted-foreground"
            >
              <ImagePlus className="size-5" />
              Ảnh
            </button>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickFiles} />
            <Button size="sm" onClick={submit} disabled={createPost.isPending}>
              {createPost.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Đăng
            </Button>
          </div>
        </Card>

        {/* Posts */}
        <div className="stagger space-y-4">
          {posts.data?.map((post) => {
            const author = nameOf(post.author_id);
            return (
              <Card key={post.id} className="overflow-hidden">
                <div className="flex items-center gap-3 p-4 pb-2">
                  <Avatar name={author?.display_name} src={author?.avatar_url} />
                  <div>
                    <p className="font-semibold leading-tight">{author?.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
                {post.content && (
                  <p className="whitespace-pre-wrap break-words px-4 pb-3 leading-relaxed">{post.content}</p>
                )}
                {post.images.length > 0 && (
                  <div className={cn("grid gap-1 px-4 pb-4", post.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                    {post.images.map((url) => (
                      <img key={url} src={url} alt="" loading="lazy" className="aspect-square w-full rounded-lg object-cover" />
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
          {posts.data && posts.data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Chưa có kỷ niệm nào cho sự kiện này.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={askDelete}
        title="Xoá sự kiện này?"
        description={`${ev?.title ?? "Sự kiện"} và toàn bộ kỷ niệm đã đăng sẽ mất, không khôi phục lại được.`}
        confirmLabel="Xoá"
        loading={deleteEvent.isPending}
        onConfirm={removeEvent}
        onCancel={() => setAskDelete(false)}
      />
    </div>
  );
}
