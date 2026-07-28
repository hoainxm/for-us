import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { useAlbums, useNotes } from "@/hooks/useNotes";
import {
  REACTION_EMOJIS,
  useAddNoteComment,
  useAllInteractions,
  useToggleReaction,
} from "@/hooks/useNoteInteractions";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import { usePush } from "@/hooks/usePush";

export default function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const notes = useNotes();
  const albums = useAlbums();
  const interactions = useAllInteractions();
  const { data: profiles } = useProfiles();
  const addComment = useAddNoteComment();
  const toggleReaction = useToggleReaction();
  const push = usePush();

  const [text, setText] = useState("");

  useRealtimeInvalidate(`note:${id}`, [
    { table: "note_interactions", queryKey: ["note_interactions"], filter: `note_id=eq.${id}` },
  ]);

  const note = notes.data?.find((n) => n.id === id);
  const nameOf = (uid: string) => profiles?.find((p) => p.id === uid);
  const albumName = note?.album_id
    ? albums.data?.find((a) => a.id === note.album_id)?.name
    : undefined;

  const items = useMemo(
    () => (interactions.data ?? []).filter((i) => i.note_id === id),
    [interactions.data, id],
  );
  const reactions = items.filter((i) => i.type === "reaction");
  const comments = items.filter((i) => i.type === "comment");

  const counts = new Map<string, number>();
  for (const r of reactions) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);

  const onReact = (emoji: string) => {
    if (!user) return;
    const mine = reactions.find((r) => r.author_id === user.id && r.value === emoji);
    toggleReaction.mutate({ noteId: id!, authorId: user.id, emoji, existingId: mine?.id });
    if (!mine) {
      push.notify(push.partnerId, {
        title: "Thả cảm xúc 💗",
        body: `Đã thả ${emoji} vào nhật ký của bạn`,
        url: `/notes/${id}`,
      });
    }
  };

  const send = () => {
    const content = text.trim();
    if (!content || !user) return;
    addComment.mutate(
      { noteId: id!, authorId: user.id, content },
      {
        onSuccess: () => {
          setText("");
          push.notify(push.partnerId, {
            title: "Bình luận nhật ký 💬",
            body: content,
            url: `/notes/${id}`,
          });
        },
        onError: (e) => toast.error("Không gửi được", { description: (e as Error).message }),
      },
    );
  };

  return (
    <div className="mx-auto flex h-dvh w-full max-w-md flex-col bg-background">
      <header
        className="flex shrink-0 items-center gap-3 border-b border-border/60 bg-background px-4 py-3"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <button onClick={() => navigate(-1)} aria-label="Quay lại" className="active-press">
          <ArrowLeft className="size-6" />
        </button>
        <h1 className="font-semibold">Nhật ký</h1>
      </header>

      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto p-4">
        {!note && notes.isLoading && <div className="h-40 animate-pulse rounded-xl bg-muted" />}
        {note && (
          <Card className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <Avatar
                name={nameOf(note.author_id)?.display_name}
                src={nameOf(note.author_id)?.avatar_url}
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight">
                  {nameOf(note.author_id)?.display_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: vi })}
                </p>
              </div>
              {albumName && <Badge variant="outline">{albumName}</Badge>}
            </div>

            {note.content && (
              <p className="whitespace-pre-wrap break-words leading-relaxed">{note.content}</p>
            )}

            {note.images.length > 0 && (
              <div className={cn("grid gap-1", note.images.length === 1 ? "grid-cols-1" : "grid-cols-2")}>
                {note.images.map((url) => (
                  <img key={url} src={url} alt="diary" className="aspect-square w-full rounded-lg object-cover" />
                ))}
              </div>
            )}

            {/* Reaction palette */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REACTION_EMOJIS.map((emoji) => {
                const count = counts.get(emoji) ?? 0;
                const mine = reactions.some((r) => r.author_id === user?.id && r.value === emoji);
                return (
                  <button
                    key={emoji}
                    onClick={() => onReact(emoji)}
                    className={cn(
                      "active-press flex items-center gap-1 rounded-full px-2.5 py-1 text-sm transition-colors",
                      mine ? "bg-primary/12 ring-1 ring-primary/40" : "bg-secondary",
                    )}
                  >
                    <span className={mine ? "animate-pop" : ""}>{emoji}</span>
                    {count > 0 && <span className="text-xs font-medium">{count}</span>}
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {/* Comments */}
        <div>
          <h3 className="mb-2 px-1 text-sm font-semibold text-muted-foreground">
            Bình luận ({comments.length})
          </h3>
          <div className="space-y-3">
            {comments.map((c) => {
              const author = nameOf(c.author_id);
              const mine = c.author_id === user?.id;
              return (
                <div key={c.id} className={mine ? "flex justify-end gap-2" : "flex items-start gap-2"}>
                  {!mine && (
                    <Avatar name={author?.display_name} src={author?.avatar_url} className="size-8" />
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-3 py-2",
                      mine
                        ? "rounded-br-md bg-primary text-primary-foreground"
                        : "rounded-tl-md bg-secondary",
                    )}
                  >
                    {!mine && <p className="mb-0.5 text-xs font-semibold">{author?.display_name}</p>}
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{c.value}</p>
                    <p className={mine ? "mt-1 text-right text-[10px] opacity-80" : "mt-1 text-[10px] text-muted-foreground"}>
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: vi })}
                    </p>
                  </div>
                </div>
              );
            })}
            {comments.length === 0 && (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Chưa có bình luận nào.
              </p>
            )}
          </div>
        </div>
      </div>

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
