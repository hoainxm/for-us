# 02 — design-spec: Theo dõi chu kỳ kinh nguyệt

> Load khi: task chạm giao diện / màn hình / component của tính năng chu kỳ (thẻ chu kỳ ở tab Sự kiện, trang /cycle, sheet ghi kỳ, sheet cài đặt, icon thông báo period_*)
covers: src/pages/CyclePage.tsx, src/components/cycle, src/pages/EventsPage.tsx, src/pages/NotificationsPage.tsx, src/components/ui/sheet.tsx, src/App.tsx
last_verified: 2026-10-18
ttl_days: 90

> **Mục đích**: oracle GIAO DIỆN cho tính năng chu kỳ. Hành vi (ai làm gì, đúng/sai) nằm ở [01-ba-spec-menstrual-cycle.md](01-ba-spec-menstrual-cycle.md). File này chỉ quyết **màn nào, chứa gì, trông ra sao**. Mỗi AC của ba-spec phải làm được trên các màn dưới đây. Path trong `covers` là dự kiến.

---

## 1. Vị trí trong app (quyết định IA)

Bottom nav đã đủ 4 tab + nút (+) — đúng mức trần 5. **Không thêm tab.**

| Phương án | Đánh giá | Kết quả |
|---|---|---|
| A. Thẻ chu kỳ ghim đầu tab **Sự kiện** → bấm vào mở `/cycle` | Tab Sự kiện vốn là "đếm từng ngày", nên "còn 11 ngày tới kỳ" cùng một mô hình hiểu. Cả hai người mở tab này thường xuyên. Ghi kỳ chỉ cần 3 chạm từ màn chính | **Chọn** |
| B. Một dòng trong **Cá nhân** | Bị giấu: dùng hằng tháng, xem hằng tuần thì không nên nằm trong cài đặt | Loại |
| C. Thay 1 tab / thêm tab thứ 5 | Vượt mức trần nav, đánh đổi tab dùng hằng ngày | Loại |
| D. Thêm mode "Kỳ" vào màn (+) Tạo mới | Ghi kỳ không phải "tạo nội dung"; trạng thái và lịch không có chỗ để hiện | Loại |

Điểm vào phụ: thông báo `period_*` (push + trung tâm thông báo) mở thẳng `/cycle`.

## 2. Thang người dùng (tiếp nối ba-spec §2)

| Người dùng · bậc | Muốn thấy | App truyền tải | Thúc đẩy bước tiếp |
|---|---|---|---|
| **Chưa ai theo dõi** (cả 2 người) | Tính năng này làm được gì cho mình | "Biết trước ngày tới kỳ, cả hai cùng chuẩn bị" | 1 thẻ mời trên tab Sự kiện → thiết lập trong 1 bước. Ẩn được |
| **U1 mới** (vừa bật) | Dự đoán đầu tiên đã ra ngay | "Xong rồi, mình sẽ nhắc trước 2 ngày" | Bật thông báo đẩy nếu chưa bật (nudge duy nhất) |
| **U1 quen** | Hôm nay là ngày thứ mấy, còn bao lâu, tháng này thế nào | "Mọi thứ trong tầm kiểm soát" | Ghi bắt đầu / kết thúc kỳ đúng lúc |
| **U2 (người đồng hành)** | Còn bao lâu tới kỳ của người kia | "Bạn sẽ được báo trước để quan tâm" | Không có hành động ghi; chỉ đọc. Tự tắt nhắc nếu muốn |

### Trọng số thông tin trang `/cycle`
| Mục thông tin | U1 quen | U2 | U1 mới / chưa theo dõi |
|---|---|---|---|
| Trạng thái hôm nay (ngày thứ N · còn X ngày · đang hành kinh · quá ngày) | **3** | **3** | 0 |
| Hành động ghi bắt đầu / kết thúc | **3** | 0 | 0 |
| Ngày dự đoán kỳ tới (nằm cùng widget trạng thái) | 2 | **3** → gộp vào widget trạng thái | 0 |
| Lịch tháng (đã ghi + dự đoán) | 2 | 2 | 0 |
| Thống kê (chu kỳ TB, số ngày hành kinh TB, cờ chưa đều, số chu kỳ bị loại) | 1 | 1 | 0 |
| Lịch sử các kỳ | 1 | 1 | 0 |
| Form thiết lập + lưu ý "không phải biện pháp tránh thai" | 0 | 0 | **3** |

