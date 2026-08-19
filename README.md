# BanCo — Chơi cờ trực tuyến

Tạo bàn cờ, mời đối thủ và người xem chỉ bằng một đường link. Chơi ẩn danh, thời gian thực.

## Tính năng (Giai đoạn 1)

- ✅ **Cờ caro (Gomoku)** 15×15 — đủ luật, phát hiện thắng 5 quân.
- ✅ **Cờ vua (Chess)** — luật đầy đủ qua `chess.js`: chọn quân → ô đích, gợi ý nước hợp lệ,
  highlight nước cuối & ô bị chiếu, xoay bàn theo phe, phong tốt tự thành Hậu, phát hiện
  chiếu hết/hết cờ/hòa.
- ✅ **Cờ tướng (Xiangqi)** 9×10 — đủ 7 loại quân (cung, sông, cản Mã, mắt Tượng, ngòi Pháo),
  **luật chuẩn** (cấm để Tướng mình bị chiếu, luật Tướng đối mặt), **phát hiện chiếu (cảnh báo) &
  chiếu bí (thắng ngay)**, hết nước đi cũng thua.
- ✅ **Cờ đam (Checkers)** 8×8 (luật Anh/Mỹ) — đi chéo, **ăn liên hoàn bắt buộc**, bắt buộc ăn
  khi có nước ăn, phong Hậu; thắng = đối thủ hết quân hoặc hết nước.
- ✅ **Cờ vây (Go)** 19×19 — đặt quân, bắt nhóm hết khí, **cấm tự sát**, **luật ko**, bỏ lượt;
  **bỏ lượt 2 lần → tính điểm theo vùng** (komi 6.5).
- ✅ Tạo bàn → **link mời đối thủ** (kèm token giành ghế) + **link mời người xem**.
- ✅ Realtime qua Socket.IO: đi quân, đổi lượt, kết quả, chat, lịch sử nước đi.
- ✅ **Đồng hồ cờ (time control)** — chọn mốc thời gian khi tạo bàn (1/3/5/10 phút, tùy chọn cộng
  giây mỗi nước); đồng hồ do **server làm chủ**, hết giờ là thua; hiển thị realtime cho người chơi &
  người xem (nổi bật bên tới lượt, cảnh báo khi <10s). Áp dụng cho mọi loại cờ. Xem
  [`specs/001-game-clock/`](specs/001-game-clock/) (đặc tả theo Spec Kit).
- ✅ **Thả cảm xúc trực tiếp** — người chơi & người xem bấm emoji (👍🔥😂😮❤️), bay lên trên
  bàn cờ realtime cho mọi người thấy (`reaction:send`/`reaction:burst`).
- ✅ **Nhắn tin trên bàn cờ** — 2 người chơi gửi tin nhanh (kèm câu mẫu), hiện thành bong bóng
  theo phe ngay trên bàn (tự ẩn sau ~6s); người xem cũng thấy (`board:say`/`board:message`).
- ✅ Vai trò tự động: 2 người chơi + nhiều người xem; chặn người xem đi quân.
- ✅ Xin thua / đánh lại (hoán phe) / reconnect giữ ghế (qua `playerId` ở localStorage).
- ✅ **Giao diện sáng/tối** — nút chuyển ở góc phải, nhớ lựa chọn + theo hệ thống, không nháy.
- ✅ **Bố cục mobile cố định bàn cờ** — trên điện thoại, bàn cờ luôn hiện phía trên (tự co
  vừa màn hình), nội dung phía dưới (người chơi, lịch sử nước, chat) cuộn riêng; áp dụng
  cho mọi loại cờ.
- ✅ **Lưu bàn cờ (IndexedDB)** — tự lưu ở trình duyệt; trang chủ có danh sách "Bàn cờ đã lưu"
  để **mở lại / mời lại / xoá**. Mở lại còn **tự khôi phục** ván trên server nếu server đã
  restart (in-memory) — gửi lại snapshot đã lưu để dựng lại đúng thế cờ.
- ✅ **Lịch sử ván đấu (IndexedDB)** — mỗi ván kết thúc tự lưu; trang chủ có "Lịch sử ván đấu"
  (thắng/thua/hòa, đối thủ, số nước) + trang **xem lại** `/replay/[id]` tua từng nước.
- ✅ **Trang hướng dẫn `/guide/[type]`** — mỗi loại cờ có trang giới thiệu, cách chơi, luật,
  và **cách di chuyển từng quân**; link từ trang chủ và trong phòng. Nội dung ở `src/content/guides.ts`.
