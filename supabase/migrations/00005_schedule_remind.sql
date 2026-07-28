-- =============================================================================
-- PHASE 7 — Thời khóa biểu (thời lượng) + nhắc việc qua push theo giờ.
-- IDEMPOTENT.
-- =============================================================================

-- Thời lượng (phút) cho block timeline; nhắc trước bao nhiêu phút; mốc đã nhắc.
alter table public.tasks add column if not exists duration_min     int;
alter table public.tasks add column if not exists remind_before_min int;   -- null = không nhắc
alter table public.tasks add column if not exists reminded_at       timestamptz;

-- Index phục vụ cron quét task cần nhắc
create index if not exists idx_tasks_remind
  on public.tasks (is_completed, reminded_at, due_date)
  where remind_before_min is not null;
