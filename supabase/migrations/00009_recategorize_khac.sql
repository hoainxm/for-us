-- =============================================================================
-- Phân loại lại 16 record đang để 'Khác' — map tay theo ghi chú thật,
-- không dùng regex đoán. Mỗi dòng đã được đọc và xác nhận với chủ dữ liệu.
--
-- An toàn:
--   - Chỉ động vào record còn đang là 'Khác' (đã tự sửa tay thì bỏ qua)
--   - Khớp theo 8 ký tự đầu của id, dừng lại nếu một prefix khớp >1 record
--   - Ghi bản gốc vào expense_category_backup, có rollback ở cuối file
--   - IDEMPOTENT: chạy lại không đổi thêm gì
--
-- Cần chạy 00007_category_classifier.sql trước.
-- =============================================================================

create table if not exists public.expense_category_backup (
  expense_id   uuid        not null references public.expenses(id) on delete cascade,
  old_category text        not null,
  new_category text        not null,
  kind         text        not null,
  migrated_at  timestamptz not null default now(),
  primary key (expense_id, migrated_at)
);

alter table public.expense_category_backup enable row level security;
drop policy if exists "expense_category_backup_select_auth" on public.expense_category_backup;
create policy "expense_category_backup_select_auth"
  on public.expense_category_backup for select to authenticated using (true);

create temp table _remap (id_prefix text primary key, new_category text not null);

insert into _remap (id_prefix, new_category) values
  -- Thu nhập
  ('48347604', 'Lương'),              -- "lương" · 5.766.000
  ('7ea52db5', 'Thưởng'),             -- "thưởng" · 3.000.000
  -- Nợ / trả góp
  ('c8616815', 'Trả nợ'),             -- "trả nợ" · 2.000.000
  ('666074cf', 'Trả nợ'),             -- "momo" · 1.940.000 — trả góp qua ví
  -- Chuyến đi khu sinh thái Ông Đề + homestay
  ('8303386f', 'Du lịch'),            -- "ông đề" · 400.000
  ('c4e2a3d4', 'Du lịch'),            -- "cọc home" · 360.000
  ('f6612806', 'Du lịch'),            -- "home" · 170.000
  ('4918292e', 'Du lịch'),            -- "bù cọc home" · 50.000
  -- Giấy tờ hành chính
  ('1dc1608f', 'Giấy tờ / Thủ tục'),  -- "công chứng photo" · 86.000
  ('3a71533c', 'Giấy tờ / Thủ tục'),  -- "in ảnh thẻ" · 55.000
  ('7ccde31f', 'Giấy tờ / Thủ tục'),  -- "công chứng bằng tốt nghiệp" · 25.000
  ('1577aebf', 'Giấy tờ / Thủ tục'),  -- "hồ sơ + keo" · 22.000
  -- Còn lại
  ('aeb08fb2', 'Quà tặng'),           -- "tặng vợ" · 1.000.000
  ('5ac7c486', 'Học tập'),            -- "mua sách" · 50.000
  ('0014d269', 'Giải trí'),           -- "kara" · 40.000
  ('f4e3efe1', 'Thể thao');           -- "đá bóng" · 38.000

-- Chặn trường hợp 8 ký tự đầu khớp nhiều record (rất hiếm, nhưng phải chắc).
do $$
begin
  if exists (
    select 1
    from _remap r
    join public.expenses e on e.id::text like r.id_prefix || '%'
    group by r.id_prefix
    having count(*) > 1
  ) then
    raise exception 'Có id_prefix khớp nhiều hơn 1 record — dừng lại, cần dùng id đầy đủ';
  end if;
end $$;

with target as (
  select e.id, e.category as old_category, r.new_category, e.kind
  from public.expenses e
  join _remap r on e.id::text like r.id_prefix || '%'
  where e.category = 'Khác'
    and e.category is distinct from r.new_category
),
-- CTE ghi dữ liệu luôn chạy đủ, kể cả khi query chính không đọc kết quả.
logged as (
  insert into public.expense_category_backup (expense_id, old_category, new_category, kind)
  select id, old_category, new_category, kind from target
  returning expense_id
)
update public.expenses e
   set category = t.new_category
  from target t
 where e.id = t.id;

drop table _remap;

-- =============================================================================
-- KIỂM TRA SAU KHI CHẠY:
--
--   select kind, category, count(*), sum(amount)
--     from public.expenses group by kind, category order by 3 desc;
--
--   select * from public.expense_category_backup order by migrated_at desc;
--
-- ROLLBACK:
--
--   update public.expenses e
--      set category = b.old_category
--     from public.expense_category_backup b
--    where e.id = b.expense_id
--      and b.migrated_at = (select max(migrated_at) from public.expense_category_backup);
-- =============================================================================
