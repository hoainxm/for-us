# KẾ HOẠCH PHÁT TRIỂN ỨNG DỤNG COUPLE APP (PWA - MOBILE FIRST)
**Định vị:** Ứng dụng quản lý công việc và nhật ký chia sẻ dành riêng cho 2 người.
**Nền tảng:** Progressive Web App (PWA) cài đặt trực tiếp trên iOS/Android, không qua App Store, chi phí 0đ.
**Mục tiêu UI/UX:** Mượt mà, tối giản, tương tác vi mô (micro-interactions) tốt như app Native.

---

## PHẦN 1: TECH STACK & QUY TẮC LẬP TRÌNH (BẮT BUỘC TUÂN THỦ)

### 1.1. Hệ sinh thái Công nghệ
- **Core:** React, TypeScript, Vite.
- **UI & Styling:** Tailwind CSS, shadcn/ui, lucide-react (Icons).
- **State & Routing:** @tanstack/react-query (quản lý server state & cache), react-router-dom.
- **Form Handling:** react-hook-form, zod.
- **Backend/BaaS:** Supabase (PostgreSQL, Auth, Storage, Realtime).
- **PWA & Tiện ích:** vite-plugin-pwa, sonner (Toasts), date-fns (Xử lý ngày tháng).

### 1.2. Coding Conventions (Luật cấm vi phạm)
1. **Thiết kế Mobile-first tuyệt đối, sau đó mới Responsive Web:** 
   - Mặc định toàn bộ CSS/Layout (kích thước nút bấm, font chữ, khoảng cách) BẮT BUỘC phải viết cho màn hình điện thoại trước.
   - Sử dụng `h-screen`, `w-full`, và `safe-area-inset` (padding top/bottom) để UI không bị lẹm vào "tai thỏ" hoặc thanh home của iOS.
   - Sau khi UI trên Mobile đã hoàn hảo, MỚI sử dụng các breakpoint của Tailwind (`md:`, `lg:`) để tối ưu cho Web/Desktop (ví dụ: giới hạn `max-w-md mx-auto` để app không bị bè ra quá to trên màn hình máy tính, hoặc chuyển Bottom Tab thành Sidebar).
2. **Không làm Offline-first phức tạp:** Ứng dụng yêu cầu có mạng. Tuy nhiên, MỌI thao tác gọi API phải bọc `try-catch`, dùng `useMutation` có trạng thái `isLoading` (hiển thị Skeleton/Spinner) và bắn `sonner` thông báo nếu rớt mạng.
3. **Data Fetching:** Không dùng `useEffect` để fetch data. Bắt buộc dùng `@tanstack/react-query` để tận dụng cache giữa các màn hình, tránh giật lag khi chuyển Tab.
4. **Realtime:** Các bảng có tính tương tác cao (Notes, Comments, Reactions) bắt buộc subscribe `Supabase Realtime`.
5. **Logic trôi việc (Auto-rollover):** Truy vấn task luôn dùng điều kiện: `is_completed = false AND due_date <= today`.
6. **Task định kỳ (Recurring):** Khi user "Done" một task có `recurrence_rule`, frontend tự động update status thành Done VÀ insert 1 task mới tinh tịnh tiến thời gian.

---

## PHẦN 2: DATABASE SCHEMA (CẤU TRÚC DỮ LIỆU)

**1. Bảng `profiles`**
- `id` (uuid, PK, ref auth.users.id)
- `display_name` (text)
- `avatar_url` (text, nullable)

**2. Bảng `tasks`**
- `id` (uuid, PK)
- `title` (text)
- `priority` (text) - Enum: 'high', 'medium', 'low'
- `tags` (text[]) - VD: ['Đi chợ', 'Dọn dẹp']
- `recurrence_rule` (text, nullable) - Enum: 'daily', 'weekly', 'monthly'
- `assigned_to` (uuid, ref profiles.id)
- `due_date` (timestamptz)
- `is_completed` (boolean, default false)

**3. Bảng `task_comments`**
- `id` (uuid, PK)
- `task_id` (uuid, ref tasks.id)
- `author_id` (uuid, ref profiles.id)
- `content` (text)
- `created_at` (timestamptz)

**4. Bảng `albums`**
- `id` (uuid, PK)
- `name` (text)
- `cover_image` (text, nullable)

**5. Bảng `notes` (Shared Diary)**
- `id` (uuid, PK)
- `content` (text)
- `album_id` (uuid, ref albums.id, nullable)
- `author_id` (uuid, ref profiles.id)
- `images` (text[]) - Mảng URL ảnh.
- `created_at` (timestamptz)

