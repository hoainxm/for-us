import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CoupleEvent, EventType } from "@/types";

const EVENT_COLS = "id, title, event_date, type, category";

export function useEvents() {
  return useQuery({
    queryKey: ["events"],
    queryFn: async (): Promise<CoupleEvent[]> => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_COLS)
        .order("event_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CoupleEvent[];
    },
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    enabled: !!id,
    queryFn: async (): Promise<CoupleEvent | null> => {
      const { data, error } = await supabase
        .from("events")
        .select(EVENT_COLS)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as CoupleEvent | null;
    },
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      title: string;
      event_date: string;
      type: EventType;
      category: string | null;
    }): Promise<string> => {
      const { data, error } = await supabase
        .from("events")
        .insert(input)
        .select("id")
        .single();
      if (error) throw error;
      return (data as { id: string }).id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
