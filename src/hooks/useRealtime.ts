import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Subscribe nhiều bảng, invalidate query tương ứng khi có thay đổi (LUẬT 4).
export function useRealtimeInvalidate(
  channelName: string,
  subs: { table: string; queryKey: unknown[]; filter?: string }[],
) {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase.channel(channelName);
    for (const s of subs) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: s.table, ...(s.filter ? { filter: s.filter } : {}) },
        () => qc.invalidateQueries({ queryKey: s.queryKey }),
      );
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelName]);
}
