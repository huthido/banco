---
description: Khởi tạo nghiên cứu + kế hoạch cho một feature theo lát cắt dọc, trước khi viết code.
argument-hint: <mô tả feature>
allowed-tools: Read, Grep, Glob, Bash(git status:*), Bash(git log:*)
---

Tôi muốn lập kế hoạch cho feature sau (CHƯA viết code, hãy nghiên cứu rồi đề xuất kế hoạch):

**Feature:** $ARGUMENTS

## Ngữ cảnh hiện tại
- Trạng thái repo: !`git status --short 2>/dev/null || echo "(không phải git repo)"`
- Quy ước project: @CLAUDE.md

## Yêu cầu với kế hoạch
1. **Nghiên cứu trước**: tìm code/utility/pattern đã có liên quan tới feature này; nêu file:line.
   Ưu tiên tái sử dụng, tránh viết mới khi đã có sẵn.
2. **Lát cắt dọc**: chia kế hoạch thành các bước chạy được end-to-end (tracer bullet),
   không làm xong từng tầng ngang.
3. Mỗi bước có **cách kiểm chứng** (lệnh chạy / test).
4. Nêu rõ file sẽ sửa và rủi ro (blast radius) của thay đổi.
5. Hỏi lại tôi nếu có điểm chưa rõ thay vì giả định.

Trình bày kế hoạch ngắn gọn, dễ quét, đủ chi tiết để thực thi.