**6. Bảng `note_interactions`**
- `id` (uuid, PK)
- `note_id` (uuid, ref notes.id)
- `author_id` (uuid, ref profiles.id)
- `type` (text) - Enum: 'comment', 'reaction'
- `value` (text) - Nội dung comment hoặc ký tự Emoji.
- `created_at` (timestamptz)

**7. Bảng `events` (Đếm ngày)**
- `id` (uuid, PK)
- `title` (text)
- `event_date` (date)
- `type` (text) - Enum: 'anniversary' (đếm tiến), 'countdown' (đếm lùi).

**8. Storage Buckets (Public):** `avatars`, `diary_images`.

---

## PHẦN 3: LỘ TRÌNH THỰC THI (PHASES) CHO CLAUDE CODE
*Yêu cầu Claude Code đọc kỹ, thực hiện TỪNG PHASE MỘT. Xong một phase phải báo cáo và chờ lệnh của Admin mới được sang phase tiếp theo.*

### PHASE 0: KIỂM ĐỊNH HIỆU NĂNG & TẠO DATABASE
1. **Báo cáo Thư viện:** Trình bày dạng bảng phân tích các thư viện ở Mục 1.1 (Bundle size ước tính, lý do chọn, ảnh hưởng hiệu năng PWA).
2. **Sinh mã Migration:** Tạo file `supabase/migrations/00001_init_schema.sql` chứa TOÀN BỘ lệnh tạo bảng, tạo Storage buckets, Foreign Keys và chính sách bảo mật RLS cơ bản cho 7 bảng ở Phần 2. Chờ Admin lấy file này chạy trên Supabase.

### PHASE 1: KHỞI TẠO & MOCK UI (THỬ NGHIỆM GIAO DIỆN TĨNH)
1. Setup Vite, Tailwind, cài đặt shadcn/ui.
2. Xây dựng Bottom Navigation với 5 Tabs: **Tasks - Notes - (+) Create - Events - Profile**.
3. **LUẬT THÉP VỀ UI:** 
   - KHÔNG kết nối Supabase ở bước này. Dùng Mock Data (hardcode mảng) để render.
   - Code giao diện ưu tiên hiển thị chuẩn trên màn hình Mobile (chiều ngang ~375px - 430px). Sau đó bọc layout bằng `max-w-md mx-auto` cho breakpoint Web/Desktop để app không bị vỡ khung.
4. **Mục tiêu:** Xây dựng hoàn thiện UI các trang. Thêm hiệu ứng chuyển cảnh mượt mà.
5. Chờ Admin chạy `npm run dev` để review FPS, Layout trên mobile trước khi nối API.

### PHASE 2: AUTH & CONNECT DATABASE (GHÉP DATA)
1. Xóa bỏ Mock Data. Setup `lib/supabase.ts` và bọc app bằng `QueryClientProvider` (Tanstack Query).
2. Code màn hình Login. (Dùng email/password cấp sẵn).
3. Xử lý logic Tab Profile: Cập nhật Tên, Upload Avatar lên Supabase Storage.

### PHASE 3: LOGIC TASK MANAGEMENT
1. Code API gọi data cho Tab Tasks. Xử lý thuật toán Auto-rollover ở Frontend (lọc đúng ngày).
2. Tích hợp tính năng Quẹt (Swipe) để Done task. Xử lý thuật toán tự đẻ task mới nếu là Recurring.
3. Code tính năng Click vào Task mở xem chi tiết -> Cho phép nhập Comment (`task_comments`).

### PHASE 4: LOGIC SHARED DIARY & EVENTS
1. Tích hợp form tạo Note có upload ảnh vào bucket `diary_images`. Chọn Album.
2. Code giao diện Feed, load danh sách Note. Lắng nghe `Supabase Realtime` để update Note mới tự động.
3. Code tính năng thả Reaction (Emoji) và Comment (`note_interactions`).
4. Tab Events: Dùng thư viện tính toán ngày cách hiện tại bao xa, hiển thị đếm ngược/đếm tới.

### PHASE 5: PWA & NOTIFICATIONS
1. Setup `vite-plugin-pwa`: Tạo `manifest.json`, cấu hình icon, theme color, xử lý Service Worker.
2. (Tùy chọn) Setup logic yêu cầu quyền Web Push Notification (FCM / Edge Functions) để gửi thông báo.