U2 có "trạng thái" và "ngày dự đoán" cùng W3 nhưng nằm chung 1 widget (hero), nên vẫn đủ ≤2 mục W3.

## 3. Object model & flow

- **Kỳ** (bản ghi): xem trên lịch + lịch sử; tạo/sửa ≤ 3 trường → **sheet**, không thêm trang.
- **Cài đặt chu kỳ**: ≤ 5 trường → **sheet**.
- **Dự đoán / trạng thái**: chỉ để đọc, nằm trong trang `/cycle`.

| Flow (NV ba-spec) | Đường đi | Số chạm |
|---|---|---|
| Ghi bắt đầu kỳ hôm nay (NV2) | Sự kiện → thẻ chu kỳ → **Ghi bắt đầu kỳ** → **Lưu** (mặc định hôm nay) | 4 từ tab; **2** khi đã ở `/cycle` hoặc mở từ thông báo (khớp metric ba-spec "≤ 2 thao tác") |
| Ghi kết thúc kỳ (NV3) | `/cycle` → **Ghi kết thúc kỳ** → **Lưu** | 2 |
| Ghi bù ngày cũ (NV2) | `/cycle` → chạm ô ngày quá khứ trên lịch → sheet điền sẵn ngày đó → **Lưu** | 2 |
| Sửa / xoá kỳ (NV4) | `/cycle` → chạm ngày đã ghi hoặc dòng lịch sử → sheet sửa → **Lưu** / **Xoá kỳ** (hỏi xác nhận) | 2–3 |
| Thiết lập (NV1) | Sự kiện → thẻ mời → `/cycle` (dạng onboarding) → **Bắt đầu theo dõi** | 3 |
| Cài đặt (NV9/NV10) | `/cycle` → biểu tượng cài đặt trên header → sheet → **Lưu** | 3 |

## 4. Screen map

| # | Màn / vùng | Vào từ | Đến để làm gì | Step tiếp theo mong muốn | Primary action | Biến thể |
|---|---|---|---|---|---|---|
| SC1 | **Thẻ chu kỳ** ghim đầu tab Sự kiện (`/events`) | Bottom nav "Sự kiện" | Liếc nhanh còn bao lâu tới kỳ | Bấm thẻ để mở `/cycle` | Không có (thẻ là link; primary của tab vẫn là nút +) | Mời (chưa ai theo dõi) · U1 · U2 · không hiện (U2 khi U1 tắt theo dõi và chưa có lịch sử) |
| SC2 | **Trang Chu kỳ** `/cycle` (toàn màn, có nút quay lại như các trang chi tiết) | SC1; thông báo period_*; trung tâm thông báo | Biết hôm nay ở đâu trong chu kỳ; ghi kỳ | U1: ghi bắt đầu/kết thúc; U2: đọc rồi rời đi | U1: **Ghi bắt đầu kỳ** hoặc **Ghi kết thúc kỳ** (theo trạng thái) · U2: không có (màn đọc) | Onboarding · U1 · U2 · cả 2 cùng theo dõi (thêm segmented "Của tôi / Của <tên>") |
| SC3 | **Sheet ghi / sửa kỳ** (bottom sheet trên SC2) | Nút primary SC2; chạm ô lịch; chạm dòng lịch sử | Ghi đúng ngày | Lưu → về SC2 thấy lịch + hero đổi | **Lưu** | Ghi bắt đầu · Ghi kết thúc · Sửa kỳ (thêm "Xoá kỳ" dạng link đỏ) |
| SC4 | **Sheet cài đặt** (bottom sheet trên SC2) | Biểu tượng cài đặt trên header SC2 | Chỉnh nhắc / giá trị thường / tắt theo dõi | Lưu → về SC2 | **Lưu** | U1 (5 trường) · U2 (1 công tắc nhận nhắc) |
| SC5 | **Trung tâm thông báo** (đã có) | Chuông | Xem nhắc | Bấm thông báo period_* → SC2 | (giữ nguyên) | Thêm icon cho 3 loại period_* |

