// Types khớp Database Schema (Phần 2 APP_SPEC). Phase 1 dùng cho Mock Data.

export type Priority = "high" | "medium" | "low";
export type RecurrenceRule = "daily" | "weekly" | "monthly";
export type EventType = "anniversary" | "countdown";
export type InteractionType = "comment" | "reaction";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  birthday?: string | null; // date
}

export interface Task {
  id: string;
  title: string;
  priority: Priority;
  tags: string[];
  recurrence_rule: RecurrenceRule | null;
  assigned_to: string; // profile id
  due_date: string; // ISO
  is_completed: boolean;
  completed_at?: string | null; // ISO — ngày done
  comment_count?: number;
  duration_min?: number | null;
  remind_before_min?: number | null;
  reminded_at?: string | null;
}

export type NotificationType =
  | "task_created"
  | "task_comment"
  | "note_created"
  | "note_comment"
  | "reaction"
  | "event_post"
  | "reminder"
  | "period_upcoming"
  | "period_due"
  | "period_late";

export interface AppNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string;
  url: string;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface Album {
  id: string;
  name: string;
  cover_image: string | null;
}

export interface Note {
  id: string;
  content: string;
  album_id: string | null;
  author_id: string;
  images: string[];
  created_at: string;
}

export interface NoteInteraction {
  id: string;
  note_id: string;
  author_id: string;
  type: InteractionType;
  value: string;
  created_at: string;
}

export interface CoupleEvent {
  id: string;
  title: string;
  event_date: string; // date
  type: EventType;
  category?: string | null;
}

export interface EventPost {
  id: string;
  event_id: string;
  author_id: string;
  content: string;
  images: string[];
  created_at: string;
}

export type ExpenseKind = "expense" | "income";

export interface Expense {
  id: string;
  amount: number;
  category: string;
  note: string | null;
  paid_by: string | null;
  spent_date: string; // date
  kind: ExpenseKind;
  created_at: string;
}

// ---- Chu kỳ kinh nguyệt (ba-spec 01) ----
export type CycleStatusKind =
  | "not_tracking"
  | "no_data"
  | "in_period"
  | "upcoming"
  | "due_today"
  | "overdue";

export interface CycleSettings {
  user_id: string;
  is_tracking: boolean;
  cycle_length: number;
  period_length: number;
  lead_days: number;
  notify_enabled: boolean;
}

export interface PeriodRecord {
  id: string;
  start_date: string; // yyyy-MM-dd
  end_date: string | null;
  effective_end: string;
  is_estimated: boolean;
  is_open: boolean;
}

/** Kết quả hàm SQL cycle_status() — nguồn tính duy nhất cho dự đoán/thống kê. */
export interface CycleStatus {
  user_id: string;
  has_settings: boolean;
  is_tracking: boolean;
  status: CycleStatusKind;
  data_status: Exclude<CycleStatusKind, "not_tracking">;
  today: string;
  settings: Pick<CycleSettings, "cycle_length" | "period_length" | "lead_days" | "notify_enabled">;
  last_period_id: string | null;
  last_start: string | null;
  cycle_day: number | null;
  period_day: number | null;
  next_start: string | null;
  predicted_end: string | null;
  days_until: number | null;
  days_overdue: number | null;
  avg_cycle: number;
  avg_period: number;
  cycles_used: number;
  cycles_excluded: number;
  irregular: boolean;
  periods: PeriodRecord[];
}
