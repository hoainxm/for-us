-- =============================================================================
-- PHASE 7 — Trung tâm thông báo trong app. Trigger tự sinh khi có hành động.
-- IDEMPOTENT.
-- =============================================================================

create table if not exists public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade, -- người nhận
  actor_id   uuid        references public.profiles(id) on delete set null,          -- người gây ra
  type       text        not null,   -- task_created | task_comment | note_created | note_comment | reaction | event_post | reminder
  title      text        not null,
  body       text        not null default '',
  url        text        not null default '/',
  entity_id  uuid,
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on public.notifications (user_id, created_at desc);

alter table public.notifications enable row level security;
drop policy if exists "notif_select_own" on public.notifications;
drop policy if exists "notif_update_own" on public.notifications;
drop policy if exists "notif_delete_own" on public.notifications;
create policy "notif_select_own" on public.notifications for select to authenticated using (auth.uid() = user_id);
create policy "notif_update_own" on public.notifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "notif_delete_own" on public.notifications for delete to authenticated using (auth.uid() = user_id);

-- "Người còn lại" trong app 2 người
create or replace function public.other_profile(p_self uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.profiles where id <> p_self order by created_at limit 1;
$$;

-- ---- Trigger functions (security definer -> bỏ qua RLS khi insert) ----
create or replace function public.trg_notif_task()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.assigned_to is not null then
    insert into public.notifications(user_id, actor_id, type, title, body, url, entity_id)
    values (NEW.assigned_to, NEW.assigned_to, 'task_created', 'Việc mới 📋', NEW.title, '/tasks/'||NEW.id, NEW.id);
  end if;
  return NEW;
end; $$;

create or replace function public.trg_notif_task_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  r := public.other_profile(NEW.author_id);
  if r is not null then
    insert into public.notifications(user_id, actor_id, type, title, body, url, entity_id)
    values (r, NEW.author_id, 'task_comment', 'Bình luận việc 💬', NEW.content, '/tasks/'||NEW.task_id, NEW.task_id);
  end if;
  return NEW;
end; $$;

create or replace function public.trg_notif_note()
returns trigger language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  r := public.other_profile(NEW.author_id);
  if r is not null then
    insert into public.notifications(user_id, actor_id, type, title, body, url, entity_id)
    values (r, NEW.author_id, 'note_created', 'Nhật ký mới 💕',
            coalesce(nullif(NEW.content,''),'Đã đăng ảnh mới'), '/notes/'||NEW.id, NEW.id);
  end if;
  return NEW;
end; $$;

create or replace function public.trg_notif_note_interaction()
returns trigger language plpgsql security definer set search_path = public as $$
declare owner uuid;
begin
  select author_id into owner from public.notes where id = NEW.note_id;
  if owner is not null and owner <> NEW.author_id then
    if NEW.type = 'comment' then
      insert into public.notifications(user_id, actor_id, type, title, body, url, entity_id)
      values (owner, NEW.author_id, 'note_comment', 'Bình luận nhật ký 💬', NEW.value, '/notes/'||NEW.note_id, NEW.note_id);
    else
      insert into public.notifications(user_id, actor_id, type, title, body, url, entity_id)
      values (owner, NEW.author_id, 'reaction', 'Thả cảm xúc 💗', NEW.value||' vào nhật ký của bạn', '/notes/'||NEW.note_id, NEW.note_id);
    end if;
  end if;
  return NEW;
end; $$;

create or replace function public.trg_notif_event_post()
returns trigger language plpgsql security definer set search_path = public as $$
declare r uuid;
begin
  r := public.other_profile(NEW.author_id);
  if r is not null then
    insert into public.notifications(user_id, actor_id, type, title, body, url, entity_id)
    values (r, NEW.author_id, 'event_post', 'Bài sự kiện mới 🎉',
            coalesce(nullif(NEW.content,''),'Đã đăng ảnh'), '/events/'||NEW.event_id, NEW.event_id);
  end if;
  return NEW;
end; $$;

-- ---- Gắn trigger ----
drop trigger if exists on_task_created on public.tasks;
create trigger on_task_created after insert on public.tasks
  for each row execute function public.trg_notif_task();

drop trigger if exists on_task_comment on public.task_comments;
create trigger on_task_comment after insert on public.task_comments
  for each row execute function public.trg_notif_task_comment();

drop trigger if exists on_note_created on public.notes;
create trigger on_note_created after insert on public.notes
  for each row execute function public.trg_notif_note();

drop trigger if exists on_note_interaction on public.note_interactions;
create trigger on_note_interaction after insert on public.note_interactions
  for each row execute function public.trg_notif_note_interaction();

drop trigger if exists on_event_post on public.event_posts;
create trigger on_event_post after insert on public.event_posts
  for each row execute function public.trg_notif_event_post();

-- Realtime cho badge/feed
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
