-- =============================================================================
-- WEB PUSH — bảng lưu Push Subscription của từng user.
-- =============================================================================
create table if not exists public.push_subscriptions (
  endpoint   text        primary key,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  p256dh     text        not null,
  auth       text        not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_push_sub_user on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- User tự quản subscription của mình. Edge Function dùng service_role -> bỏ qua RLS
-- để đọc subscription của người NHẬN.
create policy "push_sub_select_own"
  on public.push_subscriptions for select
  to authenticated using (auth.uid() = user_id);

create policy "push_sub_insert_own"
  on public.push_subscriptions for insert
  to authenticated with check (auth.uid() = user_id);

create policy "push_sub_update_own"
  on public.push_subscriptions for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "push_sub_delete_own"
  on public.push_subscriptions for delete
  to authenticated using (auth.uid() = user_id);
