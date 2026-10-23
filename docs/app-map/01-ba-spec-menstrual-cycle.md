# 01 — ba-spec: Theo dõi chu kỳ kinh nguyệt

> Load khi: task chạm hành vi / nghiệp vụ / flow / acceptance của theo dõi chu kỳ kinh nguyệt, dự đoán kỳ, nhắc kỳ
covers: supabase/migrations/00011_menstrual_cycle.sql, src/hooks/useCycle.ts, src/pages/CyclePage.tsx, supabase/functions/remind
last_verified: 2026-10-18
ttl_days: 90

> **Mục đích**: oracle HÀNH VI cho theo dõi chu kỳ: USER nào làm nghiệp vụ gì, flow vào/ra thế nào, đúng/sai đo bằng AC nào. KHÔNG mô tả giao diện (việc của design-spec). Các path trong `covers` là **dự kiến** (chưa có code), cập nhật khi build.

---

## 1. Vấn đề & JTBD
- **Job (người theo dõi)**: Khi gần tới kỳ, tôi muốn được báo trước vài ngày để chuẩn bị (đồ dùng, lịch hẹn, tâm lý), và có lịch sử theo tháng để biết chu kỳ mình có đều không.
- **Job (người đồng hành)**: Khi người yêu sắp tới kỳ, tôi muốn biết trước để quan tâm và sắp xếp kế hoạch chung, không bị bất ngờ.
- **Vì sao làm bây giờ**: app đã có hạ tầng Web Push + cron nhắc (`remind`) + trung tâm thông báo, nên chi phí thêm thấp. Đây là nhu cầu riêng của cặp đôi mà các tab hiện có (Việc/Nhật ký/Sự kiện/Chi tiêu) chưa phục vụ.
- **Đo thành công bằng**: mỗi chu kỳ có dự đoán, mỗi người nhận đang bật nhắc nhận **đúng 1** nhắc "sắp tới" (0 trùng, 0 sót). Sau ≥3 chu kỳ đã ghi, sai số dự đoán trung bình ≤ 3 ngày.

## 2. User registry
| User (role) | Là ai | Vòng đời | Thiết bị/bối cảnh |
|---|---|---|---|
| **U1 — Người theo dõi** | Thành viên bật theo dõi chu kỳ cho chính mình; **chủ dữ liệu** | mới (thiết lập) → quen (ghi mỗi tháng) | mobile PWA, ghi nhanh lúc vừa bắt đầu kỳ |
| **U2 — Người đồng hành** | Thành viên còn lại của app 2 người; **chỉ đọc** dữ liệu của U1 + nhận nhắc | quen | mobile PWA, chủ yếu nhận push |
| **S1 — Cron nhắc** | Edge Function chạy định kỳ (mở rộng `remind` hiện có) | — | nền, giờ server UTC |
| **S2 — Bộ tính chu kỳ** | **1 nguồn tính duy nhất** (hàm dùng chung) cho dự đoán/thống kê/trạng thái; cả lúc đọc lẫn S1 đều gọi nó | — | nền |

> App chỉ có đúng 2 profile (`other_profile()`). Theo dõi là opt-in theo profile; thực tế chỉ 1 người là U1. Nếu cả 2 cùng bật thì mỗi người là U1 với dữ liệu của mình và U2 với dữ liệu người kia (luật không đổi).

## 3. User × Nghiệp vụ
| # | Nghiệp vụ | Owner-user | User liên quan (cross) | Phụ thuộc NV | Tần suất | Ưu tiên |
|---|---|---|---|---|---|---|
| NV1 | Bật theo dõi & thiết lập ban đầu | U1 | U2 (bắt đầu thấy dữ liệu) | — | 1 lần | Must |
| NV2 | Ghi nhận ngày bắt đầu kỳ | U1 | S1 (đổi mốc nhắc), U2 (thấy) | NV1 | ~1/tháng | Must |
| NV3 | Ghi nhận ngày kết thúc kỳ | U1 | — | NV2 | ~1/tháng | Must |
| NV4 | Sửa / xoá bản ghi kỳ đã ghi | U1 | S1, U2 | NV2 | thấp | Must |
| NV5 | Xem tình trạng & dữ liệu chu kỳ theo tháng | U1 | U2 (cùng quyền xem) | NV1 | cao | Must |
| NV6 | Tính dự đoán kỳ tới + thống kê + trạng thái | S2 | U1, U2, S1 (tiêu thụ) | NV1, NV2 | mỗi lần đọc / mỗi lần cron chạy | Must |
| NV7 | Nhắc sắp tới kỳ / tới ngày dự kiến | S1 | U1, U2 (nhận) | NV6 | 2 lần/chu kỳ | Must |
| NV8 | Nhắc ghi nhận khi quá ngày dự kiến (chống dữ liệu đứng) | S1 | U1 (nhận) | NV6 | ≤1 lần/chu kỳ | Must |
| NV9 | Cấu hình của U1 (số ngày nhắc trước, giá trị thường, tắt/bật theo dõi, tắt nhắc của chính mình) | U1 | S1 | NV1 | thấp | Must |
| NV10 | Tắt / bật nhận nhắc của chính mình | U2 | S1 | — | thấp | Should |

