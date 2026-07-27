import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CoupleEvent, EventType } from "@/types";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<CoupleEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title, event_date, type")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CoupleEvent[];
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; event_date: string; type: EventType }) => {
      const { error } = await supabase.from("events").insert(input);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
