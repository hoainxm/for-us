import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { NoteInteraction } from "@/types";

export const REACTION_EMOJIS = ["❤️", "😍", "😂", "🥹", "🔥", "👍"] as const;

// Lấy toàn bộ interactions (app 2 người, data nhỏ) -> group ở client.
export function useAllInteractions() {
  return useQuery({
    queryKey: ["note_interactions"],
    queryFn: async (): Promise<NoteInteraction[]> => {
      const { data, error } = await supabase
        .from("note_interactions")
        .select("id, note_id, author_id, type, value, created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as NoteInteraction[];
    },
  });
}

// Thả/gỡ reaction: cùng (note, author, emoji) đã có -> xoá, chưa có -> thêm.
export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      noteId: string;
      authorId: string;
      emoji: string;
      existingId?: string;
    }) => {
      if (params.existingId) {
        const { error } = await supabase
          .from("note_interactions")
          .delete()
          .eq("id", params.existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("note_interactions").insert({
          note_id: params.noteId,
          author_id: params.authorId,
          type: "reaction",
          value: params.emoji,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note_interactions"] }),
  });
}

export function useAddNoteComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { noteId: string; authorId: string; content: string }) => {
      const { error } = await supabase.from("note_interactions").insert({
        note_id: params.noteId,
        author_id: params.authorId,
        type: "comment",
        value: params.content,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["note_interactions"] }),
  });
}