- 🎯 Đủ **5 loại cờ** (caro, vua, tướng, đam, vây). Kiến trúc engine cắm-thêm — xem
  [`docs/ADDING_A_GAME.md`](docs/ADDING_A_GAME.md).

> Ghi chú luật rút gọn: Cờ vây tính điểm theo vùng **không tự nhận diện quân chết** (người
> chơi tự bắt hết trước khi bỏ lượt); Cờ tướng chơi theo **luật chuẩn** (không được để Tướng
> mình bị chiếu; chiếu bí hoặc hết nước đi là thua). Đủ dùng cho chơi giải trí.

## Công nghệ

Next.js (App Router) + TypeScript + Tailwind + Socket.IO. Trạng thái lưu **in-memory**
(chia sẻ qua `globalThis` giữa API route và socket server). Một custom server
(`server.ts`) chạy Next + Socket.IO trong cùng process.

## Chạy

```bash
npm install
npm run dev      # http://localhost:3000  (đặt PORT để đổi cổng)
```

Kiểm thử end-to-end socket: `node scripts/e2e.mjs` (cần server đang chạy ở cổng 3100).

## Deploy lên Coolify

Repo có sẵn `Dockerfile` (multi-stage). Trên Coolify:

1. Tạo resource mới → **Application** → nguồn là Git repo này.
2. **Build Pack: `Dockerfile`** (không dùng Nixpacks).
3. **Port (Ports Exposes): `3000`**. Coolify (Traefik) hỗ trợ **WebSocket** sẵn nên Socket.IO chạy tốt.
4. ⚠️ **Replicas = 1 (bắt buộc).** Trạng thái ván lưu **in-memory** (`globalThis`), không chia sẻ
   giữa nhiều instance — chạy >1 replica sẽ vỡ phòng/realtime.
5. Env (tuỳ chọn): `HOST=0.0.0.0` (mặc định trong image). Coolify tự cấp `PORT`.
6. Health check: endpoint **`/api/health`** trả `{"status":"ok"}` (200). Dockerfile đã có sẵn
   `HEALTHCHECK`; trong Coolify có thể đặt Health Check Path = `/api/health`.

Build & chạy thử bằng Docker tại máy:

```bash
docker build -t banco .
docker run -p 3000:3000 banco   # http://localhost:3000
```

> Lưu ý: app chạy production bằng `tsx server.ts` (custom server), nên `tsx` nằm trong
> `dependencies`. Ván đấu **không bền vững** khi container restart — nhưng client tự **khôi phục**
> bàn từ IndexedDB khi mở lại (xem mục Lưu bàn cờ). Muốn bền vững thật + scale nhiều instance
> thì cần thêm Redis adapter cho Socket.IO + lưu phòng ra Redis (chưa làm).

## Cấu trúc chính

| Đường dẫn | Vai trò |
|---|---|
| `server.ts` | Custom server ghép Next + Socket.IO |
| `src/func/` | Function dùng chung (id, link, board, validate, format) — re-export qua `index.ts` |
| `src/lib/games/` | `engine.ts` (interface) + `gomoku.ts` + `index.ts` (registry) |
| `src/lib/server/` | `rooms.ts` (kho phòng in-memory) + `socket.ts` (handlers) |
| `src/lib/client/useRoom.ts` | Hook kết nối + state phòng (tự lưu IndexedDB, gửi restore khi join) |
| `src/lib/client/savedBoards.ts` | IndexedDB: bàn cờ đang lưu + lịch sử ván đấu |
| `src/app/replay/[id]/` | Trang xem lại ván đấu (tua từng nước) |
| `src/lib/client/theme.ts` | Logic theme sáng/tối |
| `src/app/` | Trang chủ, `room/[id]`, `api/rooms` |
| `src/components/` | Board, sidebar, link mời, chat, lịch sử… |

## Thêm loại cờ mới

Xem hướng dẫn đầy đủ + quy tắc nhất quán (engine, responsive, dark mode, checklist):
**[`docs/ADDING_A_GAME.md`](docs/ADDING_A_GAME.md)**.

Tóm tắt:
1. Viết engine implement `GameEngine` trong `src/lib/games/<ten>.ts` (immutable, validate thuần).
2. Đăng ký `registry` + đặt `available: true` trong `GAME_CATALOG` (`src/lib/games/index.ts`).
3. Viết board trong `src/components/boards/` (container vuông responsive, hỗ trợ `canPlay=false`, có `dark:`).
4. Rẽ nhánh `gameType` trong `RoomClient.tsx` **và** `ReplayClient.tsx`.