## 4. Cross-user handoff map
| Chặng | Nghiệp vụ | Từ | → Nhận | Điều kiện chuyển | Điểm kết nếu không ai nhận / thất bại |
|---|---|---|---|---|---|
| H1 | NV1/NV2/NV4 → NV6 | U1 (ghi/sửa/xoá) | S2 (tính lại) | bất kỳ thay đổi bản ghi hoặc cấu hình | dự đoán luôn suy ra từ dữ liệu hiện tại (R7), không có trạng thái treo |
| H2 | NV6 → NV7 | S1 | U1 + U2 | hôm nay (giờ VN) nằm trong **cửa sổ** của loại nhắc (R5), trong khung giờ gửi (R6), chưa gửi loại này cho chu kỳ này, người nhận đang bật nhắc | người nhận không có push subscription → vẫn tạo thông báo trong app; hết cửa sổ mà chưa gửi (cron chết) → bỏ qua, không gửi bù |
| H3 | NV6 → NV8 | S1 | U1 | hôm nay ≥ ngày dự đoán + 3 và chưa có kỳ mới | sau 1 lần nhắc thì dừng; trạng thái "quá ngày dự kiến N ngày" hiển thị cho tới khi U1 ghi (NV2) hoặc tắt theo dõi |
| H4 | NV1..NV4 → NV5 | U1 | U2 | luôn (chia sẻ đầy đủ) | U1 tắt theo dõi → U2 thấy trạng thái "không theo dõi", vẫn đọc được lịch sử, không nhận nhắc |
| H5 | NV2 (kỳ tới sớm) → NV7 | U1 | S1 | U1 ghi kỳ mới trước ngày nhắc | chu kỳ mới có khoá riêng → nhắc của chu kỳ cũ không còn đủ điều kiện → 0 nhắc thừa |

## 5. Flows

### Flow NV1 — Bật theo dõi & thiết lập · owner: U1
- **Start**: U1 chưa bật theo dõi
- **Input**: ngày bắt đầu kỳ gần nhất (bắt buộc, ≤ hôm nay); độ dài chu kỳ thường (mặc định 28, 21–45); số ngày hành kinh thường (mặc định 5, 2–10); số ngày nhắc trước (mặc định 2, 1–7)
- **Steps**: nhập kỳ gần nhất → (tuỳ chọn) chỉnh 3 giá trị mặc định → xác nhận (kèm lưu ý R8)
- **Output**: cấu hình theo dõi của U1 = bật; 1 bản ghi kỳ start = ngày nhập, end để trống (R11 suy ra độ dài hiệu lực); dự đoán kỳ tới có giá trị
- **End**: U1 và U2 đều đọc được tình trạng chu kỳ
- **Cross**: H1, H4
- **Ca nhập kỳ đã xa** (ví dụ dự đoán đã qua): S1 chỉ áp các cửa sổ còn hiệu lực (R5) → có thể chỉ gửi nhắc "quá ngày" cho U1, không gửi "sắp tới"/"tới ngày" bù

### Flow NV2 — Ghi bắt đầu kỳ · owner: U1
- **Start**: đang bật theo dõi
- **Input**: ngày bắt đầu (mặc định hôm nay, cho phép lùi về quá khứ)
- **Steps**: chọn ngày → xác nhận (1 thao tác nếu là hôm nay)
- **Output**: bản ghi kỳ mới (end trống) → trạng thái "đang hành kinh ngày N"; dự đoán kỳ tới tính lại
- **End**: bản ghi có trong dữ liệu tháng của cả U1 và U2
- **Nhánh quên kết thúc kỳ trước**: có kỳ mở **> 10 ngày** → tự đóng kỳ đó tại start + số ngày hành kinh thường − 1, đánh dấu "ước tính", rồi tạo kỳ mới trong cùng thao tác (R2, R11)
- **Nhánh lỗi**: kỳ đang mở ≤ 10 ngày, chồng lấn kỳ khác (tính theo end hiệu lực), hoặc ngày tương lai → từ chối, không tạo bản ghi (R2, R3)
- **Cross**: H1, H5

### Flow NV3 — Ghi kết thúc kỳ · owner: U1
- **Start**: có 1 kỳ đang mở
- **Input**: ngày kết thúc (mặc định hôm nay)
- **Steps**: chọn ngày → xác nhận
- **Output**: kỳ đóng, độ dài kỳ = end − start + 1; thống kê số ngày hành kinh TB tính lại
- **End**: không còn kỳ đang mở
- **Nhánh không ghi**: U1 quên ghi kết thúc → kỳ mở > 10 ngày được tính bằng số ngày hành kinh thường cho thống kê/hiển thị (R11), bản ghi gốc không bị sửa cho tới khi NV2 tự đóng
- **Nhánh lỗi**: end < start, end > hôm nay, hoặc độ dài > 15 ngày → từ chối

