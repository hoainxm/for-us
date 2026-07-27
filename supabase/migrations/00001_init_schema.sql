-- =============================================================================
-- COUPLE APP - INITIAL SCHEMA MIGRATION
-- File: 00001_init_schema.sql
-- Mô tả: Tạo 7 bảng, 2 Storage buckets, Foreign Keys, và RLS cơ bản.
-- Mô hình bảo mật: App dành cho 2 người dùng chung dữ liệu.
--   -> Mọi user đã đăng nhập (authenticated) đều xem/sửa được dữ liệu chung.
--   -> Chỉ tác giả (author_id) mới được sửa/xóa nội dung do mình tạo (notes/comments/interactions).
-- =============================================================================

-- Bật extension sinh UUID
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. BẢNG profiles  (liên kết auth.users)
-- =============================================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text        not null default '',
  avatar_url   text,
  created_at   timestamptz not null default now()
);

-- Tự tạo profile khi có user mới đăng ký
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. BẢNG tasks
-- =============================================================================
create table if not exists public.tasks (
  id              uuid        primary key default gen_random_uuid(),
  title           text        not null,
  priority        text        not null default 'medium'
                              check (priority in ('high', 'medium', 'low')),
  tags            text[]      not null default '{}',
  recurrence_rule text        check (recurrence_rule in ('daily', 'weekly', 'monthly')),
  assigned_to     uuid        references public.profiles(id) on delete set null,
  due_date        timestamptz not null default now(),
  is_completed    boolean     not null default false,
  created_at      timestamptz not null default now()
);

-- Index phục vụ logic auto-rollover: is_completed = false AND due_date <= today
create index if not exists idx_tasks_rollover on public.tasks (is_completed, due_date);
create index if not exists idx_tasks_assigned on public.tasks (assigned_to);

