-- =============================================================================
-- Bộ phân loại danh mục thu/chi (v1) — CHỈ tạo hàm, KHÔNG sửa dữ liệu.
-- Dùng cho: query audit (supabase/audit_expense_categories.sql) và migration
-- 00008 backfill. Tách riêng để xem trước rồi mới quyết định chạy 00008.
-- IDEMPOTENT.
-- =============================================================================

-- Danh sách danh mục hợp lệ — phải khớp src/lib/constants.ts
create or replace function public.category_list_v1(p_kind text)
returns text[]
language sql
immutable
as $$
  select case
    when p_kind = 'income' then array[
      'Lương','Thưởng','Phụ cấp',
      'Làm thêm','Kinh doanh','Bán đồ','Lãi / Đầu tư',
      'Được tặng','Hoàn tiền','Rút tiết kiệm','Vay / Mượn','Khác'
    ]
    else array[
      'Ăn uống','Đi chợ','Cà phê / Trà sữa','Nhậu / Tiệc',
      'Hóa đơn','Thuê nhà','Điện nước','Internet / Điện thoại','Đồ gia dụng','Sửa chữa',
      'Di chuyển','Xăng xe','Gửi xe',
      'Mua sắm','Quần áo','Sức khỏe','Làm đẹp','Học tập','Thể thao','Giải trí','Đăng ký / Thuê bao',
      'Hẹn hò','Quà tặng','Du lịch','Hiếu hỉ','Gia đình','Thú cưng',
      'Tiết kiệm','Đầu tư','Bảo hiểm','Trả nợ','Từ thiện','Giấy tờ / Thủ tục','Phí dịch vụ','Khác'
    ]
  end;
$$;

