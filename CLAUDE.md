# CLAUDE.md — <Tên project>

> Mục tiêu: NGẮN GỌN (< 200 dòng, lý tưởng ~60). Chỉ ghi thứ Claude cần biết để làm việc đúng.
> Rule chi tiết tách ra `.claude/rules/` và import bên dưới.

## Project là gì
<Mô tả 1–2 câu: project làm gì, dành cho ai.>

## Lệnh thường dùng
- Cài đặt: `<vd. npm install>`
- Chạy dev: `<vd. npm run dev>`
- Test: `<vd. npm test>`  — luôn chạy test trước khi báo "đã xong".
- Lint/format: `<vd. npm run lint>`

## Quy ước cốt lõi
- Ngôn ngữ/stack: `<vd. TypeScript + React>`
- Style: tuân theo convention sẵn có trong code lân cận (đặt tên, comment, idiom).
- Không tự ý thêm dependency mới khi chưa hỏi.

## Khi làm việc
- Việc lớn → bắt đầu ở **plan mode**.
- Tra cứu cấu trúc code → ưu tiên **codegraph** (đã cấu hình global) hơn grep.
- Bắt buộc **chứng minh** thay đổi chạy được (chạy lệnh, dán output).

## Rules chi tiết (nạp theo nhu cầu)
@.claude/rules/architecture.md
@.claude/rules/patterns.md
