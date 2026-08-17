-- =============================================================================
-- EXPORT (chỉ SELECT) — lấy dữ liệu thu/chi để phân loại lại danh mục.
-- Dán vào Supabase SQL Editor, chạy, rồi copy kết quả gửi lại.
-- Không phụ thuộc migration nào, chạy được ngay.
-- =============================================================================

-- === QUERY 1: đếm sơ bộ, xem khối lượng cần xử lý ===========================
select
  kind,
  category,
  count(*)    as so_record,
  sum(amount) as tong_tien
from public.expenses
group by kind, category
order by kind, so_record desc;


-- === QUERY 2: dữ liệu cần phân loại lại =====================================
-- Mặc định lấy các record đang để 'Khác' (đây là phần cần xử lý).
-- Muốn xem toàn bộ để rà lại từ đầu: xoá dòng `where` đi.
-- Cột rút gọn cho dễ copy: i=id ngắn, k=kind, a=amount, d=ngày, n=ghi chú.
select
  left(id::text, 8)                  as i,
  case when kind = 'income' then 'T' else 'C' end as k,
  amount::bigint                     as a,
  spent_date                         as d,
  coalesce(nullif(trim(note), ''), '—') as n
from public.expenses
where category = 'Khác'
order by spent_date desc;


-- === QUERY 3: bản JSON một cục — copy nhanh hơn nếu nhiều dòng ==============
select jsonb_pretty(jsonb_agg(x order by x->>'d' desc))
from (
  select jsonb_build_object(
    'i', left(id::text, 8),
    'k', case when kind = 'income' then 'T' else 'C' end,
    'a', amount::bigint,
    'd', spent_date,
    'n', coalesce(nullif(trim(note), ''), '')
  ) as x
  from public.expenses
  where category = 'Khác'
) t;
