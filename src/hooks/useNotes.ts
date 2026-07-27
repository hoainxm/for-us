import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Album, Note } from "@/types";

export function useNotes() {
  return useQuery({
    queryKey: ["notes"],
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase
        .from("notes")
        .select("id, content, album_id, author_id, images, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Note[];
    },
  });
}

export function useAlbums() {
  return useQuery({
    queryKey: ["albums"],
    queryFn: async (): Promise<Album[]> => {
      const { data, error } = await supabase
        .from("albums")
        .select("id, name, cover_image")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Album[];
    },
  });
}

export function useCreateAlbum() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (name: string): Promise<Album> => {
      const { data, error } = await supabase
        .from("albums")
        .insert({ name })
        .select("id, name, cover_image")
        .single();
      if (error) throw error;
      return data as Album;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["albums"] }),
  });
}

export interface NewNoteInput {
  content: string;
  albumId: string | null;
  files: File[];
  authorId: string;
}

// Upload ảnh lên bucket diary_images -> lấy public URL -> insert note.
export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewNoteInput) => {
      const urls: string[] = [];
      for (const file of input.files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${input.authorId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("diary_images")
          .upload(path, file, { cacheControl: "3600" });
        if (upErr) throw upErr;
        const { data } = supabase.storage.from("diary_images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }

      const { error } = await supabase.from("notes").insert({
        content: input.content,
        album_id: input.albumId,
        author_id: input.authorId, // RLS: = auth.uid()
        images: urls,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notes"] }),
  });
}