Route mới: `/cycle` (ngoài `AppShell`, giống `/events/:id`). Sheet là state trong trang, **không thêm route**.

## 5. Bố cục từng màn

### SC1 — Thẻ chu kỳ (trên đầu danh sách sự kiện, trước các EventCard)
Cùng khung với `EventCard` (Card · `p-4` · `gap-4` · icon 48 · số to bên phải) để không lạc giọng:
- Trái: ô icon 48×48 `Flower2` nền `primary/12`.
- Giữa: tiêu đề "Chu kỳ" (U2: "Chu kỳ của <tên>", truncate) · dòng phụ ngày dự kiến "Dự kiến 29/10".
- Phải: số lớn `text-2xl font-bold tabular-nums` + nhãn 10px:
  - còn X ngày → "11" / "ngày nữa"
  - hôm nay → "Hôm nay" (không số)
  - đang hành kinh → "N" / "ngày thứ" (nền thẻ `primary/8` đậm hơn)
  - quá ngày → "N" / "ngày quá dự kiến", số màu `muted-foreground` (không đỏ, không cảnh báo)
- **Biến thể mời**: icon + "Theo dõi chu kỳ" + dòng phụ "Biết trước ngày tới kỳ, cả hai cùng chuẩn bị" + link nhỏ "Ẩn" (nhớ lựa chọn trên máy này). Không có số.

### SC2 — Trang Chu kỳ (U1 quen, từ trên xuống)
1. **Header** (sticky, giống trang chi tiết): nút quay lại · tiêu đề "Chu kỳ" (U2: "Chu kỳ của <tên>") · biểu tượng cài đặt (44×44).
2. **Hero trạng thái** (W3, 1 widget): vòng tiến độ SVG 160px, vòng = ngày thứ N / độ dài chu kỳ TB; giữa vòng là số lớn 40px + nhãn. Dưới vòng một dòng: "Kỳ tới dự kiến **29/10** · nhắc trước 2 ngày".
   - Đang hành kinh: vòng đổ `primary`, giữa "Ngày 3", nhãn "đang hành kinh".
   - Quá ngày: giữa "+4", nhãn "ngày quá dự kiến", kèm 1 dòng gợi ý trung tính "Nếu kỳ đã bắt đầu, ghi lại để dự đoán chính xác hơn".
3. **Primary** (W3, chỉ U1): nút full-width `size lg`, "Ghi bắt đầu kỳ" hoặc "Ghi kết thúc kỳ". Ngay dưới hero, trong vùng ngón cái.
4. **Lịch tháng** (W2): header tháng "Tháng 10, 2026" + 2 nút ‹ › (44×44); lưới 7 cột T2–CN, ô 44×44.
   - Ngày đã ghi: tròn đặc `primary`, chữ `primary-foreground`
   - Ngày đã ghi nhưng ước tính: tròn `primary/40`
   - Ngày dự đoán: tròn viền nét đứt `primary`, nền trong
   - Hôm nay: vòng `ring-2 ring-foreground/70` (chồng được lên các kiểu trên)
   - Ngày tương lai: chữ `muted-foreground`, không chạm được để ghi
   - Chú giải 3 mục ngay dưới lưới (chấm 8px + chữ 12px).
5. **Thống kê** (W1, 1 Card, 3 cột): "Chu kỳ TB 29 ngày" · "Hành kinh TB 5 ngày" · "Dựa trên 4 chu kỳ". Có cờ chưa đều thì thêm dòng `Badge` "Chưa đều"; có chu kỳ bị loại thì thêm chữ phụ "1 chu kỳ không tính (quá dài/ngắn)".
6. **Lịch sử** (W1): tiêu đề nhỏ "Các kỳ gần đây"; list ≤ 6 dòng ("01/10 – 05/10 · 5 ngày · ước tính"), cuối list có link "Xem tất cả" mở rộng tại chỗ. U1 chạm dòng để mở SC3 sửa.
7. **Lưu ý cuối trang**: chữ 12px muted "Dự đoán chỉ để tham khảo, không phải biện pháp tránh thai."

