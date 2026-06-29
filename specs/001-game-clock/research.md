# Research (Phase 0): Đồng hồ cờ

Giải quyết các điểm "NEEDS CLARIFICATION" và chốt phương án kỹ thuật.

## 1. Mô hình đồng hồ: server-authoritative
- **Decision**: Server giữ thời gian còn lại của mỗi bên + mốc `turnStartedAt`; chỉ server quyết định hết giờ.
- **Rationale**: Nguyên tắc I (server là nguồn chân lý); chống gian lận/đồng hồ client lệch (FR-005).
- **Alternatives**: Đồng hồ client-authoritative → loại vì không tin cậy và dễ gian lận.

## 2. Cách tính thời gian đã trôi
- **Decision**: Không tick mỗi giây trên server. Lưu `remainingMs[side]` + `turnStartedAt` (epoch ms). Khi có
  sự kiện (đi nước, kiểm tra timeout, snapshot), tính `elapsed = now - turnStartedAt` rồi suy ra thời gian còn lại
  của bên đang chạy.
- **Rationale**: Đơn giản, chính xác, không tốn CPU; hợp Nguyên tắc V.
- **Alternatives**: `setInterval` 1s/phòng → tốn tài nguyên, vẫn cần hiệu chỉnh theo đồng hồ thực ⇒ loại.

## 3. Phát hiện hết giờ (timeout) kịp thời
- **Decision**: Đặt **một** `setTimeout` cho mỗi lượt = đúng `remainingMs` của bên đang chạy. Khi đi nước:
  clear timeout cũ, đổi bên, đặt timeout mới. Timeout bắn → server tính lại, kết thúc ván `result = {winner: đối thủ, reason: "timeout"}`, emit snapshot.
- **Rationale**: Bắn đúng thời điểm (đáp ứng SC-001 ≤1s) mà không cần polling.
- **Alternatives**: Polling/interval kiểm tra → trễ hoặc tốn tài nguyên ⇒ loại. Vẫn kiểm tra lại mốc thời gian khi
  có nước đi để chống lệch.

## 4. Đồng bộ hiển thị phía client
- **Decision**: Snapshot chứa `clock` (remaining + bên đang chạy + `serverNow`). Client nội suy đếm lùi cục bộ;
  đồng bộ lại mỗi lần có snapshot (đi nước, join) và thêm một nhịp đồng bộ nhẹ định kỳ (vd 5–10s) cho người xem.
- **Rationale**: Mượt mà, sai lệch ≤1s (SC-002) mà không spam sự kiện (FR-006).
- **Alternatives**: Server đẩy mỗi giây → ngập sự kiện với nhiều người xem ⇒ loại.

## 5. Reconnect & server restart
- **Decision**: Vì tính theo `turnStartedAt`, reconnect chỉ cần gửi lại snapshot là đúng (FR-007). Khi khôi phục
  từ snapshot client sau restart: phục hồi `remainingMs` và đặt lại `turnStartedAt = now` (chấp nhận "đủ tốt" —
  độ chính xác tuyệt đối sau restart ngoài phạm vi v1, theo Assumptions trong spec).
- **Rationale**: Hợp Nguyên tắc I & V; tránh phức tạp hóa cho trường hợp hiếm.

## 6. Increment (cộng giây mỗi nước)
- **Decision**: Kiểu Fischer — cộng `incrementMs` vào bên vừa đi **sau** khi trừ thời gian đã dùng cho nước đó.
- **Rationale**: Chuẩn phổ biến, dễ hiểu.

## 7. Test runner
- **Decision**: Thêm **Vitest** (nhẹ, hợp Vite/TS) chỉ để unit test `src/lib/server/clock.ts` (hàm thuần).
- **Rationale**: Repo chưa có test; Nguyên tắc II yêu cầu logic test được. Tiêm `now()` để test tất định.
- **Alternatives**: Jest → nặng cấu hình hơn cho TS/ESM ⇒ chọn Vitest.

## Tổng hợp
Tất cả NEEDS CLARIFICATION đã giải. Không phát sinh vi phạm Constitution. Sẵn sàng Phase 1.
