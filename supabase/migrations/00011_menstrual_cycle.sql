-- =============================================================================
-- Theo dõi chu kỳ kinh nguyệt (ba-spec: docs/app-map/01-ba-spec-menstrual-cycle.md)
--   cycle_settings      : cấu hình theo từng người (người theo dõi + người đồng hành)
--   period_logs         : các kỳ đã ghi — 2 người cùng ĐỌC, chỉ chủ dữ liệu GHI (R1)
--   cycle_reminder_log  : nhật ký nhắc đã gửi, chống trùng (R5) — chỉ service role
--   cycle_status()      : NGUỒN TÍNH DUY NHẤT (S2) cho dự đoán/thống kê/trạng thái (R7)
--   cycle_log_start()   : ghi bắt đầu kỳ, tự đóng kỳ quên kết thúc > 10 ngày (AC-28)
-- IDEMPOTENT.
-- =============================================================================

-- "Hôm nay" luôn tính theo giờ VN (R6).
create or replace function public.today_vn()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date;
$$;

-- ---------------------------------------------------------------------------
-- 1. cycle_settings
-- ---------------------------------------------------------------------------
create table if not exists public.cycle_settings (
  user_id        uuid        primary key default auth.uid() references public.profiles(id) on delete cascade,
  is_tracking    boolean     not null default false,
  cycle_length   int         not null default 28 check (cycle_length between 21 and 45),
  period_length  int         not null default 5  check (period_length between 2 and 10),
  lead_days      int         not null default 2  check (lead_days between 1 and 7),
  notify_enabled boolean     not null default true,
  updated_at     timestamptz not null default now()
);

alter table public.cycle_settings enable row level security;
drop policy if exists "cycle_settings_select_auth" on public.cycle_settings;
drop policy if exists "cycle_settings_insert_own"  on public.cycle_settings;
drop policy if exists "cycle_settings_update_own"  on public.cycle_settings;
create policy "cycle_settings_select_auth" on public.cycle_settings
  for select to authenticated using (true);
create policy "cycle_settings_insert_own" on public.cycle_settings
  for insert to authenticated with check (auth.uid() = user_id);
create policy "cycle_settings_update_own" on public.cycle_settings
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 2. period_logs
-- ---------------------------------------------------------------------------
create table if not exists public.period_logs (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null default auth.uid() references public.profiles(id) on delete cascade,
  start_date   date        not null,
  end_date     date,
  is_estimated boolean     not null default false,   -- end tự suy ra (kỳ quên ghi kết thúc)
  created_at   timestamptz not null default now(),
  constraint period_logs_range check (
    end_date is null or (end_date >= start_date and end_date - start_date + 1 <= 15)
  )
);
create index if not exists idx_period_logs_user on public.period_logs (user_id, start_date desc);

alter table public.period_logs enable row level security;
drop policy if exists "period_logs_select_auth" on public.period_logs;
drop policy if exists "period_logs_insert_own"  on public.period_logs;
drop policy if exists "period_logs_update_own"  on public.period_logs;
drop policy if exists "period_logs_delete_own"  on public.period_logs;
create policy "period_logs_select_auth" on public.period_logs
  for select to authenticated using (true);
create policy "period_logs_insert_own" on public.period_logs
  for insert to authenticated with check (auth.uid() = user_id);
create policy "period_logs_update_own" on public.period_logs
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "period_logs_delete_own" on public.period_logs
  for delete to authenticated using (auth.uid() = user_id);

-- End hiệu lực (R11): end thật; kỳ mở ≤ 10 ngày -> hôm nay; > 10 ngày -> start + số ngày thường − 1.
create or replace function public.period_effective_end(
  p_start date, p_end date, p_period_len int, p_on date
) returns date language sql immutable as $$
  select case
    when p_end is not null then p_end
    when p_on - p_start + 1 > 10 then p_start + p_period_len - 1
    else p_on
  end;
$$;

-- Ràng buộc nghiệp vụ (R2, R3) — mã lỗi để client dịch sang tiếng Việt.
create or replace function public.trg_period_logs_validate()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_today  date := public.today_vn();
  v_plen   int;
  v_eff    date;