**Biến thể U2**: không có mục 3; ô lịch không chạm được; lịch sử chỉ đọc; sheet cài đặt chỉ có công tắc nhận nhắc. Phần còn lại y hệt U1 (cùng nguồn S2).

**Biến thể Onboarding** (chưa theo dõi): thay mục 2–6 bằng:
- Icon 64 + tiêu đề "Theo dõi chu kỳ" + 1 câu giá trị.
- Trường 1: "Kỳ gần nhất bắt đầu ngày" (`DateField`, bắt buộc, không cho chọn ngày tương lai).
- Link "Tuỳ chỉnh" (đóng mặc định), mở ra 3 trường stepper −/+: "Độ dài chu kỳ" 28 · "Số ngày hành kinh" 5 · "Nhắc trước" 2 ngày.
- Lưu ý "không phải biện pháp tránh thai" **đặt ngay trên nút** (R8: phải thấy lúc thiết lập).
- Primary "Bắt đầu theo dõi".
- Chú thích nhỏ "Người ấy sẽ xem được chu kỳ và nhận nhắc cùng bạn" (minh bạch quyền chia sẻ).

**Biến thể cả 2 cùng theo dõi**: segmented 2 lựa chọn ngay dưới header; nhớ lựa chọn gần nhất.

### SC3 — Sheet ghi / sửa kỳ
- Bottom sheet, bo góc trên, thanh kéo, đóng bằng kéo xuống / chạm nền / Esc.
- **Ghi bắt đầu**: tiêu đề "Ghi bắt đầu kỳ"; chip nhanh "Hôm nay" (chọn sẵn) · "Hôm qua" · `DateField` "Ngày khác"; primary **Lưu**.
- **Ghi kết thúc**: như trên, tiêu đề "Ghi kết thúc kỳ", hiện "Bắt đầu 28/10 · sẽ là 6 ngày" cập nhật theo ngày chọn.
- **Sửa kỳ**: 2 `DateField` "Bắt đầu" / "Kết thúc" (kết thúc để trống được) + link đỏ "Xoá kỳ" ở cuối → `ConfirmDialog` (destructive) "Xoá kỳ 01/10 – 05/10?".
- Lỗi (chồng lấn, ngày tương lai, > 15 ngày): dòng chữ `destructive` ngay dưới trường, **giữ nguyên lựa chọn**, primary vẫn bật để thử lại.

### SC4 — Sheet cài đặt
- **U1**: "Nhắc trước" stepper 1–7 ngày · "Độ dài chu kỳ thường" 21–45 · "Số ngày hành kinh thường" 2–10 · công tắc "Nhận nhắc trên máy này" · công tắc "Theo dõi chu kỳ". Tắt công tắc này mở `ConfirmDialog` "Tắt theo dõi? Dữ liệu vẫn được giữ, sẽ không còn nhắc cho cả hai".
- **U2**: công tắc "Nhắc khi sắp tới kỳ của <tên>".
- Nếu máy chưa bật thông báo đẩy: 1 dòng nudge "Bật thông báo để nhận nhắc" + link sang Cá nhân → Thông báo (nudge duy nhất của tính năng).
- Primary **Lưu**.

### SC5 — Trung tâm thông báo
Thêm vào `iconFor`: `period_upcoming` → `Flower2`, `period_due` → `Flower2`, `period_late` → `CalendarClock`. url `/cycle`.

## 6. Hành động → kỳ vọng

