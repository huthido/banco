# Bộ khung `.claude/` — bản đồ thư mục

Đây là bộ khung mẫu theo best practice từ repo `shanraisshan/claude-code-best-practice`.
Mỗi file là một **ví dụ chạy được + placeholder** để bạn sửa lại cho project thật.
Xem tài liệu tổng quan ở `../HUONG-DAN-CLAUDE-CODE.md`.

| Đường dẫn | Vai trò | Cách bật/dùng |
|---|---|---|
| `../CLAUDE.md` | Memory chính của project | Tự nạp mỗi phiên; import rule qua `@path` |
| `rules/architecture.md` | Rule kiến trúc/layering | Được `CLAUDE.md` import |
| `rules/patterns.md` | Rule convention code & test | Được `CLAUDE.md` import |
| `agents/code-reviewer.md` | Subagent review diff (read-only) | Gọi qua Agent tool / FleetView |
| `commands/plan-feature.md` | Slash command `/plan-feature <mô tả>` | Gõ `/plan-feature ...` trong phiên |
| `skills/commit-helper/SKILL.md` | Skill soạn commit message | Claude tự gọi khi liên quan |
| `settings.json` | Settings + hook ở mức project | Áp dụng tự động trong thư mục này |
| `hooks/format.sh` | Script hook mẫu (no-op) | Được `settings.json` tham chiếu |

## Ghi chú quan trọng
- **Hooks** được khai báo trong `settings.json` (key `hooks`), trỏ tới script — KHÔNG phải file `.md`.
  Script `hooks/format.sh` hiện ở dạng **no-op an toàn**: nó không sửa gì cho tới khi bạn bỏ comment phần thực thi.
- **`.claude/rules/`** được nạp bằng cú pháp import `@.claude/rules/...` đặt trong `CLAUDE.md`
  (cách chắc chắn, không phụ thuộc plugin bên thứ ba).
- `settings.json` ở đây **chỉ áp dụng cho project** `D:\code\claude`, không ghi đè cấu hình global `~/.claude`.

## Cách kiểm tra nhanh
Mở một phiên Claude Code tại thư mục này rồi:
- Gõ `/` → thấy `plan-feature` trong danh sách command.
- Hỏi về việc review → agent `code-reviewer` khả dụng.
- Skill `commit-helper` xuất hiện trong danh sách skill.
