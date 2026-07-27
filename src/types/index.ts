// Types khớp Database Schema (Phần 2 APP_SPEC). Phase 1 dùng cho Mock Data.

export type Priority = "high" | "medium" | "low";
export type RecurrenceRule = "daily" | "weekly" | "monthly";
export type EventType = "anniversary" | "countdown";
export type InteractionType = "comment" | "reaction";

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
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
}
