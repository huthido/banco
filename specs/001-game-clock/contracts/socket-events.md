# Contracts (Phase 1): Socket.IO & API cho Đồng hồ cờ

Dựa trên các sự kiện hiện có trong `src/lib/server/socket.ts`
(`room:join`, `move:make`, `game:resign`, `game:rematch`, `chat:send`, `reaction:send`, `board:say`).
Thiết kế **tương thích ngược**: client/máy chủ cũ bỏ qua field `clock` vẫn chạy ở chế độ `unlimited`.

## 1. Tạo phòng — `POST /api/rooms` (`src/app/api/rooms/route.ts`)
Thêm tham số `timeControl` vào body:
```jsonc
// Request body (thêm)
{ "gameType": "chess", "timeControl": { "mode": "limited", "baseMs": 300000, "incrementMs": 3000 } }
// mode="unlimited" hoặc bỏ trống => hành vi như hiện tại (không đồng hồ)
```

## 2. Snapshot phòng — server → client
`RoomSnapshot` (trả khi `room:join` và sau mỗi thay đổi) thêm:
```jsonc
{
  // ...các field hiện có...
  "timeControl": { "mode": "limited", "baseMs": 300000, "incrementMs": 3000 },
  "clock": {
    "remainingMs": { "first": 287400, "second": 300000 },
    "running": "first",        // bên đang đếm, hoặc null
    "serverNow": 1750000000000 // mốc đồng hồ server để client hiệu chỉnh
  }
}
```
Khi `timeControl.mode === "unlimited"`: **không** kèm `clock`.

## 3. Đi nước — `move:make` (client → server)
Payload **không đổi**. Hệ quả phía server (mới):
- Cập nhật `clock` theo data-model (trừ thời gian bên vừa đi, cộng increment, đổi bên).
- Phát lại snapshot kèm `clock` mới cho mọi người trong phòng.

## 4. Hết giờ — server → client (MỚI, dùng kênh kết thúc sẵn có)
Không cần event mới: tái dùng cơ chế phát `result` trong snapshot.
- Khi timeout, server emit snapshot với:
```jsonc
{ "status": "finished", "result": { "winner": "second", "reason": "timeout" }, "clock": { "running": null, ... } }
```
- `reason: "timeout"` (kiểu `GameResult.reason` đã là `string` ⇒ không đổi kiểu).

## 5. (Tùy chọn) Đồng bộ nhẹ định kỳ — `clock:sync` (server → người xem)
Để người xem mượt mà mà không spam: server có thể phát `clock:sync` mỗi 5–10s **chỉ** khi có đồng hồ đang chạy:
```jsonc
// event: "clock:sync"
{ "remainingMs": { "first": 240120, "second": 251000 }, "running": "first", "serverNow": 1750000005000 }
```
Client nội suy giữa các lần sync. Bỏ qua được nếu muốn giữ tối giản (snapshot theo nước đi là đủ cho 2 người chơi).

## Bất biến hợp đồng
- Mọi quyết định thắng/thua do hết giờ là **server-side**; client chỉ hiển thị.
- Thiếu `clock`/`timeControl` ⇒ hiểu là `unlimited` (tương thích ngược).
