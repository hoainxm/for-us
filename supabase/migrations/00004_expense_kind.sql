-- =============================================================================
-- Chi tiêu: phân biệt CHI (expense) và THU (income) để kiểm soát số dư.
-- IDEMPOTENT.
-- =============================================================================
alter table public.expenses
  add column if not exists kind text not null default 'expense'
  check (kind in ('expense', 'income'));
