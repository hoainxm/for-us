-- =============================================================================
-- AUDIT (chỉ SELECT, không sửa gì) — xem record thu/chi nào đang lệch danh mục.
-- Chạy 00007_category_classifier.sql trước, rồi dán file này vào SQL Editor.
-- Dùng để rà dữ liệu phát sinh sau này; đợt dọn dữ liệu cũ đã map tay ở
-- 00009_recategorize_khac.sql.
-- =============================================================================

-- 1) Tổng quan: mỗi loại lệch có bao nhiêu record
with flagged as (
  select
    e.*,
    public.suggest_category_v1(e.kind, e.category, e.note) as proposed,
    case
      when e.kind = 'income' and not (e.category = any (public.category_list_v1('income')))
        then 'THU dùng danh mục của CHI'
      when not (e.category = any (public.category_list_v1(e.kind)))
        then 'Danh mục không còn tồn tại'
      when e.category = 'Khác'
        then 'Đang để Khác'
      else 'OK'
    end as issue
  from public.expenses e
)
select
  issue,
  count(*)                                          as so_record,
  count(*) filter (where proposed <> category)      as se_doi,
  count(*) filter (where proposed = category)       as giu_nguyen,
  sum(amount)                                       as tong_tien
from flagged
where issue <> 'OK'
group by issue
order by so_record desc;

-- 2) Chi tiết từng record sẽ bị đổi — soi trước khi apply
with flagged as (
  select
    e.id, e.kind, e.category, e.note, e.amount, e.spent_date,
    public.suggest_category_v1(e.kind, e.category, e.note) as proposed
  from public.expenses e
)
select
  spent_date,
  kind,
  amount,
  category  as danh_muc_cu,
  proposed  as danh_muc_moi,
  coalesce(note, '(không ghi chú)') as ghi_chu,
  id
from flagged
where proposed is distinct from category
order by spent_date desc, amount desc;

-- 3) Record lệch nhưng ghi chú không đủ tín hiệu -> sẽ rơi về 'Khác'.
--    Những dòng này nên tự sửa tay trong app cho đúng.
with flagged as (
  select
    e.id, e.kind, e.category, e.note, e.amount, e.spent_date,
    public.suggest_category_v1(e.kind, e.category, e.note) as proposed
  from public.expenses e
)
select spent_date, kind, amount, category as danh_muc_cu, note as ghi_chu, id
from flagged
where proposed = 'Khác'
  and (category = 'Khác' or not (category = any (public.category_list_v1(kind))))
order by amount desc;

-- 4) Phân bố danh mục hiện tại (kể cả tên lạ do bản cũ ghi vào)
select
  kind,
  category,
  count(*)     as so_record,
  sum(amount)  as tong_tien,
  category = any (public.category_list_v1(kind)) as con_hop_le
from public.expenses
group by kind, category
order by kind, so_record desc;
