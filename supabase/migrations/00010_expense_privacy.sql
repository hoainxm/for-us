-- =============================================================================
-- Chi tiêu RIÊNG TƯ: mỗi người chỉ thấy khoản thu/chi & báo cáo CỦA CHÍNH MÌNH.
-- Chủ sở hữu bản ghi = paid_by (người đứng tên khoản đó).
-- IDEMPOTENT: chạy lại nhiều lần không lỗi.
-- =============================================================================

-- Bản ghi mới mặc định thuộc về user đang đăng nhập (khớp với RLS insert bên dưới).
alter table public.expenses alter column paid_by set default auth.uid();

-- Bỏ RLS dùng chung cũ (ai đăng nhập cũng thấy hết).
drop policy if exists "expenses_select_auth" on public.expenses;
drop policy if exists "expenses_insert_auth" on public.expenses;
drop policy if exists "expenses_update_auth" on public.expenses;
drop policy if exists "expenses_delete_auth" on public.expenses;

-- Bỏ chính sách _own (nếu migration này đã chạy trước đó) rồi tạo lại.
drop policy if exists "expenses_select_own" on public.expenses;
drop policy if exists "expenses_insert_own" on public.expenses;
drop policy if exists "expenses_update_own" on public.expenses;
drop policy if exists "expenses_delete_own" on public.expenses;

-- RLS theo chủ sở hữu: chỉ thao tác được trên khoản của chính mình.
create policy "expenses_select_own" on public.expenses
  for select to authenticated using (auth.uid() = paid_by);
create policy "expenses_insert_own" on public.expenses
  for insert to authenticated with check (auth.uid() = paid_by);
create policy "expenses_update_own" on public.expenses
  for update to authenticated using (auth.uid() = paid_by) with check (auth.uid() = paid_by);
create policy "expenses_delete_own" on public.expenses
  for delete to authenticated using (auth.uid() = paid_by);

-- Lưu ý dữ liệu cũ: các bản ghi trước đây đã có paid_by = 1 trong 2 người nên tự
-- động về đúng chủ. Bản ghi nào paid_by IS NULL (nếu có) sẽ không còn ai thấy —
-- gán chủ cho chúng thủ công nếu cần, ví dụ:
--   update public.expenses set paid_by = '<user-uuid>' where paid_by is null;