### Flow NV4 — Sửa / xoá bản ghi · owner: U1
- **Start**: có ≥1 bản ghi
- **Input**: bản ghi + giá trị mới (hoặc lệnh xoá có xác nhận)
- **Output**: bản ghi cập nhật / bị xoá; dự đoán + thống kê tính lại; sửa ngày của bản ghi **không** đổi khoá chu kỳ (R5) nên không gửi lại nhắc đã gửi; xoá bản ghi cuối cùng → trạng thái "chưa có dữ liệu", không nhắc
- **Nhánh lỗi**: sửa gây chồng lấn, ngày tương lai, end < start, hoặc độ dài > 15 ngày → từ chối, bản ghi giữ nguyên
- **Lưu ý**: xoá 1 bản ghi ở giữa sẽ gộp 2 chu kỳ thành 1 chu kỳ dài; lọc ngoại lệ ở R4 xử lý
- **End**: dữ liệu nhất quán với R2, R3

### Flow NV5 — Xem theo tháng · owner: U1 (U2 cùng quyền đọc)
- **Start**: người xem đã đăng nhập; U1 đã từng bật theo dõi
- **Input**: tháng cần xem (mặc định tháng hiện tại)
- **Output**: cho tháng đó: các ngày hành kinh đã ghi (đánh dấu "ước tính" nếu end tự suy ra); các ngày hành kinh dự đoán của **1 kỳ tới duy nhất**; tình trạng hôm nay (ngày thứ N của chu kỳ · còn X ngày · hôm nay là ngày dự kiến · quá ngày dự kiến X ngày · đang hành kinh ngày N · không theo dõi · chưa có dữ liệu); thống kê: độ dài chu kỳ TB, số ngày hành kinh TB, số chu kỳ dùng để tính, số chu kỳ bị loại, cờ "chưa đều" (R12)
- **End**: người xem chuyển tháng trước/sau hoặc rời đi (chỉ đọc, không đổi dữ liệu)

### Flow NV6 — Dự đoán · owner: S2
- **Input**: các bản ghi kỳ của U1 + cấu hình
- **Steps**: lấy các chu kỳ hoàn chỉnh (start kỳ i → start kỳ i+1) → loại chu kỳ < 15 hoặc > 60 ngày → nếu còn ≥3 chu kỳ thì loại thêm chu kỳ > 1,6 × trung vị (thường do quên ghi 1 kỳ) → lấy tối đa 6 chu kỳ gần nhất → TB làm tròn half-up; 0 chu kỳ hợp lệ → dùng độ dài chu kỳ thường trong cấu hình
- **Output**: ngày dự đoán kỳ tới = start kỳ gần nhất + TB; các ngày hành kinh dự đoán = [ngày dự đoán, + số ngày hành kinh TB − 1]; trạng thái hôm nay; số chu kỳ dùng/bị loại
- **End**: kết quả trả cho NV5 / NV7 / NV8 (không lưu bản sao, R7)

### Flow NV7 — Nhắc sắp tới / tới ngày · owner: S1
- **Start**: cron chạy (theo lịch hiện có của `remind`)
- **Input**: dự đoán (NV6) của mọi U1 đang bật; lead_days; người nhận đang bật nhắc (U1, U2); nhật ký nhắc đã gửi
- **Steps**: với mỗi U1, trong khung giờ gửi (R6): nếu hôm nay ∈ [dự đoán − lead_days, dự đoán − 1] và chưa gửi "sắp tới" cho chu kỳ này → gửi "sắp tới"; nếu hôm nay ∈ [dự đoán, dự đoán + 2] và chưa gửi "tới ngày" → gửi "tới ngày". Hai cửa sổ không giao nhau nên mỗi lần chạy tối đa 1 loại
- **Output**: mỗi người nhận: 1 thông báo trong app + push tới mọi subscription; 1 dòng nhật ký nhắc (khoá: chu kỳ, loại, người nhận)
- **End**: lần chạy kết thúc; lần chạy sau không gửi lại (R5)
- **Nội dung** (X = số ngày còn lại thật, không cố định): "sắp tới" U1 "Còn X ngày tới kỳ 🌸", U2 "Còn X ngày tới kỳ của <tên U1>, nhớ quan tâm nhé 💕"; "tới ngày" U1 "Hôm nay là ngày dự kiến tới kỳ 🌸", U2 "Hôm nay là ngày dự kiến tới kỳ của <tên U1> 💕". Không chi tiết y tế (R8)

### Flow NV8 — Nhắc khi quá ngày dự kiến · owner: S1
- **Start**: cron chạy
- **Input**: dự đoán, nhật ký nhắc, cấu hình nhắc của U1
- **Steps**: trong khung giờ, hôm nay ≥ dự đoán + 3, chưa có kỳ mới, chưa gửi "quá ngày" cho chu kỳ này, U1 đang bật nhắc → gửi cho **chỉ U1**
- **Output**: 1 thông báo "Đã qua ngày dự kiến N ngày. Nếu kỳ đã bắt đầu, ghi lại để dự đoán chính xác hơn nhé" (N = số ngày thật)
- **End**: không nhắc thêm; trạng thái tiếp tục hiển thị cho tới khi NV2

### Flow NV9 — Cấu hình của U1 · owner: U1
- **Input**: lead_days (1–7), độ dài chu kỳ/kỳ thường, bật/tắt theo dõi, bật/tắt nhận nhắc của chính U1 (mặc định bật)
- **Output**: cấu hình mới có hiệu lực ở lần cron kế tiếp; tắt theo dõi → 0 nhắc cho cả 2, dữ liệu vẫn giữ, U2 thấy "không theo dõi"; U1 tắt nhắc của mình → U1 nhận 0 nhắc (kể cả "quá ngày"), U2 vẫn nhận theo cấu hình của U2

