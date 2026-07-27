import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TaskComment } from "@/types";

export function useTaskComments(taskId: string | undefined) {
  return useQuery({
    queryKey: ["task_comments", taskId],
    enabled: !!taskId,
    queryFn: async (): Promise<TaskComment[]> => {
      const { data, error } = await supabase
        .from("task_comments")
        .select("id, task_id, author_id, content, created_at")
        .eq("task_id", taskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TaskComment[];
    },
  });
}

export function useAddComment(taskId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { authorId: string; content: string }) => {
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId!,
        author_id: params.authorId, // RLS: phải = auth.uid()
        content: params.content,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["task_comments", taskId] }),
  });
}
