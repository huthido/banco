#!/usr/bin/env bash
# Hook mẫu — chạy sau khi Claude sửa file (event PostToolUse, matcher Edit|Write).
# Được tham chiếu từ ../settings.json (key "hooks").
#
# TRẠNG THÁI: NO-OP an toàn. Mặc định KHÔNG làm gì để tránh chạy lệnh ngoài ý muốn.
# Khi sẵn sàng, bỏ comment khối phù hợp với stack của bạn.
#
# Claude Code truyền dữ liệu hook qua STDIN dưới dạng JSON, gồm cả đường dẫn file bị sửa.
# Tài liệu: https://docs.claude.com/claude-code/hooks

set -euo pipefail

# Đọc payload JSON từ STDIN (đề phòng cần dùng tới).
payload="$(cat || true)"

# --- VÍ DỤ: format theo dự án (bỏ comment khi muốn bật) ---------------------
# Node/TS:   npx --no-install prettier --write . >/dev/null 2>&1 || true
# Python:    ruff format . >/dev/null 2>&1 || true
# Go:        gofmt -w . >/dev/null 2>&1 || true
# Rust:      cargo fmt >/dev/null 2>&1 || true
# ---------------------------------------------------------------------------

# Mặc định: không làm gì, thoát thành công để không chặn Claude.
exit 0
