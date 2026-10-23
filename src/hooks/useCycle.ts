import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { CycleSettings, CycleStatus } from "@/types";

// Mọi query chu kỳ dùng chung tiền tố ["cycle"] -> 1 lần invalidate là đủ.
const CYCLE = ["cycle"] as const;

// Cấu hình chu kỳ của cả 2 người (app 2 người -> tối đa 2 dòng) + ai đã có dữ liệu kỳ.
export function useCycleSettingsAll() {
  return useQuery({
    queryKey: [...CYCLE, "settings"],
    queryFn: async (): Promise<{ rows: CycleSettings[]; withLogs: string[] }> => {
      const [settings, logs] = await Promise.all([
        supabase
          .from("cycle_settings")
          .select("user_id, is_tracking, cycle_length, period_length, lead_days, notify_enabled"),
        supabase.from("period_logs").select("user_id"),
      ]);
      if (settings.error) throw settings.error;
      if (logs.error) throw logs.error;
      const withLogs = [...new Set((logs.data ?? []).map((l) => l.user_id as string))];
      return { rows: (settings.data ?? []) as CycleSettings[], withLogs };
    },
  });
}

// Trạng thái + dự đoán + lịch sử của 1 người — tính ở DB (cycle_status), không tính lại ở client.
export function useCycleStatus(userId: string | undefined) {
  return useQuery({
    queryKey: [...CYCLE, "status", userId],
    enabled: !!userId,
    queryFn: async (): Promise<CycleStatus> => {
      const { data, error } = await supabase.rpc("cycle_status", { p_user: userId });
      if (error) throw error;
      return data as CycleStatus;
    },
  });
}

/**
 * Chọn "dữ liệu đang xem". Một người là "chủ dữ liệu" khi đang theo dõi HOẶC đã có kỳ được ghi
 * (dòng cấu hình chỉ để tắt nhắc của người đồng hành thì không tính). Ưu tiên của mình.
 * Không ai là chủ dữ liệu -> onboarding (subjectId = null).
 */
export function useCycleSubjects(myId: string | undefined, preferred?: string | null) {
  const settings = useCycleSettingsAll();
  const rows = settings.data?.rows ?? [];
  const withLogs = settings.data?.withLogs ?? [];
  const mine = rows.find((r) => r.user_id === myId);
  const partner = rows.find((r) => r.user_id !== myId);
  const isSubject = (r?: CycleSettings) => !!r && (r.is_tracking || withLogs.includes(r.user_id));
  const candidates = [mine, partner].filter(isSubject) as CycleSettings[];
  const both = candidates.length === 2;
  const subjectId =
    (preferred && candidates.some((c) => c.user_id === preferred) ? preferred : null) ??
    candidates[0]?.user_id ??
    null;
  return { settings, mine, partner, both, subjectId, isOwner: !!subjectId && subjectId === myId };
}

// Mã lỗi từ trigger/constraint ở DB -> câu tiếng Việt.
export function cycleErrorMessage(e: unknown): string {
  const msg = (e as { message?: string })?.message ?? "";
  if (msg.includes("CYCLE_FUTURE")) return "Không ghi được ngày trong tương lai";
  if (msg.includes("CYCLE_OPEN")) return "Kỳ hiện tại chưa kết thúc. Ghi kết thúc kỳ trước đã nhé";
  if (msg.includes("CYCLE_OVERLAP")) return "Trùng với một kỳ đã ghi";
  if (msg.includes("period_logs_range")) return "Ngày kết thúc phải sau ngày bắt đầu và kỳ dài tối đa 15 ngày";
  return msg || "Có lỗi xảy ra";
}

function useInvalidateCycle() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: CYCLE });
}

// NV1 — bật theo dõi lần đầu: lưu cấu hình + ghi kỳ gần nhất.
export function useStartTracking() {
  const invalidate = useInvalidateCycle();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      lastStart: string;
      cycle_length: number;
      period_length: number;
      lead_days: number;
    }) => {
      const { userId, lastStart, ...cfg } = input;
      const { error } = await supabase
        .from("cycle_settings")
        .upsert({ user_id: userId, is_tracking: true, ...cfg, updated_at: new Date().toISOString() });
      if (error) throw error;
      const { error: logErr } = await supabase.rpc("cycle_log_start", { p_start: lastStart });
      // Đã có kỳ trùng ngày (bật lại theo dõi) -> bỏ qua, cấu hình vẫn được lưu.
      if (logErr && !logErr.message.includes("CYCLE_OVERLAP")) throw logErr;
    },
    onSuccess: invalidate,
  });
}

// NV2 — ghi bắt đầu kỳ (tự đóng kỳ quên kết thúc > 10 ngày).
export function useLogPeriodStart() {
  const invalidate = useInvalidateCycle();
  return useMutation({
    mutationFn: async (start: string): Promise<{ id: string; auto_closed_end: string | null }> => {
      const { data, error } = await supabase.rpc("cycle_log_start", { p_start: start });
      if (error) throw error;
      return data as { id: string; auto_closed_end: string | null };
    },
    onSuccess: invalidate,
  });
}

// NV3 / NV4 — ghi kết thúc hoặc sửa 1 kỳ.
export function useUpdatePeriod() {
  const invalidate = useInvalidateCycle();
  return useMutation({
    mutationFn: async (input: { id: string; start_date?: string; end_date: string | null }) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from("period_logs")
        .update({ ...patch, is_estimated: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeletePeriod() {
  const invalidate = useInvalidateCycle();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("period_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

// NV9 / NV10 — lưu cấu hình của chính mình.
export function useSaveCycleSettings() {
  const invalidate = useInvalidateCycle();
  return useMutation({
    mutationFn: async (input: Partial<CycleSettings> & { user_id: string }) => {
      const { error } = await supabase
        .from("cycle_settings")
        .upsert({ ...input, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
