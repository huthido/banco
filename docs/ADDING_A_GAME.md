# Quy tắc thêm một loại cờ mới (nhất quán)

Kiến trúc đã tách rõ: **engine (luật)** ⟂ **server (phòng/realtime)** ⟂ **board (UI)**.
Thêm loại cờ mới = cắm 1 engine + 1 board renderer + đăng ký. KHÔNG sửa server/logic phòng.

Làm đúng 5 bước dưới đây và theo checklist cuối trang để giữ nhất quán.

---

## 1) Viết engine — `src/lib/games/<ten>.ts`

Implement interface `GameEngine<S, M>` (`src/lib/games/engine.ts`). S = kiểu GameState, M = kiểu nước đi.

**Hợp đồng (contract) bắt buộc:**
- `meta`: `{ type, name (tiếng Việt), boardCols, boardRows, sides: [tên phe 1, tên phe 2], description }`.
- `createInitialState()` → state ban đầu.
- `validateMove(state, move, side)` → `boolean`. **Thuần (pure), không side-effect.**
- `applyMove(state, move, side)` → **state MỚI (immutable)**. Luôn `slice()/spread`, không mutate tham số.
- `checkResult(state, lastMove)` → `GameResult | null` (`{ winner: Side | "draw", reason }`).
- `describeMove(move, side)` → nhãn ngắn tiếng Việt cho lịch sử (vd `"Đen B1"`).

**Quy ước:**
- Hai phe luôn là `"first"` (đi trước) và `"second"`. Map sang tên hiển thị qua `meta.sides`.
- Nước đi (`move`/`M`) phải **serialize được qua JSON** (đi qua socket + lưu IndexedDB). Dùng object đơn giản như `{ x, y }` hoặc `{ from, to }`.
- Tái dùng helper lưới ô vuông trong `src/func/board.ts`: `coordToIndex`, `inBounds`, `createGrid`, `countLine`, `LINE_DIRECTIONS`.
- Validate phòng thủ trong `validateMove` (kiểu dữ liệu + biên + đúng luật). Server LUÔN gọi `validateMove` trước `applyMove` — không tin client.

## 2) Đăng ký engine + bật trong catalog — `src/lib/games/index.ts`

- Thêm vào `registry`: `<type>: <tenEngine> as GameEngine`.
- Trong `GAME_CATALOG`, đổi mục tương ứng `available: false` → `true` (hoặc thêm mới nếu chưa có). Catalog là nguồn dữ liệu cho trang chủ, kết quả, replay — phải khớp `meta`.

> Server (`rooms.ts`/`socket.ts`) tự chạy với mọi loại đã đăng ký: tạo phòng, gán phe, validate, broadcast, khôi phục, lịch sử. **Không cần sửa.**

## 3) Viết board renderer — `src/components/boards/<Ten>Board.tsx`

Props chuẩn (giống `GomokuBoard`): `{ state, canPlay, onPlace }` (hoặc `onMove` cho cờ có chọn quân → ô đích).

**Bắt buộc về responsive (xem mục Responsive bên dưới):**
- Container **vuông co theo viewport**, KHÔNG dùng kích thước ô cố định (px).
- Quân/đánh dấu kích thước theo **%** của ô.
- `canPlay=false` → bàn chỉ xem (replay + người xem + chưa tới lượt). Nút ô `disabled` khi `!canPlay` hoặc ô không hợp lệ.
- Highlight nước đi cuối.

## 4) Nối vào UI — `RoomClient.tsx` và `ReplayClient.tsx`

Thêm nhánh theo `gameType` (đang là `if (snapshot.gameType === "gomoku")`):
```tsx
{snapshot.gameType === "<type>" && (
  <XiangqiBoard state={snapshot.state as XiangqiState} canPlay={youCanPlay} onPlace={...} />
)}
```
Làm tương tự trong `ReplayClient.tsx` (replay dùng `canPlay={false}`). Replay tự dựng lại thế cờ bằng `engine.applyMove` — chỉ cần board render được state.

## 5) Kiểm thử