begin
  if NEW.start_date > v_today or (NEW.end_date is not null and NEW.end_date > v_today) then
    raise exception 'CYCLE_FUTURE';
  end if;

  select coalesce((select period_length from cycle_settings where user_id = NEW.user_id), 5)
    into v_plen;
  v_eff := public.period_effective_end(NEW.start_date, NEW.end_date, v_plen, v_today);

  -- Kỳ đang mở còn mới (≤ 10 ngày) -> phải ghi kết thúc trước
  if NEW.end_date is null and exists (
    select 1 from period_logs p
    where p.user_id = NEW.user_id and p.id <> NEW.id and p.end_date is null
      and v_today - p.start_date + 1 <= 10
  ) then
    raise exception 'CYCLE_OPEN';
  end if;

  -- Không chồng lấn (tính theo end hiệu lực)
  if exists (
    select 1 from period_logs p
    where p.user_id = NEW.user_id and p.id <> NEW.id
      and p.start_date <= v_eff
      and NEW.start_date <= public.period_effective_end(p.start_date, p.end_date, v_plen, v_today)
  ) then
    raise exception 'CYCLE_OVERLAP';
  end if;

  return NEW;
end; $$;

drop trigger if exists on_period_logs_validate on public.period_logs;
create trigger on_period_logs_validate before insert or update on public.period_logs
  for each row execute function public.trg_period_logs_validate();

-- ---------------------------------------------------------------------------
-- 3. cycle_reminder_log — chỉ Edge Function (service role) đọc/ghi
-- ---------------------------------------------------------------------------
create table if not exists public.cycle_reminder_log (
  period_id    uuid        not null references public.period_logs(id) on delete cascade,
  kind         text        not null check (kind in ('period_upcoming', 'period_due', 'period_late')),
  recipient_id uuid        not null references public.profiles(id) on delete cascade,
  sent_at      timestamptz not null default now(),
  primary key (period_id, kind, recipient_id)
);
alter table public.cycle_reminder_log enable row level security;
-- (không policy nào -> client không đọc/ghi được)

-- ---------------------------------------------------------------------------
-- 4. cycle_log_start — ghi bắt đầu kỳ; tự đóng kỳ quên kết thúc (NV2, AC-28)
-- ---------------------------------------------------------------------------
create or replace function public.cycle_log_start(p_start date)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_today  date := public.today_vn();
  v_plen   int;
  v_closed date;
  v_id     uuid;
begin
  if v_uid is null then raise exception 'not authenticated'; end if;
  select coalesce((select period_length from cycle_settings where user_id = v_uid), 5) into v_plen;

  -- Kỳ mở > 10 ngày, kết thúc ước tính trước ngày bắt đầu mới -> đóng lại
  with closed as (
    update period_logs p
       set end_date = p.start_date + v_plen - 1, is_estimated = true
     where p.user_id = v_uid and p.end_date is null
       and v_today - p.start_date + 1 > 10
       and p.start_date + v_plen - 1 < p_start
    returning p.end_date
  )
  select max(end_date) into v_closed from closed;

  insert into period_logs (user_id, start_date) values (v_uid, p_start) returning id into v_id;
  return jsonb_build_object('id', v_id, 'auto_closed_end', v_closed);
end; $$;

-- ---------------------------------------------------------------------------
-- 5. cycle_status — NGUỒN TÍNH DUY NHẤT (S2). Client gọi qua rpc, cron gọi bằng service role.
-- ---------------------------------------------------------------------------
create or replace function public.cycle_status(p_user uuid, p_on date default null)
returns jsonb language plpgsql stable security invoker set search_path = public as $$
declare
  v_on        date := coalesce(p_on, public.today_vn());
  s           cycle_settings%rowtype;
  v_has_set   boolean;
  v_starts    date[];
  v_raw       int[] := '{}';
  v_valid     int[] := '{}';
  v_used      int[] := '{}';
  v_median    numeric;
  v_avg_cycle int;
  v_avg_per   int;
  v_irregular boolean := false;
  v_last      period_logs%rowtype;
  v_last_eff  date;
  v_next      date;
  v_status    text;
  v_periods   jsonb;
  i           int;