-- =============================================================================
-- 3. BẢNG task_comments
-- =============================================================================
create table if not exists public.task_comments (
  id         uuid        primary key default gen_random_uuid(),
  task_id    uuid        not null references public.tasks(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  content    text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_task_comments_task on public.task_comments (task_id);

-- =============================================================================
-- 4. BẢNG albums
-- =============================================================================
create table if not exists public.albums (
  id          uuid        primary key default gen_random_uuid(),
  name        text        not null,
  cover_image text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- 5. BẢNG notes  (Shared Diary)
-- =============================================================================
create table if not exists public.notes (
  id         uuid        primary key default gen_random_uuid(),
  content    text        not null default '',
  album_id   uuid        references public.albums(id) on delete set null,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  images     text[]      not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_notes_album on public.notes (album_id);
create index if not exists idx_notes_created on public.notes (created_at desc);

-- =============================================================================
-- 6. BẢNG note_interactions
-- =============================================================================
create table if not exists public.note_interactions (
  id         uuid        primary key default gen_random_uuid(),
  note_id    uuid        not null references public.notes(id) on delete cascade,
  author_id  uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null check (type in ('comment', 'reaction')),
  value      text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_note_interactions_note on public.note_interactions (note_id);

-- =============================================================================
-- 7. BẢNG events  (Đếm ngày)
-- =============================================================================
create table if not exists public.events (
  id         uuid        primary key default gen_random_uuid(),
  title      text        not null,
  event_date date        not null,
  type       text        not null check (type in ('anniversary', 'countdown')),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- BẬT ROW LEVEL SECURITY CHO TẤT CẢ BẢNG
-- =============================================================================
alter table public.profiles          enable row level security;
alter table public.tasks             enable row level security;
alter table public.task_comments     enable row level security;
alter table public.albums            enable row level security;
alter table public.notes             enable row level security;
alter table public.note_interactions enable row level security;
alter table public.events            enable row level security;

-- =============================================================================
-- RLS POLICIES
-- Nguyên tắc: dữ liệu dùng chung cho 2 người -> authenticated đọc/ghi được.
-- Nội dung có tác giả -> chỉ author_id được update/delete.
-- =============================================================================

-- ---- profiles ----
create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ---- tasks (dùng chung: cả 2 quản lý việc chung) ----
create policy "tasks_select_authenticated"
  on public.tasks for select
  to authenticated using (true);

create policy "tasks_insert_authenticated"
  on public.tasks for insert
  to authenticated with check (true);

create policy "tasks_update_authenticated"
  on public.tasks for update
  to authenticated using (true) with check (true);

create policy "tasks_delete_authenticated"
  on public.tasks for delete
  to authenticated using (true);

-- ---- task_comments (author-owned) ----
create policy "task_comments_select_authenticated"
  on public.task_comments for select
  to authenticated using (true);

create policy "task_comments_insert_own"
  on public.task_comments for insert
  to authenticated with check (auth.uid() = author_id);

create policy "task_comments_update_own"
  on public.task_comments for update
  to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "task_comments_delete_own"
  on public.task_comments for delete
  to authenticated using (auth.uid() = author_id);

-- ---- albums (dùng chung) ----
create policy "albums_select_authenticated"
  on public.albums for select
  to authenticated using (true);

create policy "albums_insert_authenticated"
  on public.albums for insert
  to authenticated with check (true);

create policy "albums_update_authenticated"
  on public.albums for update
  to authenticated using (true) with check (true);

create policy "albums_delete_authenticated"
  on public.albums for delete
  to authenticated using (true);

-- ---- notes (author-owned ghi/sửa/xóa, cả 2 đọc) ----
create policy "notes_select_authenticated"
  on public.notes for select
  to authenticated using (true);

create policy "notes_insert_own"
  on public.notes for insert
  to authenticated with check (auth.uid() = author_id);

create policy "notes_update_own"
  on public.notes for update
  to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "notes_delete_own"
  on public.notes for delete
  to authenticated using (auth.uid() = author_id);

-- ---- note_interactions (author-owned) ----
create policy "note_interactions_select_authenticated"
  on public.note_interactions for select
  to authenticated using (true);

create policy "note_interactions_insert_own"
  on public.note_interactions for insert
  to authenticated with check (auth.uid() = author_id);

create policy "note_interactions_update_own"
  on public.note_interactions for update
  to authenticated using (auth.uid() = author_id) with check (auth.uid() = author_id);

create policy "note_interactions_delete_own"
  on public.note_interactions for delete
  to authenticated using (auth.uid() = author_id);

-- ---- events (dùng chung) ----
create policy "events_select_authenticated"
  on public.events for select
  to authenticated using (true);

create policy "events_insert_authenticated"
  on public.events for insert
  to authenticated with check (true);

create policy "events_update_authenticated"
  on public.events for update
  to authenticated using (true) with check (true);

create policy "events_delete_authenticated"
  on public.events for delete
  to authenticated using (true);

-- =============================================================================
-- REALTIME: thêm bảng tương tác cao vào publication
-- =============================================================================
alter publication supabase_realtime add table public.notes;
alter publication supabase_realtime add table public.note_interactions;
alter publication supabase_realtime add table public.task_comments;

-- =============================================================================
-- STORAGE BUCKETS (Public): avatars, diary_images
-- =============================================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('diary_images', 'diary_images', true)
on conflict (id) do nothing;

-- ---- Storage RLS: đọc public, ghi/xóa cần đăng nhập ----
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_auth_insert"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'avatars');

create policy "avatars_auth_update"
  on storage.objects for update
  to authenticated using (bucket_id = 'avatars');

create policy "avatars_auth_delete"
  on storage.objects for delete
  to authenticated using (bucket_id = 'avatars');

create policy "diary_images_public_read"
  on storage.objects for select
  using (bucket_id = 'diary_images');

create policy "diary_images_auth_insert"
  on storage.objects for insert
  to authenticated with check (bucket_id = 'diary_images');

create policy "diary_images_auth_update"
  on storage.objects for update
  to authenticated using (bucket_id = 'diary_images');

create policy "diary_images_auth_delete"
  on storage.objects for delete
  to authenticated using (bucket_id = 'diary_images');

-- =============================================================================
-- HẾT MIGRATION 00001
-- =============================================================================