-- Đoán danh mục từ ghi chú. Trả NULL khi không đủ tín hiệu.
create or replace function public.guess_category_v1(p_kind text, p_note text)
returns text
language sql
immutable
as $$
  with n as (select lower(coalesce(p_note, '')) as t)
  select case
    when (select t from n) = '' then null

    when p_kind = 'income' then case
      when (select t from n) ~ 'lương|luong|salary' then 'Lương'
      when (select t from n) ~ 'thưởng|thuong tet|bonus|hoa hồng' then 'Thưởng'
      when (select t from n) ~ 'phụ cấp|trợ cấp|allowance' then 'Phụ cấp'
      when (select t from n) ~ 'lì xì|li xi|mừng tuổi|được tặng|biếu|cho tiền' then 'Được tặng'
      when (select t from n) ~ 'hoàn tiền|hoàn lại|trả lại|refund|cashback' then 'Hoàn tiền'
      when (select t from n) ~ 'rút tiết kiệm|rút sổ|tất toán|đáo hạn' then 'Rút tiết kiệm'
      when (select t from n) ~ 'vay|mượn|ứng lương|ứng tiền' then 'Vay / Mượn'
      when (select t from n) ~ 'lãi|lợi nhuận|cổ tức|chứng khoán|đầu tư' then 'Lãi / Đầu tư'
      when (select t from n) ~ 'freelance|làm thêm|part.?time|dự án|nhận job|tăng ca' then 'Làm thêm'
      when (select t from n) ~ 'kinh doanh|doanh thu|buôn|shop|đơn hàng' then 'Kinh doanh'
      when (select t from n) ~ 'bán |thanh lý|sang nhượng|pass ' then 'Bán đồ'
      else null
    end

    -- CHI: quy tắc cụ thể đứng trước, quy tắc rộng đứng sau.
    when (select t from n) ~ 'cà phê|ca phe|cafe|coffee|trà sữa|tra sua|highlands|starbucks|phúc long' then 'Cà phê / Trà sữa'
    when (select t from n) ~ 'nhậu|lẩu|bia |rượu|tiệc|liên hoan' then 'Nhậu / Tiệc'
    when (select t from n) ~ 'du lịch|khách sạn|homestay|home|resort|vé máy bay|tour|khu sinh thái|cọc phòng|check.?in' then 'Du lịch'
    when (select t from n) ~ 'công chứng|sao y|chứng thực|ảnh thẻ|hồ sơ|giấy tờ|đóng dấu|photo|dịch thuật|lệ phí' then 'Giấy tờ / Thủ tục'
    when (select t from n) ~ 'kara|hát|xem phim|cgv|lotte|rạp|game|bi.?a|boardgame|vé xem|concert|nhạc hội' then 'Giải trí'
    when (select t from n) ~ 'tiền điện|tiền nước|điện nước|hoá đơn điện|hóa đơn điện' then 'Điện nước'
    when (select t from n) ~ 'wifi|internet|cước|4g|5g|nạp thẻ|sim |data' then 'Internet / Điện thoại'
    when (select t from n) ~ 'thuê nhà|tiền nhà|tiền trọ|nhà trọ|thuê phòng|chung cư' then 'Thuê nhà'
    when (select t from n) ~ 'netflix|spotify|youtube|icloud|chatgpt|canva|thuê bao|gia hạn' then 'Đăng ký / Thuê bao'
    when (select t from n) ~ 'bảo hiểm|insurance' then 'Bảo hiểm'
    when (select t from n) ~ 'xăng|đổ xăng|petrol' then 'Xăng xe'
    when (select t from n) ~ 'gửi xe|giữ xe|bãi xe|đỗ xe|parking' then 'Gửi xe'
    when (select t from n) ~ 'sửa |bảo dưỡng|thay lốp|thay nhớt|thợ ' then 'Sửa chữa'
    when (select t from n) ~ 'cưới|đám hỏi|thôi nôi|đầy tháng|phúng|đám tang|mừng thọ' then 'Hiếu hỉ'
    when (select t from n) ~ 'thuốc|khám|bệnh viện|phòng khám|nha khoa|xét nghiệm|vaccine|tiêm' then 'Sức khỏe'
    when (select t from n) ~ 'gym|yoga|bơi|cầu lông|bóng đá|đá bóng|đá banh|chạy bộ|tennis' then 'Thể thao'
    when (select t from n) ~ 'cắt tóc|làm tóc|nail|mỹ phẩm|skincare|spa|làm đẹp' then 'Làm đẹp'
    when (select t from n) ~ 'học phí|khóa học|khoá học|sách|vở|bút|course|luyện thi' then 'Học tập'
    when (select t from n) ~ 'mèo|chó |cún|pate|cát vệ sinh|thú cưng|pet' then 'Thú cưng'
    when (select t from n) ~ 'quà|gift|sinh nhật|kỷ niệm' then 'Quà tặng'
    when (select t from n) ~ 'từ thiện|ủng hộ|quyên góp' then 'Từ thiện'
    when (select t from n) ~ 'tiết kiệm|bỏ ống|gửi sổ' then 'Tiết kiệm'
    when (select t from n) ~ 'đầu tư|chứng khoán|cổ phiếu|mua vàng' then 'Đầu tư'
    when (select t from n) ~ 'trả nợ|trả góp|trả tiền vay' then 'Trả nợ'
    when (select t from n) ~ 'phí chuyển|phí rút|phí thường niên|phí dịch vụ' then 'Phí dịch vụ'
    when (select t from n) ~ 'nồi |chảo|máy giặt|tủ lạnh|gia dụng|giấy vệ sinh|nước rửa|bột giặt' then 'Đồ gia dụng'
    when (select t from n) ~ 'áo |quần |giày|dép|váy|đồ bộ' then 'Quần áo'
    when (select t from n) ~ 'hẹn hò|đi chơi|date' then 'Hẹn hò'
    when (select t from n) ~ 'biếu bố|biếu mẹ|ba mẹ|bố mẹ|gia đình|ông bà' then 'Gia đình'
    when (select t from n) ~ 'siêu thị|đi chợ|bách hoá|bách hóa|winmart|co.?opmart|bigc|rau |thịt |cá ' then 'Đi chợ'
    when (select t from n) ~ 'grab|taxi|xe ôm|xe buýt|vé xe|vé tàu|be bike|gojek' then 'Di chuyển'
    when (select t from n) ~ 'shopee|lazada|tiki|tiktok shop|mua ' then 'Mua sắm'
    when (select t from n) ~ 'ăn |cơm|phở|bún|mì |quán|nhà hàng|grabfood|shopeefood|bánh|ăn sáng|ăn trưa|ăn tối' then 'Ăn uống'
    else null
  end;
$$;

-- Danh mục nên có của một record. Giữ nguyên lựa chọn có chủ đích của người dùng;
-- chỉ gợi ý lại khi danh mục là 'Khác' hoặc không còn nằm trong danh sách hợp lệ.
create or replace function public.suggest_category_v1(p_kind text, p_category text, p_note text)
returns text
language sql
immutable
as $$
  select case
    when p_category is not null
     and p_category <> 'Khác'
     and p_category = any (public.category_list_v1(p_kind))
      then p_category
    else coalesce(public.guess_category_v1(p_kind, p_note), 'Khác')
  end;
$$;