begin
  select * into s from cycle_settings where user_id = p_user;
  v_has_set := found;
  if not v_has_set then
    s.is_tracking := false; s.cycle_length := 28; s.period_length := 5;
    s.lead_days := 2; s.notify_enabled := true;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', p.id,
           'start_date', p.start_date,
           'end_date', p.end_date,
           'effective_end', public.period_effective_end(p.start_date, p.end_date, s.period_length, v_on),
           'is_estimated', p.is_estimated or (p.end_date is null and v_on - p.start_date + 1 > 10),
           'is_open', p.end_date is null
         ) order by p.start_date desc), '[]'::jsonb)
    into v_periods
    from period_logs p where p.user_id = p_user;

  select array_agg(start_date order by start_date) into v_starts
    from period_logs where user_id = p_user;

  -- Chu kỳ thô (start i -> start i+1), lọc 15–60 (R4)
  if coalesce(array_length(v_starts, 1), 0) >= 2 then
    for i in 2..array_length(v_starts, 1) loop
      v_raw := v_raw || (v_starts[i] - v_starts[i - 1]);
      if (v_starts[i] - v_starts[i - 1]) between 15 and 60 then
        v_valid := v_valid || (v_starts[i] - v_starts[i - 1]);
      end if;
    end loop;
  end if;

  -- ≥ 3 chu kỳ: loại > 1,6 × trung vị (bỏ sót 1 kỳ)
  if coalesce(array_length(v_valid, 1), 0) >= 3 then
    select percentile_cont(0.5) within group (order by c) into v_median from unnest(v_valid) c;
    select coalesce(array_agg(c order by ord), '{}') into v_valid
      from unnest(v_valid) with ordinality t(c, ord) where c <= 1.6 * v_median;
  end if;

  -- Tối đa 6 chu kỳ gần nhất
  select coalesce(array_agg(c order by ord), '{}') into v_used from (
    select c, ord from unnest(v_valid) with ordinality t(c, ord) order by ord desc limit 6
  ) x;

  if coalesce(array_length(v_used, 1), 0) > 0 then
    select round(avg(c))::int into v_avg_cycle from unnest(v_used) c;   -- half-up
    if array_length(v_used, 1) >= 3 then
      select (max(c) - min(c)) > 7 into v_irregular from unnest(v_used) c;
    end if;
  else
    v_avg_cycle := s.cycle_length;
  end if;

  -- Số ngày hành kinh TB: ≤ 6 kỳ đã ghi kết thúc thật gần nhất; không có -> giá trị thường
  select round(avg(len))::int into v_avg_per from (
    select end_date - start_date + 1 as len from period_logs
     where user_id = p_user and end_date is not null and not is_estimated
     order by start_date desc limit 6
  ) x;
  v_avg_per := coalesce(v_avg_per, s.period_length);

  select * into v_last from period_logs where user_id = p_user order by start_date desc limit 1;

  if not found then
    v_status := 'no_data';
  else
    v_last_eff := public.period_effective_end(v_last.start_date, v_last.end_date, s.period_length, v_on);
    v_next := v_last.start_date + v_avg_cycle;
    if v_on between v_last.start_date and v_last_eff
       and (v_last.end_date is not null or v_on - v_last.start_date + 1 <= 10) then
      v_status := 'in_period';
    elsif v_next > v_on then v_status := 'upcoming';
    elsif v_next = v_on then v_status := 'due_today';
    else v_status := 'overdue';
    end if;
  end if;

  return jsonb_build_object(
    'user_id',         p_user,
    'has_settings',    v_has_set,
    'is_tracking',     s.is_tracking,
    'status',          case when not s.is_tracking then 'not_tracking' else v_status end,
    'data_status',     v_status,
    'today',           v_on,
    'settings',        jsonb_build_object(
                         'cycle_length', s.cycle_length, 'period_length', s.period_length,
                         'lead_days', s.lead_days, 'notify_enabled', s.notify_enabled),
    'last_period_id',  v_last.id,
    'last_start',      v_last.start_date,
    'cycle_day',       case when v_last.id is null then null else v_on - v_last.start_date + 1 end,
    'period_day',      case when v_status = 'in_period' then v_on - v_last.start_date + 1 end,
    'next_start',      v_next,
    'predicted_end',   case when v_next is null then null else v_next + v_avg_per - 1 end,
    'days_until',      case when v_next is null then null else greatest(v_next - v_on, 0) end,
    'days_overdue',    case when v_status = 'overdue' then v_on - v_next end,
    'avg_cycle',       v_avg_cycle,
    'avg_period',      v_avg_per,
    'cycles_used',     coalesce(array_length(v_used, 1), 0),
    'cycles_excluded', coalesce(array_length(v_raw, 1), 0) - coalesce(array_length(v_valid, 1), 0),
    'irregular',       v_irregular,
    'periods',         v_periods
  );
end; $$;

grant execute on function public.cycle_status(uuid, date) to authenticated;
grant execute on function public.cycle_log_start(date)     to authenticated;

-- Realtime: người đồng hành thấy ngay khi người theo dõi ghi kỳ
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='period_logs') then
    alter publication supabase_realtime add table public.period_logs;
  end if;
  if not exists (select 1 from pg_publication_tables
                 where pubname='supabase_realtime' and schemaname='public' and tablename='cycle_settings') then
    alter publication supabase_realtime add table public.cycle_settings;
  end if;
end $$;
