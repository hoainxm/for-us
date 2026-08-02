import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addDays, addMonths, addWeeks, endOfDay, endOfWeek, isAfter, startOfDay, startOfWeek } from "date-fns";
import { supabase } from "@/lib/supabase";
import type { RecurrenceRule, Task } from "@/types";

const TASK_COLS =
  "id, title, priority, tags, recurrence_rule, assigned_to, due_date, is_completed, completed_at, duration_min, remind_before_min, reminded_at";
const TASK_COLS_WITH_COUNT = `${TASK_COLS}, task_comments(count)`;

const dayKey = (d: Date) => startOfDay(d).toISOString();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCount(row: any): Task {
  const comment_count = Array.isArray(row.task_comments)
    ? row.task_comments[0]?.count ?? 0
    : 0;
  const { task_comments, ...rest } = row;
  void task_comments;
  return { ...rest, comment_count } as Task;
}

// Xem theo NGÀY:
//  - todo: chưa xong AND due_date <= cuối ngày đang xem (rollover: việc cũ chưa xong vẫn hiện)
//  - done: đã xong AND completed_at rơi vào chính ngày đang xem
export function useDayTasks(day: Date) {
  return useQuery({
    queryKey: ["tasks", "day", dayKey(day)],
    queryFn: async (): Promise<{ todo: Task[]; done: Task[] }> => {
      const end = endOfDay(day).toISOString();
      const start = startOfDay(day).toISOString();

      const [todoRes, doneRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(TASK_COLS_WITH_COUNT)
          .eq("is_completed", false)
          .lte("due_date", end)
          .order("due_date", { ascending: true }),
        supabase
          .from("tasks")
          .select(TASK_COLS_WITH_COUNT)
          .eq("is_completed", true)
          .gte("completed_at", start)
          .lte("completed_at", end)
          .order("completed_at", { ascending: false }),
      ]);
      if (todoRes.error) throw todoRes.error;
      if (doneRes.error) throw doneRes.error;
      return {
        todo: (todoRes.data ?? []).map(mapCount),
        done: (doneRes.data ?? []).map(mapCount),
      };
    },
  });
}

// Xem theo TUẦN (thời khóa biểu, tuần bắt đầu Thứ 2):
//  - week: mọi task (done + chưa) có due_date rơi trong tuần đang xem
//  - carryover: chưa xong AND due_date < đầu tuần (trôi từ tuần trước)
// Chỉ đọc, không đụng data cũ.
export function useWeekTasks(weekStart: Date) {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  const end = endOfWeek(weekStart, { weekStartsOn: 1 });
  return useQuery({
    queryKey: ["tasks", "week", start.toISOString()],
    queryFn: async (): Promise<{ week: Task[]; carryover: Task[] }> => {
      const startISO = startOfDay(start).toISOString();
      const endISO = endOfDay(end).toISOString();

      const [weekRes, carryRes] = await Promise.all([
        supabase
          .from("tasks")
          .select(TASK_COLS_WITH_COUNT)
          .gte("due_date", startISO)
          .lte("due_date", endISO)
          .order("due_date", { ascending: true }),
        supabase
          .from("tasks")
          .select(TASK_COLS_WITH_COUNT)
          .eq("is_completed", false)
          .lt("due_date", startISO)
          .order("due_date", { ascending: true }),
      ]);
      if (weekRes.error) throw weekRes.error;
      if (carryRes.error) throw carryRes.error;
      return {
        week: (weekRes.data ?? []).map(mapCount),
        carryover: (carryRes.data ?? []).map(mapCount),
      };
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

// Done: lưu completed_at = bây giờ (LUẬT 6 recurring vẫn tự đẻ).
export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: Task) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: true, completed_at: new Date().toISOString() })
        .eq("id", task.id);
      if (error) throw error;

      let spawned = false;
      if (task.recurrence_rule) {
        const next = nextDueDate(new Date(task.due_date), task.recurrence_rule);
        const { error: insErr } = await supabase.from("tasks").insert({
          title: task.title,
          tags: task.tags,
          recurrence_rule: task.recurrence_rule,
          assigned_to: task.assigned_to,
          due_date: next.toISOString(),
          duration_min: task.duration_min ?? null,
          remind_before_min: task.remind_before_min ?? null,
          reminded_at: null,
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

export function useUncompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tasks")
        .update({ is_completed: false, completed_at: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export interface NewTaskInput {
  title: string;
  tags: string[];
  recurrence_rule: RecurrenceRule | null;
  assigned_to: string;
  due_date: string;
  duration_min: number | null;
  remind_before_min: number | null;
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
