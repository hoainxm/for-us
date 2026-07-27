import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { MessageCircle, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useAuth } from "@/providers/AuthProvider";
import { useProfiles } from "@/hooks/useProfile";
import { useAlbums, useNotes } from "@/hooks/useNotes";
import {
  REACTION_EMOJIS,
  useAllInteractions,
  useToggleReaction,
} from "@/hooks/useNoteInteractions";
import { useRealtimeInvalidate } from "@/hooks/useRealtime";
import type { NoteInteraction } from "@/types";

export default function NotesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const notes = useNotes();
  const albums = useAlbums();
  const interactions = useAllInteractions();
  const { data: profiles } = useProfiles();
  const toggleReaction = useToggleReaction();

  const [albumFilter, setAlbumFilter] = useState<string | null>(null);

  // Realtime: note mới + reaction/comment mới (LUẬT 4)
  useRealtimeInvalidate("diary-feed", [
    { table: "notes", queryKey: ["notes"] },
    { table: "note_interactions", queryKey: ["note_interactions"] },
  ]);

  const nameOf = (id: string) => profiles?.find((p) => p.id === id);
  const albumName = (id: string | null) =>
    id ? albums.data?.find((a) => a.id === id)?.name : undefined;

  const byNote = useMemo(() => {
    const map = new Map<string, NoteInteraction[]>();
    for (const i of interactions.data ?? []) {
      const arr = map.get(i.note_id) ?? [];
      arr.push(i);
      map.set(i.note_id, arr);
    }
    return map;
  }, [interactions.data]);

  const visible = (notes.data ?? []).filter(
    (n) => !albumFilter || n.album_id === albumFilter,
  );

  const onReact = (noteId: string, emoji: string) => {
    if (!user) return;
    const mine = byNote
      .get(noteId)
      ?.find((i) => i.type === "reaction" && i.author_id === user.id && i.value === emoji);
    toggleReaction.mutate(
      { noteId, authorId: user.id, emoji, existingId: mine?.id },
      { onError: (e) => toast.error("Lỗi", { description: (e as Error).message }) },
    );
  };

  return (
    <div>
      <PageHeader title="Nhật ký chung" subtitle="Những khoảnh khắc của hai đứa" />

      {/* Album chips */}
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 pt-2">
        <button onClick={() => setAlbumFilter(null)}>
          <Badge variant={albumFilter === null ? "default" : "secondary"} className="shrink-0 px-3 py-1">
            Tất cả
          </Badge>
        </button>
        {albums.data?.map((a) => (
          <button key={a.id} onClick={() => setAlbumFilter(a.id)}>
            <Badge
              variant={albumFilter === a.id ? "default" : "secondary"}
              className="shrink-0 whitespace-nowrap px-3 py-1"
            >
              {a.name}
            </Badge>
          </button>
        ))}
      </div>

      <div className="space-y-4 p-4">
        {notes.isLoading && <FeedSkeleton />}
        {notes.data && visible.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Chưa có nhật ký nào. Bấm (+) để viết dòng đầu tiên 💕
          </div>
        )}

        <div className="stagger space-y-4">
          {visible.map((note) => {
            const author = nameOf(note.author_id);
            const items = byNote.get(note.id) ?? [];
            const reactions = items.filter((i) => i.type === "reaction");
            const comments = items.filter((i) => i.type === "comment");

            // Đếm theo emoji
            const counts = new Map<string, number>();
            for (const r of reactions) counts.set(r.value, (counts.get(r.value) ?? 0) + 1);

            return (
              <Card key={note.id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header */}
                  <div className="flex items-center gap-3 p-4 pb-2">
                    <Avatar name={author?.display_name} src={author?.avatar_url} />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold leading-tight">{author?.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), {
                          addSuffix: true,
                          locale: vi,
                        })}
                      </p>
                    </div>
                    {albumName(note.album_id) && (
                      <Badge variant="outline">{albumName(note.album_id)}</Badge>
                    )}
                  </div>

                  {/* Content */}
                  {note.content && <p className="px-4 pb-3 leading-relaxed">{note.content}</p>}

                  {/* Images */}
                  {note.images.length > 0 && (
                    <div
                      className={cn(
                        "grid gap-1 px-4 pb-3",
                        note.images.length === 1 ? "grid-cols-1" : "grid-cols-2",
                      )}
                    >
                      {note.images.map((url) => (
                        <img
                          key={url}
                          src={url}
                          alt="diary"
                          loading="lazy"
                          className="aspect-square w-full rounded-lg object-cover"
                        />
                      ))}
                    </div>
                  )}

                  {/* Reaction bar */}
                  <div className="no-scrollbar flex items-center gap-1 overflow-x-auto border-t border-border/60 px-3 py-2">
                    {REACTION_EMOJIS.map((emoji) => {
                      const count = counts.get(emoji) ?? 0;
                      const mine = reactions.some(
                        (r) => r.author_id === user?.id && r.value === emoji,
                      );
                      return (
                        <button
                          key={emoji}
                          onClick={() => onReact(note.id, emoji)}
                          className={cn(
                            "active-press flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-sm transition-colors",
                            mine ? "bg-primary/12 ring-1 ring-primary/40" : "hover:bg-secondary",
                          )}
                        >
                          <span className={mine ? "animate-pop" : ""}>{emoji}</span>
                          {count > 0 && (
                            <span className="text-xs font-medium text-muted-foreground">{count}</span>
                          )}
                        </button>
                      );
                    })}

                    <button
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className="active-press ml-auto flex shrink-0 items-center gap-1.5 rounded-full px-2 py-1 text-sm text-muted-foreground hover:bg-secondary"
                    >
                      <MessageCircle className="size-4" />
                      {comments.length}
                    </button>
                  </div>

                  {/* Latest comment preview */}
                  {comments.length > 0 && (
                    <button
                      onClick={() => navigate(`/notes/${note.id}`)}
                      className="block w-full bg-secondary/40 px-4 py-2.5 text-left text-sm"
                    >
                      <span className="font-semibold">
                        {nameOf(comments[comments.length - 1].author_id)?.display_name}:{" "}
                      </span>
                      <span className="text-muted-foreground">
                        {comments[comments.length - 1].value}
                      </span>
                    </button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="size-10 animate-pulse rounded-full bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="flex items-center gap-2">
            <ImageIcon className="size-4 text-muted-foreground" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
