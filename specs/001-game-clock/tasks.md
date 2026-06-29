# Tasks: Đồng hồ cờ (Time Control)

**Feature**: `001-game-clock` | **Date**: 2026-06-30
**Input**: [spec.md](./spec.md) · [plan.md](./plan.md) · [data-model.md](./data-model.md) · [contracts/socket-events.md](./contracts/socket-events.md) · [research.md](./research.md)

## Format: `[ID] [P?] [Story] Mô tả + đường dẫn file`
- **[P]**: có thể chạy song song (file khác nhau, không phụ thuộc task chưa xong).
- **[US#]**: thuộc user story tương ứng trong spec.md.
- Tests: chỉ thêm cho **logic đồng hồ thuần** (`clock.ts`) theo Hiến pháp — Nguyên tắc II.

---

## Phase 1: Setup (hạ tầng dùng chung)

- [x] T001 Thêm `vitest` vào devDependencies và script `"test": "vitest run"` trong `package.json`
- [x] T002 [P] Tạo cấu hình test tối thiểu (`vitest.config.ts`) và thư mục `tests/unit/`

---

## Phase 2: Foundational (chặn — phải xong trước mọi user story)

- [x] T003 Định nghĩa `TimeControl` & `ClockState`, mở rộng `Room` và `RoomSnapshot` trong `src/types/room.ts` (theo data-model.md)
- [x] T004 Tạo module đồng hồ thuần `src/lib/server/clock.ts`: `initClock(tc)`, `elapsed(now, clock)`, `switchTurn(clock, now)`, `isTimedOut(clock, now)` — **nhận `now()` tiêm vào để test tất định**, không phụ thuộc socket
- [x] T005 [P] Unit test logic đồng hồ trong `tests/unit/clock.test.ts`: đổi lượt, trừ thời gian đã trôi, phát hiện hết giờ (chưa gồm increment — ở US2)

**Checkpoint**: Có kiểu dữ liệu + logic đồng hồ test được → bắt đầu các user story.

---

## Phase 3: User Story 1 — Hết giờ là thua (Priority: P1) 🎯 MVP

**Mục tiêu**: Server đếm giờ theo lượt; quỹ thời gian về 0 ⇒ ván kết thúc, bên đó thua (`reason: "timeout"`), đẩy realtime.
**Independent Test**: Bàn 30s/người, để một bên hết giờ → ván kết thúc đúng kết quả ở cả 2 cửa sổ ≤ 1s (quickstart.md §1).

- [x] T006 [US1] Khởi tạo `clock` khi tạo phòng trong `createRoom()` tại `src/lib/server/rooms.ts` (chỉ khi `mode="limited"`)
- [x] T007 [US1] Cập nhật đồng hồ khi đi nước hợp lệ (trừ thời gian đã dùng, đổi bên) trong `src/lib/server/rooms.ts` (dùng `clock.ts`; phụ thuộc T004, T006)
- [x] T008 [US1] Đưa `clock` (+`serverNow`) vào `snapshotFor()` tại `src/lib/server/rooms.ts` (theo contracts §2)
- [x] T009 [US1] Trong handler `move:make` tại `src/lib/server/socket.ts`: gọi cập nhật đồng hồ, clear timeout cũ và **arm `setTimeout`** đúng `remainingMs` bên tới lượt (phụ thuộc T007)
- [x] T010 [US1] Khi timeout bắn: đặt `result = { winner: đối thủ, reason: "timeout" }`, dừng đồng hồ, emit snapshot trong `src/lib/server/socket.ts` (phụ thuộc T009). **Xử lý đua timeout↔move**: trước khi chốt, kiểm tra lại mốc thời gian server — nếu một nước đi hợp lệ đã được ghi nhận TRƯỚC thời điểm hết giờ thì ưu tiên nước đi, ngược lại ưu tiên timeout (FR-005)
- [x] T011 [US1] Dừng mọi đồng hồ khi ván kết thúc vì lý do khác (xin thua/chiếu hết/hòa) trong `src/lib/server/rooms.ts` + `socket.ts`
- [x] T012 [US1] Client đọc `clock` từ snapshot trong `src/lib/client/useRoom.ts` (chưa cần nội suy đẹp — đủ để quan sát kết quả)

**Checkpoint**: MVP chạy được — luật hết-giờ hoạt động end-to-end trên một loại cờ.

---

## Phase 4: User Story 2 — Cấu hình thời gian & increment (Priority: P2)

**Mục tiêu**: Người tạo bàn chọn không-giới-hạn / thời gian cơ bản / increment; reset đúng khi đánh lại.
**Independent Test**: Tạo bàn "3 phút + 2s/nước" → mỗi bên bắt đầu 3:00, sau mỗi nước bên vừa đi +2s (quickstart.md §2).

- [x] T013 [US2] Nhận tham số `timeControl` ở `POST /api/rooms` trong `src/app/api/rooms/route.ts` (theo contracts §1)
- [x] T014 [US2] UI chọn chế độ thời gian khi tạo bàn trong `src/components/CreateRoomButton.tsx` (mặc định "Không giới hạn")
- [x] T015 [US2] Cộng increment (Fischer) trong `switchTurn()` tại `src/lib/server/clock.ts` (phụ thuộc T004)
- [x] T016 [US2] Đặt lại `clock` theo `timeControl.baseMs` trong `resetForRematch()` tại `src/lib/server/rooms.ts`
- [x] T017 [P] [US2] Bổ sung unit test increment + reset rematch trong `tests/unit/clock.test.ts`

**Checkpoint**: US1 + US2 hoạt động độc lập; bật/tắt và tinh chỉnh thời gian được.

---

## Phase 5: User Story 3 — Hiển thị realtime (Priority: P3)

**Mục tiêu**: Hiển thị đồng hồ 2 bên mượt cho người chơi & người xem; nổi bật bên tới lượt; cảnh báo <10s.
**Independent Test**: Cửa sổ người chơi + người xem thấy cùng giá trị, lệch ≤1s; bên tới lượt được highlight (quickstart.md §3).

- [x] T018 [P] [US3] Tạo component `src/components/GameClock.tsx`: format `mm:ss`, đổi màu khi <10s
- [x] T019 [US3] Render đồng hồ 2 bên + highlight bên đang chạy trong `src/components/RoomClient.tsx` (phụ thuộc T012, T018)
- [x] T020 [US3] Nội suy đếm lùi phía client (hiệu chỉnh theo `serverNow`) trong `src/lib/client/useRoom.ts` (phụ thuộc T012)
- [x] T021 [US3] (Tùy chọn) Phát `clock:sync` định kỳ 5–10s cho người xem trong `src/lib/server/socket.ts` (theo contracts §5)

**Checkpoint**: Cả 3 user story hoạt động độc lập.

---

## Phase 6: Polish & Cross-Cutting

- [x] T022 [P] Xác nhận reconnect/khôi phục thời gian đúng (server-authoritative) — kiểm theo quickstart.md §4
- [x] T023 Cổng chất lượng: `npm run lint` của repo CHƯA cấu hình ESLint (hỏi tương tác, `next lint` deprecated) → thay bằng `tsc --noEmit` (sạch) + `next build` ("Linting and checking validity of types" PASS)
- [x] T024 Chạy toàn bộ kịch bản trong `quickstart.md` (6 kịch bản, gồm tương thích ngược §5 và 5/5 loại cờ §6)
- [x] T025 [P] Cập nhật README (ghi chú time control) trong `README.md`
- [x] T026 [P] Đo thời gian tạo bàn trước/sau khi thêm time control (xác minh **SC-004 ≤ +10%**); ghi kết quả vào `specs/001-game-clock/quickstart.md`

---

## Dependencies & Execution Order

- **Phase 1 (Setup)**: không phụ thuộc — làm ngay.
- **Phase 2 (Foundational)**: phụ thuộc Setup — **CHẶN mọi user story**. T004 là lõi (clock.ts).
- **Phase 3 US1 (P1)**: phụ thuộc Foundational. T006→T007→T008→T009→T010 theo chuỗi; T011, T012 song song được sau T008.
- **Phase 4 US2 (P2)**: phụ thuộc Foundational; độc lập US1 (trừ T015 tái dùng clock.ts).
- **Phase 5 US3 (P3)**: phụ thuộc T012 (US1) cho dữ liệu clock client.
- **Phase 6 (Polish)**: sau khi các user story mong muốn đã xong.

## Cơ hội chạy song song (ví dụ)
- Trong Foundational: T005 [P] (test) song song khi T004 đã có khung hàm.
- US3: T018 (GameClock) [P] làm song song với T020 (nội suy) vì khác file.

## Phạm vi MVP đề xuất
- **Chỉ Phase 1 + 2 + 3 (US1)** = MVP: bật bàn có giờ, hết giờ là thua, realtime. Đủ giá trị giao được.
- US2, US3 là tăng cường giao trong các vòng kế tiếp.

## Tổng kết
- **Tổng**: 26 task (T001–T026).
- **Theo story**: Setup 2 · Foundational 3 · US1 7 · US2 5 · US3 4 · Polish 5.
- **Test**: 2 task unit test cho `clock.ts` (Nguyên tắc II), không TDD toàn bộ.
- **Định dạng**: mọi task có checkbox + ID + (label story nếu thuộc story) + đường dẫn file.
