# For Us 💕

PWA quản lý công việc & nhật ký chia sẻ cho 2 người. React + TypeScript + Vite + Supabase + Tailwind.

## Chạy dev

```bash
npm install
cp .env.example .env   # điền VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

## Build & test bản PWA (installable)

Service Worker **tắt ở dev** (`devOptions.enabled: false`). Muốn test cài đặt lên máy:

```bash
npm run build
npm run preview   # mở http://localhost:4173
```

- **Android/Chrome:** thanh địa chỉ hiện icon Cài đặt, hoặc vào tab **Cá nhân → Cài đặt**.
- **iOS/Safari:** nút Share → "Thêm vào Màn hình chính".

## Cấu trúc

| Thư mục                 | Nội dung                                                                     |
| ----------------------- | ---------------------------------------------------------------------------- |
| `supabase/migrations/`  | SQL schema (7 bảng + 2 bucket + RLS)                                         |
| `src/lib/`              | `supabase.ts`, `queryClient.ts`                                              |
| `src/providers/`        | `AuthProvider` (session)                                                     |
| `src/hooks/`            | react-query: tasks, comments, notes, interactions, events, profile, realtime |
| `src/pages/`            | Login, Tasks(+detail), Notes(+detail), Events, Profile, Create               |
| `src/pwa/`              | register SW, install prompt, notifications                                   |
| `scripts/gen-icons.mjs` | Sinh icon PWA từ SVG (`npm run gen-icons`)                                   |

## Icon PWA

Chỉnh màu/hình trong `scripts/gen-icons.mjs` rồi:

```bash
npm run gen-icons
```

## Web Push (đã bật)

Luồng: client subscribe → lưu `push_subscriptions` → sau mỗi mutation (tạo việc / note / comment / reaction) client gọi Edge Function `notify` → gửi push cho người NHẬN → SW (`src/sw.ts`) hiện notification.

**Thành phần:**

- SW: `src/sw.ts` (`push`, `notificationclick`).
- Client: `src/hooks/usePush.ts` (`enable`, `notify`), `src/pwa/notifications.ts`.
- DB: `supabase/migrations/00002_push_subscriptions.sql`.
- Server: `supabase/functions/notify/index.ts` (Deno + `web-push`).

**Bật (1 lần):**

1. Chạy migration `00002` trên Supabase (SQL Editor).
2. Sinh VAPID keys (nếu chưa có): `npx web-push generate-vapid-keys`
3. `.env` (frontend): thêm `VITE_VAPID_PUBLIC_KEY=<public>` → rebuild.
4. Deploy Edge Function + set secrets:
   ```bash
   supabase functions deploy notify
   supabase secrets set VAPID_PUBLIC_KEY=<public> VAPID_PRIVATE_KEY=<private> VAPID_SUBJECT=mailto:email@email.com
   ```
   (`SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` có sẵn trong runtime Edge Function.)
5. Trên app: tab **Cá nhân → Thông báo** → cấp quyền (lưu subscription).

Test: máy A tạo việc giao cho máy B → máy B nhận push (kể cả khi đóng app).

## Luật lập trình (APP_SPEC)

- Mobile-first → responsive (`max-w-md` desktop, `safe-area-inset`).
- Data fetch **chỉ** qua `@tanstack/react-query` (không `useEffect` fetch).
- Mutation bọc try-catch + `isPending` + toast `sonner`.
- Realtime: `notes`, `note_interactions`, `task_comments`.
- Auto-rollover: `is_completed=false AND due_date<=today`.
- Recurring: Done task định kỳ → tự đẻ task mới tịnh tiến thời gian.