### Flow NV10 — U2 tắt/bật nhận nhắc · owner: U2
- **Input**: bật/tắt (mặc định bật)
- **Output**: U2 nhận 0 nhắc chu kỳ khi tắt; U1 không bị ảnh hưởng; quyền xem của U2 không đổi

## 6. Flow optimization log
| Flow | Candidate | Chọn / Loại | Lý do (rubric) | Đánh giá bởi | Conflict & xử |
|---|---|---|---|---|---|
| NV6 | A: lưu bảng dự đoán, cập nhật khi ghi · B: suy ra từ bản ghi mỗi lần đọc/cron qua 1 hàm dùng chung (S2) | **Chọn B** | A có thể lệch khi ghi lỗi giữa chừng → dự đoán sai/treo (#3 no dead-end); 2 bản cài (client + cron) sẽ lệch nhau nên gom về S2 (#5) | Optimizer + Reviewer | Reviewer: NV6 thuộc S1 mà client cũng tính → đổi owner sang S2 |
| NV6 | A: TB mọi chu kỳ · B: TB ≤6 chu kỳ gần nhất, lọc 15–60 + > 1,6× trung vị · C: chỉ chu kỳ gần nhất | **Chọn B** | C dao động mạnh; A chậm thích nghi; B chịu được lần quên ghi (chu kỳ 56 với người 28 ngày) | Optimizer + Domain-Specialist | Specialist: lọc 15–60 không bắt được 1 kỳ bị bỏ sót (56 ngày) → thêm lọc theo trung vị |
| NV2/NV3 | A: bắt buộc start + end cùng lúc · B: start 1 thao tác, end ghi sau / tự suy ra; kỳ mở > 10 ngày tự đóng khi ghi kỳ mới | **Chọn B** | đúng hành vi thật, ít bước (#5); trước đó quên end chặn luôn việc ghi kỳ mới (dead-end #3) | Optimizer + Cross-User-Integrity | Integrity: BLOCK dead-end → thêm tự đóng |
| NV7 | A: điều kiện "≥ ngày" không giới hạn + chỉ gửi loại muộn nhất · B: cửa sổ đóng không giao nhau theo loại | **Chọn B** | A gửi bù loại đã bỏ qua ở lần chạy sau (vd "sắp tới" sau "tới ngày") (#3) | Cross-User-Integrity | BLOCK → B |
| NV7 | Khoá chu kỳ: A ngày start kỳ gần nhất · B id bản ghi kỳ gần nhất | **Chọn B** | A đổi khi U1 sửa ngày start → gửi lại nhắc (vi phạm R5) | Cross-User-Integrity | BLOCK → B |
| NV8 | A: nhắc hằng ngày · B: 1 lần ở +3 rồi chỉ hiển thị trạng thái · C: không nhắc | **Chọn B**, chỉ U1 | C để dữ liệu đứng → dự đoán sau sai (#3); A gây phiền. Chỉ gửi U1 vì đây là **yêu cầu hành động** (chỉ U1 ghi được), không phải che thông tin: U2 vẫn thấy trạng thái vì user chọn chia sẻ đầy đủ | Optimizer + Domain-Specialist | Reviewer chỉ ra veto "riêng tư" vô nghĩa khi U2 vẫn xem được → Orchestrator đổi lý do sang "yêu cầu hành động", giữ quyết định |
| NV7 | A: gửi ngay khi đủ điều kiện · B: chỉ 08:00–21:00 giờ VN | **Chọn B** | cron chạy theo UTC; không làm phiền ban đêm | Optimizer | — |
| Quyền | A: cả 2 cùng ghi/sửa · B: U1 ghi, U2 chỉ đọc | **Chọn B** (MVP) | 1 owner/dữ liệu (#1); tránh U2 vô tình sửa lịch sử của U1 | Orchestrator | User chọn "chia sẻ đầy đủ" = quyền **xem**; ghi hộ để phase 2 |

## 7. Scope & Priority
- **IN (MVP)**: NV1–NV9 (Must), NV10 (Should)
- **OUT (phase 2 / không làm)**: triệu chứng/tâm trạng/lượng máu theo ngày; cửa sổ rụng trứng / ngày dễ thụ thai; U2 ghi hộ; tắt chia sẻ riêng (không tắt theo dõi); dự đoán nhiều kỳ tới; xuất dữ liệu; nhắc uống thuốc; chế độ mang thai/tiền mãn kinh; mã hoá đầu-cuối

## 8. Success metric
| Nghiệp vụ | Metric | Ngưỡng đạt |
|---|---|---|
| NV2 | Số thao tác ghi bắt đầu kỳ (ngày hôm nay), kể cả khi quên ghi kết thúc kỳ trước | ≤ 2 thao tác |
| NV6 | Sai số \|dự đoán − start thực\| TB, sau ≥3 chu kỳ đã ghi | ≤ 3 ngày |
| NV7 | Nhắc "sắp tới" mỗi chu kỳ / người nhận đang bật | đúng 1 (0 trùng, 0 sót khi cron chạy bình thường) |
| NV8 | Tỷ lệ nhắc "quá ngày" dẫn tới ghi kỳ trong 3 ngày | ≥ 60% |
| NV5 | U2 thấy cùng dự đoán với U1 | 100% (cùng nguồn S2) |

## 9. Rules & Invariants
| # | Rule | Edge case |
|---|---|---|
| R1 | Chỉ U1 (chủ dữ liệu) tạo/sửa/xoá bản ghi & cấu hình của mình; U2 chỉ đọc | U2 gửi lệnh ghi → bị từ chối ở tầng dữ liệu, không chỉ ở client |
| R2 | Các kỳ không chồng lấn (tính theo end hiệu lực, R11); tối đa 1 kỳ đang mở / U1 | ghi start mới khi kỳ mở ≤ 10 ngày → từ chối; > 10 ngày → tự đóng kỳ cũ |
| R3 | start, end ≤ hôm nay (giờ VN); end ≥ start; độ dài kỳ ≤ 15 ngày | ghi lùi 1 năm vẫn hợp lệ nếu không chồng lấn |
| R4 | Chu kỳ dùng tính TB: 15–60 ngày; nếu ≥3 chu kỳ thì loại thêm > 1,6× trung vị; tối đa 6 gần nhất; làm tròn half-up | 0 chu kỳ hợp lệ → dùng độ dài thường trong cấu hình |
| R5 | Cửa sổ nhắc (giờ VN): "sắp tới" [dự đoán − lead, dự đoán − 1]; "tới ngày" [dự đoán, dự đoán + 2]; "quá ngày" ≥ dự đoán + 3. Mỗi loại gửi ≤ 1 lần / người nhận / chu kỳ; chu kỳ định danh bằng **id bản ghi kỳ gần nhất** | cron chạy nhiều lần/giờ; U1 sửa ngày start → không gửi lại; cron chết qua cả cửa sổ → không gửi bù |
| R6 | Nhắc chỉ gửi trong 08:00–21:00 giờ Asia/Ho_Chi_Minh; mọi "hôm nay" tính theo giờ VN | điều kiện đủ lúc 02:00 → gửi lúc ≥ 08:00 cùng ngày |
| R7 | Dự đoán & thống kê luôn suy ra từ dữ liệu hiện tại qua S2; U1 và U2 dùng cùng 1 nguồn | — |
| R8 | Nội dung thông báo không chứa chi tiết y tế, giọng nhẹ nhàng; dự đoán chỉ để tham khảo, **không phải biện pháp tránh thai** (hiển thị lưu ý này ít nhất ở NV1) | — |
| R9 | Dữ liệu chu kỳ chỉ 2 thành viên app đọc được; không public | — |
| R10 | lead_days ∈ [1, 7]; độ dài chu kỳ thường ∈ [21, 45]; số ngày hành kinh thường ∈ [2, 10] | lead = 7 với chu kỳ 21 → vẫn 1 nhắc/chu kỳ |
| R11 | End hiệu lực của kỳ mở: nếu mở ≤ 10 ngày → hôm nay; nếu > 10 ngày → start + số ngày hành kinh thường − 1 ("ước tính") | U1 ghi end thật sau đó → dùng giá trị thật |
| R12 | Cờ "chưa đều" khi max − min của các chu kỳ dùng tính > 7 ngày (cần ≥3 chu kỳ); số chu kỳ bị loại luôn được báo kèm | — |
| R13 | Tắt theo dõi: dừng mọi nhắc, giữ dữ liệu, U2 vẫn đọc lịch sử; bật lại → dùng dữ liệu cũ | — |

## 10. Acceptance Criteria — ORACLE

### AC-1 — Thiết lập lần đầu cho ra dự đoán  · Maps to flow: NV1  · Test: e2e
- **Given** U1 chưa bật theo dõi, hôm nay 2026-10-18
- **When** U1 bật theo dõi với kỳ gần nhất 2026-10-01, giữ mặc định (28 / 5 / 2)
- **Then** cấu hình bật, có 1 bản ghi kỳ start 2026-10-01 (end trống, hiệu lực 2026-10-05 theo R11), dự đoán kỳ tới 2026-10-29, tình trạng "ngày 18 của chu kỳ, còn 11 ngày"
- **Assert**: count(bản ghi của U1) == 1; end_date is null; effective_end == "2026-10-05"; next_start == "2026-10-29"; cycle_day == 18; days_until == 11; lead_days == 2

### AC-2 — Ghi bắt đầu kỳ hôm nay  · Maps to flow: NV2  · Test: e2e
- **Given** U1 đang theo dõi, không có kỳ mở, hôm nay 2026-10-28
- **When** U1 ghi bắt đầu kỳ với ngày mặc định
- **Then** có bản ghi mới start = 2026-10-28, end trống; tình trạng "đang hành kinh ngày 1"; dự đoán kỳ tới tính lại từ 2026-10-28
- **Assert**: count(bản ghi) tăng đúng 1; start_date == "2026-10-28"; end_date is null; status == "in_period"; period_day == 1

### AC-3 — Chặn kỳ thứ 2 khi kỳ đang mở còn mới  · Maps to flow: NV2  · Test: integration
- **Given** U1 có kỳ đang mở từ 2026-10-28, hôm nay 2026-10-30
- **When** ghi thêm 1 kỳ bắt đầu 2026-10-30
- **Then** bị từ chối, dữ liệu không đổi
- **Assert**: lệnh trả lỗi; count(bản ghi của U1) không đổi; count(kỳ mở) == 1

### AC-4 — Chặn ngày bắt đầu tương lai  · Maps to flow: NV2  · Test: integration
- **Given** hôm nay 2026-10-18 (giờ VN)
- **When** U1 ghi bắt đầu kỳ 2026-10-20
- **Then** bị từ chối
- **Assert**: lệnh trả lỗi; count(bản ghi) không đổi

### AC-5 — Ghi kết thúc kỳ & kiểm ràng buộc  · Maps to flow: NV3  · Test: integration
- **Given** kỳ đang mở từ 2026-10-28, hôm nay 2026-11-13
- **When** (a) ghi end 2026-11-02; (b) ở dữ liệu ban đầu, ghi end 2026-10-27; (c) ở dữ liệu ban đầu, ghi end 2026-11-12 (độ dài 16)
- **Then** (a) kỳ đóng, độ dài 6; (b), (c) bị từ chối
- **Assert**: (a) end_date == "2026-11-02" và period_length == 6, count(kỳ mở) == 0; (b)(c) trả lỗi, end_date vẫn null

### AC-6 — Dự đoán = TB các chu kỳ gần nhất  · Maps to flow: NV6  · Test: unit
- **Given** các kỳ bắt đầu 2026-05-01, 2026-05-30, 2026-06-28, 2026-07-28 (chu kỳ 29, 29, 30)
- **When** tính dự đoán
- **Then** độ dài TB 29 (29,33 làm tròn), kỳ tới 2026-08-26
- **Assert**: avg_cycle == 29; cycles_used == 3; next_start == "2026-08-26"

### AC-7 — Loại chu kỳ do bỏ sót 1 kỳ  · Maps to flow: NV6  · Test: unit
- **Given** các chu kỳ 28, 28, 56, 28 (56 do quên ghi 1 kỳ)
- **When** tính dự đoán
- **Then** chu kỳ 56 bị loại (> 1,6 × trung vị 28 = 44,8)
- **Assert**: avg_cycle == 28; cycles_used == 3; cycles_excluded == 1

### AC-8 — Chỉ dùng tối đa 6 chu kỳ gần nhất  · Maps to flow: NV6  · Test: unit
- **Given** 8 chu kỳ hợp lệ: 2 cũ nhất = 40, 6 gần nhất = 28
- **When** tính dự đoán
- **Then** chỉ 6 chu kỳ gần nhất được dùng
- **Assert**: cycles_used == 6; avg_cycle == 28

### AC-9 — Chưa có chu kỳ hoàn chỉnh thì dùng cấu hình  · Maps to flow: NV6  · Test: unit
- **Given** chỉ 1 bản ghi kỳ start 2026-10-01, độ dài chu kỳ thường = 30
- **When** tính dự đoán
- **Then** dùng 30 ngày
- **Assert**: cycles_used == 0; next_start == "2026-10-31"

### AC-10 — Trạng thái quá ngày & ngày dự kiến  · Maps to flow: NV6  · Test: unit
- **Given** dự đoán 2026-10-29, chưa có kỳ mới
- **When** tính trạng thái ngày 2026-11-02, rồi ngày 2026-10-29
- **Then** 11-02: quá ngày dự kiến 4 ngày; 10-29: hôm nay là ngày dự kiến
- **Assert**: (11-02) status == "overdue", days_overdue == 4; (10-29) status == "due_today", days_until == 0

### AC-11 — Cờ chưa đều  · Maps to flow: NV6  · Test: unit
- **Given** chu kỳ dùng tính: 24, 28, 33
- **When** tính thống kê
- **Then** cờ chưa đều bật (chênh 9 > 7)
- **Assert**: irregular == true; với 26, 28, 30 thì irregular == false

### AC-12 — Nhắc "sắp tới" gửi cả 2 người  · Maps to flow: NV7  · Test: integration
- **Given** dự đoán 2026-10-29, lead_days 2, U1 và U2 đang bật nhắc, mỗi người có 1 push subscription
- **When** cron chạy lúc 2026-10-27 08:05 giờ VN
- **Then** mỗi người nhận 1 thông báo loại "sắp tới" + 1 push, nội dung ghi "Còn 2 ngày"
- **Assert**: count(notifications type="period_upcoming", user=U1) == 1; user=U2 == 1; số push gửi == 2; body chứa "2 ngày"

### AC-13 — Không gửi trùng khi cron chạy lại  · Maps to flow: NV7  · Test: integration
- **Given** AC-12 đã chạy
- **When** cron chạy thêm 3 lần trong ngày 2026-10-27 và 1 lần lúc 2026-10-28 08:05
- **Then** không có nhắc "sắp tới" mới
- **Assert**: count(type="period_upcoming", user=U1) == 1; user=U2 == 1

### AC-14 — Nhắc "tới ngày dự kiến"  · Maps to flow: NV7  · Test: integration
- **Given** AC-12 đã chạy, dự đoán 2026-10-29, chưa có kỳ mới
- **When** cron chạy lúc 2026-10-29 08:05 giờ VN
- **Then** mỗi người nhận đang bật nhận 1 thông báo loại "tới ngày"
- **Assert**: count(type="period_due", user=U1) == 1; user=U2 == 1

### AC-15 — Không gửi ngoài khung giờ  · Maps to flow: NV7  · Test: integration
- **Given** dự đoán 2026-10-29, lead 2
- **When** cron chỉ chạy lúc 2026-10-27 06:30 và 21:30 giờ VN (không có lần chạy nào trong khung)
- **Then** không gửi gì
- **Assert**: count(type="period_upcoming") == 0 sau cả 2 lần chạy

### AC-16 — Kỳ tới sớm hủy nhắc chu kỳ cũ  · Maps to flow: NV7  · Test: integration
- **Given** dự đoán 2026-10-29, lead 2; U1 ghi bắt đầu kỳ 2026-10-26
- **When** cron chạy 2026-10-27 08:05 và 2026-10-29 08:05 giờ VN
- **Then** không có nhắc "sắp tới"/"tới ngày" nào (kỳ tới đã dời sang 2026-11-23)
- **Assert**: count(type in ("period_upcoming","period_due"), created theo giờ VN ∈ [2026-10-26, 2026-10-30]) == 0

### AC-17 — Nhắc "quá ngày" chỉ gửi U1, đúng 1 lần  · Maps to flow: NV8  · Test: integration
- **Given** dự đoán 2026-10-29, chưa có kỳ mới
- **When** cron chạy 2026-11-01 08:05, 2026-11-02 08:05, 2026-11-05 08:05
- **Then** U1 nhận đúng 1 nhắc "quá ngày" (ghi "3 ngày"); U2 không nhận
- **Assert**: count(type="period_late", user=U1) == 1; count(type="period_late", user=U2) == 0; body chứa "3 ngày"

### AC-18 — U2 đọc được, không ghi được  · Maps to flow: NV5  · Test: integration
- **Given** U1 có 3 bản ghi kỳ
- **When** U2 đọc dữ liệu chu kỳ của U1, rồi thử thêm / sửa / xoá 1 bản ghi của U1
- **Then** U2 đọc đủ 3 bản ghi + cùng dự đoán và trạng thái với U1; mọi lệnh ghi bị từ chối ở tầng dữ liệu
- **Assert**: count(bản ghi U2 đọc được) == 3; next_start(U2) == next_start(U1); status(U2) == status(U1); 3 lệnh ghi đều lỗi; count(bản ghi) vẫn == 3

### AC-19 — Dữ liệu tháng  · Maps to flow: NV5  · Test: e2e
- **Given** dữ liệu như AC-1 (kỳ 2026-10-01, hiệu lực tới 10-05, dự đoán 2026-10-29, số ngày hành kinh TB 5)
- **When** người xem (U1 hoặc U2) xem tháng 10/2026 rồi tháng 11/2026
- **Then** tháng 10: 5 ngày đã ghi (1–5, ước tính), 3 ngày dự đoán (29–31); tháng 11: 2 ngày dự đoán (1–2), không dự đoán kỳ sau nữa
- **Assert**: T10 logged_days == [1,2,3,4,5], estimated == true, predicted_days == [29,30,31]; T11 logged_days == [], predicted_days == [1,2]

### AC-20 — Sửa ngày bắt đầu tính lại dự đoán  · Maps to flow: NV4  · Test: integration
- **Given** dữ liệu AC-1 (dự đoán 2026-10-29)
- **When** U1 sửa start 2026-10-01 thành 2026-10-03
- **Then** dự đoán thành 2026-10-31
- **Assert**: next_start == "2026-10-31"

### AC-21 — Xoá bản ghi cuối cùng  · Maps to flow: NV4  · Test: integration
- **Given** U1 chỉ có 1 bản ghi
- **When** U1 xoá bản ghi đó, cron chạy ở ngày lẽ ra nhắc
- **Then** trạng thái "chưa có dữ liệu", không nhắc
- **Assert**: status == "no_data"; next_start is null; count(notifications type like "period_%") == 0

### AC-22 — Tắt theo dõi dừng mọi nhắc, giữ dữ liệu  · Maps to flow: NV9  · Test: integration
- **Given** U1 có 3 bản ghi, dự đoán 2026-10-29
- **When** U1 tắt theo dõi, cron chạy 2026-10-27 08:05
- **Then** không ai nhận nhắc, dữ liệu còn nguyên, U2 vẫn đọc được lịch sử
- **Assert**: count(type like "period_%") == 0; count(bản ghi) == 3; status(U2 đọc) == "not_tracking"; count(bản ghi U2 đọc được) == 3

### AC-23 — Đổi số ngày nhắc trước  · Maps to flow: NV9  · Test: integration
- **Given** dự đoán 2026-10-29
- **When** U1 đặt lead_days = 5, cron chạy 2026-10-24 08:05; sau đó U1 đặt lead_days = 9
- **Then** nhắc "sắp tới" gửi ngày 24 ghi "Còn 5 ngày"; giá trị 9 bị từ chối
- **Assert**: count(type="period_upcoming", user=U1, ngày 2026-10-24) == 1; body chứa "5 ngày"; lead_days vẫn == 5 sau lệnh đặt 9

### AC-24 — U2 tắt nhận nhắc  · Maps to flow: NV10  · Test: integration
- **Given** U2 tắt nhận nhắc chu kỳ, dự đoán 2026-10-29, lead 2
- **When** cron chạy 2026-10-27 08:05
- **Then** chỉ U1 nhận
- **Assert**: count(type="period_upcoming", user=U1) == 1; user=U2 == 0; U2 vẫn đọc được 100% bản ghi

### AC-25 — Kỳ quên ghi kết thúc  · Maps to flow: NV3  · Test: unit
- **Given** kỳ mở từ 2026-10-01, hôm nay 2026-10-18, số ngày hành kinh thường 5
- **When** tính thống kê & dữ liệu tháng
- **Then** kỳ đó được tính 5 ngày (ước tính); bản ghi gốc vẫn end trống
- **Assert**: effective_period_length == 5; T10 logged_days == [1,2,3,4,5]; end_date is null

### AC-26 — Cron lỡ cửa sổ "sắp tới" không gửi bù  · Maps to flow: NV7  · Test: integration
- **Given** dự đoán 2026-10-29, lead 2, cron không chạy ngày 27–28 (chưa có nhắc nào)
- **When** cron chạy 2026-10-29 lúc 08:05, 08:20, 12:00 giờ VN
- **Then** mỗi người nhận chỉ nhận 1 "tới ngày", không có "sắp tới"
- **Assert**: count(type="period_due", user=U1) == 1; user=U2 == 1; count(type="period_upcoming") == 0

### AC-27 — Sửa ngày start không gửi lại nhắc đã gửi  · Maps to flow: NV4  · Test: integration
- **Given** dữ liệu AC-1; "sắp tới" đã gửi lúc 2026-10-27 08:05 cho U1 và U2
- **When** U1 sửa start 2026-10-01 thành 2026-10-02 (dự đoán thành 2026-10-30), cron chạy 2026-10-28 08:05
- **Then** không gửi "sắp tới" lần 2
- **Assert**: count(type="period_upcoming", user=U1) == 1; user=U2 == 1

### AC-28 — Quên ghi kết thúc vẫn ghi được kỳ mới  · Maps to flow: NV2  · Test: e2e
- **Given** kỳ mở từ 2026-10-01 (chưa ghi end), số ngày hành kinh thường 5, hôm nay 2026-10-28
- **When** U1 ghi bắt đầu kỳ hôm nay
- **Then** kỳ cũ tự đóng tại 2026-10-05 (ước tính), kỳ mới tạo trong cùng thao tác
- **Assert**: kỳ cũ end_date == "2026-10-05" và is_estimated == true; count(bản ghi) == 2; count(kỳ mở) == 1; start kỳ mới == "2026-10-28"

### AC-29 — Sửa gây chồng lấn bị từ chối  · Maps to flow: NV4  · Test: integration
- **Given** 2 kỳ: 2026-09-03→09-07 và 2026-10-01→10-05
- **When** U1 sửa end kỳ 1 thành 2026-10-02
- **Then** bị từ chối (vừa chồng lấn vừa dài > 15 ngày), dữ liệu giữ nguyên
- **Assert**: lệnh trả lỗi; kỳ 1 end_date == "2026-09-07"

### AC-30 — Thiết lập với kỳ đã xa chỉ nhắc "quá ngày" cho U1  · Maps to flow: NV1  · Test: integration
- **Given** hôm nay 2026-10-18, U1 bật theo dõi với kỳ gần nhất 2026-09-15 (dự đoán 2026-10-13)
- **When** cron chạy 2026-10-18 lúc 08:05, 12:00 và 2026-10-19 08:05
- **Then** U1 nhận đúng 1 "quá ngày"; không ai nhận "sắp tới"/"tới ngày"
- **Assert**: count(type="period_late", user=U1) == 1; count(type in ("period_upcoming","period_due")) == 0

## 11. Assumptions / Open questions
- **Assumptions** (đã tự quyết, fail-closed):
  - "Chia sẻ đầy đủ" = U2 **xem** toàn bộ (kể cả trạng thái quá ngày); quyền **ghi** chỉ U1 (MVP).
  - Khung gửi nhắc 08:00–21:00 giờ VN; cron dùng lịch chạy hiện có của `remind`.
  - Ngưỡng: chu kỳ hợp lệ 15–60 + loại > 1,6× trung vị; ≤6 chu kỳ gần nhất; nhắc quá ngày ở +3; kỳ mở > 10 ngày dùng giá trị thường; "chưa đều" khi chênh > 7 ngày.
  - Không gửi thông báo khi U1 ghi/sửa bản ghi (tránh spam); U2 tự xem khi muốn.
  - Dữ liệu sức khoẻ lưu như các bảng khác (RLS), chưa mã hoá riêng.
- **Open (RED, cần chốt trước khi build)**: tạo bảng mới + RLS + sửa Edge Function `remind` là **RED** (ai-simple #06), sẽ hỏi trước khi chạy migration.

## History
- v1 (2026-10-18): khởi tạo MVP ghi kỳ + dự đoán + nhắc; chia sẻ xem cho người đồng hành.
- v2 (2026-10-18): sau review: cửa sổ nhắc đóng, khoá chu kỳ = id bản ghi, tự đóng kỳ quên kết thúc, lọc ngoại lệ theo trung vị, S2 là nguồn tính duy nhất, nội dung nhắc động; thêm AC-26..30.