- Thêm/chạy test socket như `scripts/e2e.mjs`: tạo phòng → 2 người chơi → đi sai lượt bị chặn → thắng/hòa phát hiện đúng.
- Chạy `npx tsc --noEmit` và `npm run build`.

---

## Responsive — quy tắc chung (áp dụng cho mọi UI & board)

Mobile-first; chỉ thêm `sm:` / `lg:` khi cần. Breakpoint dùng nhất quán: `lg` là ranh giới desktop.

**Board (quan trọng nhất):**
- Container: `w-[min(96vw,<MAX>px)]` (gomoku dùng 480) → mobile dùng ~toàn bề ngang, desktop có trần.
- Lưới: `display:grid` với `gridTemplateColumns/Rows: repeat(n, minmax(0,1fr))` và `aspectRatio: \`${cols} / ${rows}\``. KHÔNG đặt `h-7 w-7` cố định cho ô.
- Ô: `relative flex items-center justify-center` (kích thước do grid track quyết định).
- Quân/đánh dấu: dùng `%` (`h-[68%] w-[68%]`), không px.
- Kết quả: bàn tự co vừa màn 375px → không tràn ngang ở mọi thiết bị.

**Bố cục phòng (`RoomClient`):** ở `lg` khoá chiều cao (`lg:h-screen lg:overflow-hidden`), bàn cờ cố định canh giữa, **chỉ sidebar `lg:overflow-y-auto`** (cần `lg:min-h-0` trên hàng cha). Dưới `lg` thì xếp chồng, cuộn trang bình thường.

**Nút theme** cố định góc phải-trên → thanh tiêu đề mỗi trang chừa `pr-12` để không bị đè.

**Khác:** lưới thẻ `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`; hàng nút/thông tin `flex-col sm:flex-row`; text dài để `truncate`.

## Dark mode — quy tắc

`darkMode: "class"` (script chống nháy trong `layout.tsx`). **Mọi bề mặt có màu phải có biến thể `dark:`.** Bảng màu chuẩn:

| Vai trò | Sáng | Tối |
|---|---|---|
| Nền trang | `bg-slate-50` | `dark:bg-slate-900` |
| Thẻ/panel | `bg-white` | `dark:bg-slate-800` |
| Viền | `border-slate-200` | `dark:border-slate-700` |
| Input/vùng lõm | `bg-slate-50` | `dark:bg-slate-900` (hoặc `slate-700` cho input) |
| Chữ phụ | `text-slate-500/600` | `dark:text-slate-300/400` |
| Chữ mờ | `text-slate-400` | `dark:text-slate-500` |
| Nhấn (giữ) | emerald | emerald (thường không đổi) |

Bàn cờ tối: nền gỗ `dark:bg-[#5a3f20]`, đường kẻ `dark:bg-amber-100/25`, quân tối thêm viền `dark:ring-1 dark:ring-slate-400/50` để không lẫn nền.

---

## Checklist khi thêm bàn cờ mới

- [ ] Engine implement đủ 6 thành phần; `applyMove` immutable; `validateMove` thuần & phòng thủ.
- [ ] Nước đi serialize được qua JSON.
- [ ] Đăng ký `registry` + bật `available: true` trong `GAME_CATALOG` (khớp `meta`).
- [ ] Board: container vuông `w-[min(96vw,Npx)]` + grid `1fr` + `aspectRatio`; quân theo `%`; **không px cố định**.
- [ ] Board hỗ trợ `canPlay=false` (replay/xem); `disabled` đúng; highlight nước cuối.
- [ ] Mọi bề mặt có `dark:`.
- [ ] Thêm nhánh `gameType` trong `RoomClient.tsx` **và** `ReplayClient.tsx`.
- [ ] Thêm mục hướng dẫn trong `src/content/guides.ts` (giới thiệu, cách chơi, luật, di chuyển từng quân, điều kiện thắng) — trang `/guide/<type>` tự render.
- [ ] `npx tsc --noEmit` sạch, `npm run build` ok, test socket pass.
- [ ] Thử ở 375px / 768px / 1280px: không tràn ngang, bàn vừa màn hình; thử cả theme tối.
