import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, endOfDay, isAfter, startOfDay } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { RecurrenceRule, Task } from "@/types";

const TASK_COLS = "id, title, priority, tags, recurrence_rule, assigned_to, due_date, is_completed";

// --- Auto-rollover (LUẬT 5): is_completed=false AND due_date <= cuối ngày hôm nay ---
export function useTodoTasks() {
  return useQuery({
    queryKey: ["tasks", "todo"],
    queryFn: async (): Promise<Task[]> => {
      const endToday = endOfDay(new Date()).toISOString();
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLS)
        .eq("is_completed", false)
        .lte("due_date", endToday)
        .order("due_date", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

// --- Việc đã hoàn thành gần đây (hiển thị section "Đã xong") ---
export function useDoneTasks() {
  return useQuery({
    queryKey: ["tasks", "done"],
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLS)
        .eq("is_completed", true)
        .order("due_date", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as Task[];
    },
  });
}

export function useTask(id: string | undefined) {
  return useQuery({
    queryKey: ["task", id],
    enabled: !!id,
    queryFn: async (): Promise<Task | null> => {
      const { data, error } = await supabase
        .from("tasks")
        .select(TASK_COLS)
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as Task | null;
    },
  });
}

// Tịnh tiến due_date cho task định kỳ, nhảy qua hôm nay để không trôi lại ngay.
function nextDueDate(base: Date, rule: RecurrenceRule): Date {
  const today = startOfDay(new Date());
  const step =
    rule === "daily"
      ? (d: Date) => addDays(d, 1)
      : rule === "weekly"
        ? (d: Date) => addWeeks(d, 1)
        : (d: Date) => addMonths(d, 1);
  let d = step(base);
  while (!isAfter(startOfDay(d), today)) d = step(d);
  return d;
}

// --- Done task + tự đẻ task mới nếu Recurring (LUẬT 6) ---
export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true })
        .eq("id", task.id);
      if (error) throw error;

      let spawned = false;
      if (task.recurrence_rule) {
        const next = nextDueDate(new Date(task.due_date), task.recurrence_rule);
        const { error: insErr } = await supabase.from("tasks").insert({
          title: task.title,
          priority: task.priority,
          tags: task.tags,
          recurrence_rule: task.recurrence_rule,
          assigned_to: task.assigned_to,
          due_date: next.toISOString(),
          is_completed: false,
        });
        if (insErr) throw insErr;
        spawned = true;
      }
      return { spawned };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

// Bỏ hoàn thành (không đẻ task mới).
export function useUncompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export interface NewTaskInput {
  title: string;
  priority: Task["priority"];
  tags: string[];
  recurrence_rule: RecurrenceRule | null;
  assigned_to: string;
  due_date: string;
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: NewTaskInput) => {
      const { error } = await supabase
        .from("tasks")
        .insert({ ...input, is_completed: false });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}
