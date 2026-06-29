# Implementation Plan: Đồng hồ cờ (Time Control)

**Branch**: `001-game-clock` | **Date**: 2026-06-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-game-clock/spec.md`

## Summary

Thêm giới hạn thời gian (time control) cho mọi ván cờ của BanCo: mỗi người chơi có một quỹ thời gian,
đồng hồ của người tới lượt chạy lùi, hết giờ là thua. Cách tiếp cận: **đồng hồ do server làm chủ**
(server in-memory là nguồn chân lý), client chỉ hiển thị bằng cách nội suy giữa các lần đồng bộ. Logic
đồng hồ độc lập với luật từng loại cờ nên dùng chung cho cả 5 engine. Cấu hình thời gian gắn vào phòng
lúc tạo; trạng thái đồng hồ nằm trong `Room` và được đưa vào `RoomSnapshot` đẩy qua Socket.IO.

## Technical Context

**Language/Version**: TypeScript 5.x, Node.js (chạy qua `tsx`), React 18 / Next.js (App Router)

**Primary Dependencies**: Next.js, Socket.IO (`socket.io` + `socket.io-client`), `chess.js` (chỉ engine cờ vua), `nanoid`

**Storage**: In-memory phía server (chia sẻ qua `globalThis`); IndexedDB phía client cho lưu/lịch sử. Không thêm DB.

**Testing**: Chưa có hạ tầng test trong repo → đề xuất thêm **Vitest** cho unit test logic đồng hồ thuần (NEEDS CLARIFICATION đã giải ở research.md).

**Target Platform**: Trình duyệt web (realtime), một custom Node server (`server.ts`) chạy Next + Socket.IO cùng process.

**Project Type**: Web application (frontend + realtime backend trong cùng repo Next.js).

**Performance Goals**: Kết quả hết-giờ tới mọi client ≤ 1s (SC-001); sai lệch đồng hồ client↔server ≤ 1s (SC-002); không spam sự kiện realtime.

**Constraints**: Quyết định thắng-thua do hết giờ phải dựa trên đồng hồ **server**; tần suất đồng bộ thấp (vd 1–2s/lần) + nội suy client; tương thích ngược chế độ "không giới hạn".

**Scale/Scope**: Phòng 1v1 + nhiều người xem; áp dụng cho 5/5 loại cờ; thay đổi khu trú ở lớp server state + socket + UI bàn cờ.

## Constitution Check

*GATE: Phải đạt trước Phase 0. Soát lại sau Phase 1.*

| Nguyên tắc | Đánh giá |
|---|---|
| I. Realtime đáng tin cậy | ✅ Server là nguồn chân lý của đồng hồ; reconnect/khôi phục tính đúng thời gian đã trôi (FR-005/007). |
| II. Luật cờ đúng & test được | ✅ Logic đồng hồ tách khỏi engine cờ và transport → unit test thuần; không đụng luật từng loại cờ. |
| III. Engine cắm-thêm | ✅ Đồng hồ ở lớp phòng/điều phối, **không** sửa giao ước engine ⇒ không ảnh hưởng việc thêm cờ mới. |
| IV. Ẩn danh & link | ✅ Không thêm dữ liệu định danh; cấu hình thời gian chỉ là tham số phòng. |
| V. Đơn giản trước (YAGNI) | ✅ Giữ in-memory; không thêm DB/dịch vụ; chỉ thêm vài trường vào `Room`/`RoomSnapshot`. |

**Kết luận**: Không vi phạm — Complexity Tracking để trống.

## Project Structure

### Documentation (this feature)

```text
specs/001-game-clock/
├── plan.md              # File này
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1
├── contracts/           # Phase 1
│   └── socket-events.md
└── tasks.md             # Phase 2 (do /speckit-tasks tạo — chưa có)
```

### Source Code (repository root) — file thật sẽ chạm

```text
src/
├── types/
│   ├── room.ts          # + TimeControl, ClockState vào Room & RoomSnapshot
│   └── game.ts          # GameResult.reason = "timeout" (đã là string, không đổi kiểu)
├── lib/
│   ├── server/
│   │   ├── rooms.ts     # createRoom(timeControl), switch đồng hồ khi đi nước, reset khi rematch, snapshotFor(+clock)
│   │   ├── socket.ts    # move:make → cập nhật đồng hồ; bộ đếm/kiểm tra hết giờ; emit khi timeout
│   │   └── clock.ts     # MỚI: logic đồng hồ thuần (tick/elapsed/switch/timeout) — test được, không phụ thuộc socket
│   └── client/
│       └── useRoom.ts   # nhận clock trong snapshot; nội suy đếm lùi phía client
├── components/
│   ├── CreateRoomButton.tsx  # chọn chế độ thời gian khi tạo bàn
│   ├── RoomClient.tsx        # render đồng hồ 2 bên, highlight bên tới lượt, cảnh báo <10s
│   └── GameClock.tsx         # MỚI: component hiển thị 1 đồng hồ
└── app/api/rooms/route.ts    # nhận tham số timeControl khi tạo phòng

tests/                         # MỚI (Vitest)
└── unit/clock.test.ts         # test logic clock.ts (switch, elapsed, timeout, increment)
```

**Structure Decision**: Giữ nguyên kiến trúc web hiện có. Tách **`src/lib/server/clock.ts`** làm logic
đồng hồ thuần (theo Nguyên tắc II) để unit test không cần socket; `rooms.ts`/`socket.ts` chỉ gọi vào đó.
UI thêm `GameClock.tsx` dùng lại trong `RoomClient.tsx`.

## Complexity Tracking

> Không có vi phạm Constitution — bảng để trống.

## Phases (tóm tắt; chi tiết ở các artifact)

- **Phase 0 — Research** → [research.md](./research.md): chốt mô hình đồng hồ server-authoritative, chiến lược
  đồng bộ + nội suy, cơ chế phát hiện timeout, xử lý reconnect/restart, lựa chọn test runner.
- **Phase 1 — Design & Contracts**:
  - [data-model.md](./data-model.md): `TimeControl`, `ClockState` và cách gắn vào `Room`/`RoomSnapshot`.
  - [contracts/socket-events.md](./contracts/socket-events.md): thay đổi payload `room:join`/snapshot, thêm
    đồng bộ đồng hồ và sự kiện kết thúc do hết giờ; tạo phòng nhận `timeControl`.
  - [quickstart.md](./quickstart.md): kịch bản chạy thật để kiểm chứng (hết giờ, increment, reconnect).
- **Phase 2 — Tasks**: do `/speckit-tasks` sinh `tasks.md` (chưa thuộc bước này).

## Done When (cho /speckit-plan)
- [x] Technical Context điền đầy đủ (NEEDS CLARIFICATION đã giải ở research.md)
- [x] Constitution Check đạt (không vi phạm)
- [x] Artifact Phase 0 & Phase 1 đã sinh