| Hành động | Người dùng kỳ vọng thấy ngay |
|---|---|
| Lưu "Ghi bắt đầu kỳ" | Sheet đóng; hero chuyển "Ngày 1 · đang hành kinh"; ô hôm nay trên lịch tô đặc; primary đổi thành "Ghi kết thúc kỳ"; toast "Đã ghi bắt đầu kỳ" kèm **Hoàn tác** (xoá bản ghi vừa tạo) |
| …khi kỳ trước bị tự đóng (AC-28) | Toast thêm mô tả "Kỳ trước được ghi kết thúc 05/10 (ước tính)" |
| Lưu "Ghi kết thúc kỳ" | Hero về "Ngày N"; lịch đánh dấu đủ dải ngày; toast "Đã ghi kết thúc · 6 ngày" |
| Lưu sửa kỳ | Lịch, dự đoán, thống kê cập nhật; toast "Đã cập nhật" |
| Xác nhận xoá kỳ | Sheet đóng, ô lịch hết tô; toast "Đã xoá kỳ" |
| Bắt đầu theo dõi | Trang chuyển ngay sang dạng U1 với hero + dự đoán; toast "Sẽ nhắc trước 2 ngày 🌸" |
| Lưu cài đặt | Sheet đóng; dòng "nhắc trước N ngày" trong hero đổi; toast "Đã lưu" |
| Chạm thông báo period_* | Mở `/cycle` có đủ ngữ cảnh (header ghi rõ của ai), không cần qua tab |

## 7. Ma trận trạng thái

| Trạng thái | SC1 thẻ | SC2 trang | SC3/SC4 sheet |
|---|---|---|---|
| Chưa ai theo dõi | Biến thể mời (ẩn được) | Onboarding | — |
| U1 tắt theo dõi | U1: thẻ "Đã tắt theo dõi" mờ; U2: ẩn nếu chưa có lịch sử, có lịch sử thì "Không theo dõi" | Hero thay bằng "Đã tắt theo dõi"; U1 có primary "Bật lại"; lịch + lịch sử vẫn đọc được (R13) | — |
| Chưa có dữ liệu (xoá hết) | "Chưa có dữ liệu" | Hero rỗng + U1 primary "Ghi bắt đầu kỳ" | — |
| Đang tải | Skeleton hình thẻ `h-20` (như Sự kiện) | Skeleton: vòng tròn 160 + lưới 6×7 ô xám | Primary hiện spinner, khoá khi `isPending` |
| Lỗi / mất mạng | Thẻ ẩn, không chặn danh sách sự kiện | Khối lỗi "Không tải được chu kỳ" + nút **Thử lại** | Toast lỗi (sonner) + dữ liệu đã chọn giữ nguyên |
| Lỗi ràng buộc (chồng lấn / tương lai / > 15 ngày) | — | — | Dòng lỗi dưới trường, không đóng sheet |
| Quá ngày lâu (+40) | "40" / "ngày quá dự kiến" | Hero "+40"; vòng đầy | — |
| Chưa đều / có chu kỳ bị loại | — | Badge "Chưa đều" + chữ phụ số chu kỳ không tính | — |
| Tên người kia dài 60 ký tự | Truncate 1 dòng | Header truncate | Nhãn công tắc xuống dòng tối đa 2 dòng |
| Chu kỳ ngắn (21) và nhắc 7 ngày | — | Hero vẫn đúng; dải dự đoán có thể rơi sang tháng sau → lịch tháng sau hiện tiếp | — |
| Máy chưa bật thông báo đẩy | — | — | Nudge ở SC4 |

## 8. Component

