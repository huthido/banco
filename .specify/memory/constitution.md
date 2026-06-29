<!--
Sync Impact Report
- Version change: (chưa có) → 1.0.0
- Loại bump: MAJOR (phê chuẩn lần đầu)
- Nguyên tắc thêm mới: I. Realtime đáng tin cậy; II. Luật cờ đúng & kiểm thử được;
  III. Kiến trúc engine cắm-thêm; IV. Ẩn danh & chia sẻ bằng link; V. Đơn giản trước (YAGNI)
- Mục thêm: Ràng buộc kỹ thuật; Quy trình phát triển; Governance
- Template cần đồng bộ: plan-template.md ✅ (khớp), spec-template.md ✅ (khớp),
  tasks-template.md ✅ (khớp) — không yêu cầu mục bắt buộc mới
- TODO: không có
-->

# BanCo Constitution

Hiến pháp cho **BanCo** — nền tảng chơi cờ trực tuyến, realtime, ẩn danh (caro, vua, tướng, đam, vây).
Tài liệu này nêu các nguyên tắc bất biến mà mọi spec/plan/feature phải tuân theo.

## Core Principles

### I. Realtime đáng tin cậy (Reliable Realtime)
Server (in-memory, chia sẻ qua `globalThis`) là **nguồn chân lý duy nhất** của trạng thái ván.
Mọi thay đổi trạng thái (đi quân, đổi lượt, kết quả, chat, cảm xúc) MUST được đẩy qua Socket.IO
tới mọi client liên quan. Hệ thống MUST chịu được mất kết nối tạm thời: người chơi giữ ghế qua
`playerId`/token và khôi phục đúng thế cờ khi reconnect (kể cả khi server restart, dựng lại từ
snapshot client gửi lên).

### II. Luật cờ đúng & kiểm thử được (Correct, Testable Rules)
Logic luật của mỗi loại cờ MUST đúng như mô tả trong README/guide và MUST tách khỏi UI và lớp
transport (Socket.IO/HTTP), để kiểm thử thuần bằng dữ liệu vào/ra, không cần trình duyệt hay mạng.
Mọi sửa luật MUST kèm test tái hiện.

### III. Kiến trúc engine cắm-thêm (Pluggable Engines)
Thêm một loại cờ mới MUST không buộc sửa lõi điều phối ván/phòng. Mỗi engine tuân theo giao ước
chung (khởi tạo, nước hợp lệ, áp dụng nước, phát hiện kết thúc) như mô tả ở `docs/ADDING_A_GAME.md`.

### IV. Ẩn danh & chia sẻ bằng link (Anonymous, Link-Shared)
Không bắt buộc đăng nhập. Vào ván bằng **link mời** (kèm token giành ghế) hoặc **link người xem**.
Hệ thống MUST KHÔNG thu thập thông tin định danh cá nhân (PII). Vai trò (2 người chơi + nhiều người
xem) được gán tự động; người xem MUST bị chặn đi quân.

### V. Đơn giản trước (Simplicity / YAGNI)
Mặc định giữ trạng thái **in-memory**; chỉ thêm database hay dịch vụ ngoài khi có nhu cầu thực sự
và được biện minh. Lưu trữ phía người dùng dùng IndexedDB trên trình duyệt. Tránh phụ thuộc mới
khi giải pháp sẵn có còn đủ.

## Ràng buộc kỹ thuật

- Stack: **Next.js (App Router) + TypeScript + Tailwind + Socket.IO**, custom server `server.ts`
  chạy Next + Socket.IO trong cùng process.
- Trạng thái ván in-memory chia sẻ giữa API route và socket server qua `globalThis`.
- Engine cờ và nội dung hướng dẫn (`src/content/guides.ts`) tách biệt; UI không chứa luật cờ.
- TypeScript strict; không để lỗi `next lint`.

## Quy trình phát triển

- Feature lớn / cần đặc tả chặt → đi theo Spec Kit: `/speckit-specify → plan → tasks → implement`,
  tham chiếu hiến pháp này ở bước plan ("Constitution Check").
- Sửa nhỏ / bug fix → dùng command `plan-feature` (nhẹ) trong `.claude/`.
- Trước khi coi một thay đổi là "xong": chạy `npm run lint` và chứng minh kết quả.
- Tuân quy ước trong `.claude/rules/`.

## Governance

Hiến pháp này định hướng nội dung của mọi spec và plan; khi xung đột, hiến pháp thắng.
Sửa đổi MUST cập nhật số phiên bản theo SemVer (MAJOR: thay đổi/loại bỏ nguyên tắc không tương thích;
MINOR: thêm/ mở rộng nguyên tắc; PATCH: làm rõ câu chữ) và ghi lại ngày sửa. Mọi review feature
nên kiểm tra việc tuân thủ các nguyên tắc trên.

**Version**: 1.0.0 | **Ratified**: 2026-06-30 | **Last Amended**: 2026-06-30
