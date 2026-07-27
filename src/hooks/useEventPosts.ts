import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { EventPost } from "@/types";

export function useEventPosts(eventId: string | undefined) {
  return useQuery({
    queryKey: ["event_posts", eventId],
    enabled: !!eventId,
    queryFn: async (): Promise<EventPost[]> => {
      const { data, error } = await supabase
        .from("event_posts")
        .select("id, event_id, author_id, content, images, created_at")
        .eq("event_id", eventId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as EventPost[];
    },
  });
}

export interface NewEventPostInput {
  eventId: string;
  authorId: string;
  content: string;
  files: File[];
}

export function useCreateEventPost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewEventPostInput) => {
      const urls: string[] = [];
      for (const file of input.files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${input.authorId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("diary_images")
          .upload(path, file, { cacheControl: "3600" });
        if (upErr) throw upErr;
        urls.push(supabase.storage.from("diary_images").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await supabase.from("event_posts").insert({
        event_id: input.eventId,
        author_id: input.authorId,
        content: input.content,
        images: urls,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ["event_posts", vars.eventId] }),
  });
}