| Nhu cầu | Component | Lý do |
|---|---|---|
| Thẻ trên tab Sự kiện | `Card` (giống `EventCard`) | Giữ một giọng với danh sách sự kiện |
| Form ghi/sửa/cài đặt | **Sheet mới** `src/components/ui/sheet.tsx` (dáng shadcn Sheet, side="bottom", portal như `ConfirmDialog`) | ≤ 5 trường, cần giữ ngữ cảnh lịch phía sau → drawer, không modal, không thêm trang |
| Xoá kỳ / tắt theo dõi | `ConfirmDialog` có sẵn | Quyết định chặn, giống xoá khoản chi |
| Chọn ngày | Chip + `DateField` có sẵn | Ngày gần (hôm nay/hôm qua) chạm 1 lần; ngày xa dùng picker native |
| Số ngày | Stepper −/+ (nút `Button` size icon 44 + số) | Phạm vi nhỏ, tránh bàn phím số trên mobile |
| Bật/tắt | Switch mới (dáng shadcn Switch) | Chưa có trong repo; cần 3 chỗ |
| Lịch tháng, vòng tiến độ | Tự viết (`src/components/cycle/MonthGrid.tsx`, `CycleRing.tsx`), dùng token | shadcn Calendar cần thêm react-day-picker; lưới 7 cột tự viết nhẹ hơn và chỉ cần hiển thị |
| Nhãn "Chưa đều", "ước tính" | `Badge` variant secondary | ≤ 2 từ |

**Text**: tiêu đề cùng cấp đều là danh từ ("Chu kỳ", "Các kỳ gần đây", "Cài đặt chu kỳ"); nút là động từ ("Ghi bắt đầu kỳ", "Lưu", "Bắt đầu theo dõi"). Ngày `dd/MM`, năm chỉ hiện khi khác năm nay. Không chấm câu ở tiêu đề.

## 9. Token
Dùng nguyên theme hiện có, **không thêm màu mới**:
- Ngày hành kinh / vòng tiến độ: `--primary` (hồng đỏ). Dự đoán: viền nét đứt `--primary`. Ước tính: `--primary` 40%.
- Quá ngày: `--muted-foreground` (cố ý không dùng `--warning` / `--destructive` để không gây lo lắng; R8).
- Spacing: `p-4` trang, `gap-3` giữa khối, `space-y-6` giữa section (thang 4/8/12/16/24).
- Bo góc: `--radius` có sẵn; sheet `rounded-t-xl`.
- Dark mode: các token trên đều có giá trị `.dark`; kiểm tra contrast chữ trên ô đặc `primary` (≥ 4.5:1) và viền nét đứt trên nền `card` tối.

## 10. Platform
- **Mobile (375–430px, chính)**: như mô tả; primary và sheet nằm vùng ngón cái; ô lịch 44×44 (343px / 7 ≈ 49px). Có padding `safe-area-inset-bottom` cho sheet.
- **Tablet / desktop**: app khoá `max-w-md` ở giữa, không đổi bố cục; sheet giới hạn trong cùng cột `max-w-md`; ‹ › và ô lịch dùng được bằng chuột, có `focus-visible` ring; Esc đóng sheet.
- **iOS PWA**: sheet không chạm home indicator; không dựa vào hover. **Android**: nút back hệ thống đóng sheet trước, rồi mới rời trang.

## 11. QA / nghiệm thu
Sau khi build, chụp screenshot ở 375×812 và 768×1024, light + dark, cho các trạng thái:
1. SC1 biến thể mời · U1 còn 11 ngày · U1 đang hành kinh · U2 quá ngày
2. SC2 onboarding (mở Tuỳ chỉnh) · U1 quen · U2 · đang tải · lỗi · đã tắt theo dõi
3. SC3 ghi bắt đầu · sửa kỳ có lỗi chồng lấn · ConfirmDialog xoá
4. SC4 U1 · U2 · nudge chưa bật thông báo

Checklist: đúng 1 primary/màn (U2 không có) · ô chạm ≥ 44 · chữ trên nền `primary` ≥ 4.5:1 · không có số spacing ngoài thang · tên dài không vỡ dòng · AC-1, AC-2, AC-19, AC-28 của ba-spec làm được bằng tay trên UI.

## 12. Quyết định đã chốt
- Không thêm tab; tính năng sống ở thẻ đầu tab Sự kiện + trang `/cycle`.
- Form dùng bottom sheet; thêm `sheet.tsx` + `switch.tsx` dáng shadcn vào `components/ui`.
- Quá ngày hiển thị trung tính, không dùng màu cảnh báo.
- Lưu ý tránh thai hiện ở onboarding (trên nút) và cuối trang `/cycle`.

## History
- v1 (2026-10-18): khởi tạo từ ba-spec v2.
