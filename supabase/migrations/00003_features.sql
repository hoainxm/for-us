-- =============================================================================
-- PHASE 6 — Chi tiêu, completed_at, danh mục sự kiện, post sự kiện, ngày sinh.
-- IDEMPOTENT: chạy lại nhiều lần không lỗi (guard drop-if-exists + check).
-- =============================================================================

-- 1) Task: lưu ngày hoàn thành
alter table public.tasks add column if not exists completed_at timestamptz;

-- 2) Sự kiện: thêm danh mục
alter table public.events add column if not exists category text;

-- 3) Profile: ngày sinh (auto tạo sự kiện sinh nhật)
alter table public.profiles add column if not exists birthday date;

-- 4) Bảng chi tiêu (dùng chung 2 người)
create table if not exists public.expenses (
  id         uuid        primary key default gen_random_uuid(),
  amount     numeric     not null check (amount >= 0),
  category   text        not null,
  note       text,
  paid_by    uuid        references public.profiles(id) on delete set null,
  spent_date date        not null default current_date,
  created_at timestamptz not null default now()
);
create index if not exists idx_expenses_date on public.expenses (spent_date desc);

alter table public.expenses enable row level security;
drop policy if exists "expenses_select_auth" on public.expenses;
drop policy if exists "expenses_insert_auth" on public.expenses;
drop policy if exists "expenses_update_auth" on public.expenses;
drop policy if exists "expenses_delete_auth" on public.expenses;
create policy "expenses_select_auth" on public.expenses for select to authenticated using (true);
create policy "expenses_insert_auth" on public.expenses for insert to authenticated with check (true);
create policy "expenses_update_auth" on public.expenses for update to authenticated using (true) with check (true);
create policy "expenses_delete_auth" on public.expenses for delete to authenticated using (true);

-- 5) Post gắn với sự kiện
create table if not exists public.event_posts (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.events(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null default '',
  images     text[]      not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists idx_event_posts_event on public.event_posts (event_id, created_at desc);

alter table public.event_posts enable row level security;
drop policy if exists "event_posts_select_auth" on public.event_posts;
drop policy if exists "event_posts_insert_own" on public.event_posts;
drop policy if exists "event_posts_update_own" on public.event_posts;
drop policy if exists "event_posts_delete_own" on public.event_posts;
create policy "event_posts_select_auth" on public.event_posts for select to authenticated using (true);
create policy "event_posts_insert_own" on public.event_posts for insert to authenticated with check (auth.uid() = author_id);
create policy "event_posts_update_own" on public.event_posts for update to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);
create policy "event_posts_delete_own" on public.event_posts for delete to authenticated using (auth.uid() = author_id);

-- Realtime cho post sự kiện (chỉ add nếu chưa có -> tránh lỗi "already member")
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'event_posts'
  ) then
    alter publication supabase_realtime add table public.event_posts;
  end if;
end $$;
