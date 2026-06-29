# Data Model (Phase 1): Đồng hồ cờ

Mở rộng các kiểu hiện có trong `src/types/room.ts` (không phá kiểu cũ).

## Entity: TimeControl (cấu hình của phòng)
Gắn vào `Room` khi tạo phòng; bất biến trong suốt ván (reset rematch giữ nguyên).

| Trường | Kiểu | Mô tả |
|---|---|---|
| `mode` | `"unlimited" \| "limited"` | `unlimited` = hành vi hiện tại (không đồng hồ). |
| `baseMs` | `number` | Thời gian cơ bản mỗi người (ms). Bỏ qua khi `unlimited`. |
| `incrementMs` | `number` | Cộng mỗi nước (ms, Fischer). 0 nếu không có. |

Quy ước hợp lệ: `mode="limited"` ⇒ `baseMs > 0`, `incrementMs >= 0`.

## Entity: ClockState (trạng thái runtime của ván)
Gắn vào `Room` (server). Chỉ tồn tại khi `timeControl.mode === "limited"`.

| Trường | Kiểu | Mô tả |
|---|---|---|
| `remainingMs` | `{ first: number; second: number }` | Thời gian còn lại mỗi bên. |
| `running` | `Side \| null` | Bên đang chạy đồng hồ; `null` khi chưa bắt đầu/đã kết thúc. |
| `turnStartedAt` | `number \| null` | Epoch ms thời điểm server bắt đầu tính cho lượt hiện tại. |

> Không lưu giá trị "đang đếm" theo từng giây — luôn suy ra từ `turnStartedAt` khi cần (xem research.md §2).

## Gắn vào kiểu hiện có

`Room` (server, `src/types/room.ts`) thêm:
```
timeControl: TimeControl;
clock?: ClockState;   // chỉ khi limited
```

`RoomSnapshot` (gửi client) thêm:
```
timeControl: TimeControl;
clock?: {
  remainingMs: { first: number; second: number };
  running: Side | null;
  serverNow: number;   // để client hiệu chỉnh lệch đồng hồ + nội suy
};
```

## Chuyển trạng thái (state transitions)
- **Tạo phòng**: `createRoom(gameType, hostSide, isPublic, timeControl)` → nếu `limited`, khởi tạo
  `clock.remainingMs = {base, base}`, `running = null`, `turnStartedAt = null`.
- **Nước đi đầu tiên hợp lệ**: bắt đầu đồng hồ đối thủ → `running = turn kế tiếp`, `turnStartedAt = now`.
- **Mỗi nước đi tiếp theo** (bên X vừa đi): `remainingMs[X] -= (now - turnStartedAt)`; nếu `> 0` thì
  `remainingMs[X] += incrementMs`; đổi `running` sang đối thủ; `turnStartedAt = now`.
- **Hết giờ** (`remainingMs[running] <= 0`): `running = null`; `result = { winner: đối thủ, reason: "timeout" }`;
  `status = "finished"`.
- **Kết thúc vì lý do khác** (chiếu hết/xin thua/hòa): `running = null` (dừng mọi đồng hồ).
- **Rematch**: đặt lại `remainingMs` theo `timeControl.baseMs`, `running = null`, `turnStartedAt = null`.

## Validation
- Quyết định timeout dựa trên `turnStartedAt` phía server (không tin client).
- `mode="unlimited"` ⇒ không tạo `clock`, snapshot không kèm `clock`; UI ẩn đồng hồ (tương thích ngược, FR-009).
