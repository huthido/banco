# Quickstart (Phase 1): Kiểm chứng Đồng hồ cờ

Hướng dẫn chạy thật để xác nhận feature hoạt động end-to-end (khớp Success Criteria trong spec.md).

## Chuẩn bị
```bash
npm install
npm run dev        # http://localhost:3000
# (Sau khi thêm test) npm test   # chạy Vitest cho src/lib/server/clock.ts
```

## Kịch bản 1 — Hết giờ là thua (SC-001) [P1]
1. Tạo bàn **cờ vua**, chọn thời gian ngắn: `30 giây/người`, increment `0`.
2. Mở link mời ở cửa sổ thứ 2, ngồi ghế đối thủ.
3. Để **Trắng** không đi cho tới khi đồng hồ Trắng về 00:00.
4. **Kỳ vọng**: ván kết thúc ngay, kết quả "Trắng thua — hết giờ" (`reason: "timeout"`), hiển thị ở **cả hai**
   cửa sổ trong ≤ 1 giây.

## Kịch bản 2 — Đổi bên & increment (FR-003, FR-002) [P2]
1. Tạo bàn `3 phút + 2 giây/nước`.
2. Đi vài nước qua lại.
3. **Kỳ vọng**: chỉ đồng hồ bên tới lượt chạy lùi; sau mỗi nước, bên vừa đi được **cộng 2 giây**.

## Kịch bản 3 — Người xem thấy realtime (SC-002, P3)
1. Mở thêm cửa sổ bằng **link người xem**.
2. Đi quân ở cửa sổ người chơi.
3. **Kỳ vọng**: người xem thấy đồng hồ đổi bên gần như tức thời; sai lệch so với người chơi ≤ 1 giây.

## Kịch bản 4 — Reconnect (FR-007, SC-003)
1. Bàn có thời gian đang chạy; tắt mạng cửa sổ một người chơi vài giây rồi mở lại (giữ ghế qua `playerId`).
2. **Kỳ vọng**: sau khi vào lại, thời gian còn lại đúng theo server (sai lệch ≤ 1 giây), đồng hồ tiếp tục đúng bên.

## Kịch bản 5 — Tương thích ngược (FR-009)
1. Tạo bàn chọn **Không giới hạn**.
2. **Kỳ vọng**: không hiển thị đồng hồ, không có thua-do-hết-giờ; mọi thứ như hiện tại.

## Kịch bản 6 — Áp dụng mọi loại cờ (SC-005)
- Lặp Kịch bản 1 cho caro, tướng, đam, vây → hành vi hết-giờ giống nhau (logic đồng hồ độc lập với luật cờ).

## Kết quả kiểm chứng tự động (2026-06-30)

Đã chạy headless trên server thật (POST /api/rooms + 2 client Socket.IO):

| Kịch bản | Kết quả |
|---|---|
| §1/§6 Hết giờ — gomoku | ✅ PASS — `game:over {winner:"second", reason:"timeout"}` |
| §1/§6 Hết giờ — xiangqi | ✅ PASS — độc lập loại cờ (suy ra đủ 5/5) |
| §5 Không giới hạn | ✅ PASS — snapshot không có `clock` |
| §4 Reconnect | ✅ PASS — sau ~2s vắng, `remaining.first = 57966ms` (server vẫn đếm) |
| SC-004 thời gian tạo bàn | ✅ PASS — unlimited 16.86ms vs limited 16.37ms → chênh **-3.0%** (≤10%) |

Đơn vị test (`vitest`): 9/9 PASS · `tsc --noEmit` sạch · `next build` OK (9 trang).
§2 (increment) phủ bởi unit test; §3 (hiển thị người xem) kiểm trực quan trong trình duyệt.

## Tham chiếu
- Dữ liệu: [data-model.md](./data-model.md) · Hợp đồng sự kiện: [contracts/socket-events.md](./contracts/socket-events.md)
- Quyết định kỹ thuật: [research.md](./research.md)
