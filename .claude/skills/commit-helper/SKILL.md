---
name: commit-helper
description: Soạn commit message theo chuẩn Conventional Commits từ các thay đổi đang staged/working. Dùng khi người dùng muốn viết commit message, tạo changelog entry, hoặc chuẩn hóa lịch sử commit. Không tự chạy git commit trừ khi được yêu cầu rõ ràng.
---

# Commit Helper

Soạn commit message rõ ràng theo [Conventional Commits](https://www.conventionalcommits.org/).

## Quy trình
1. Xem thay đổi: `git diff --staged` (nếu trống thì `git diff`).
2. Xác định **loại** chính: `feat` | `fix` | `refactor` | `docs` | `test` | `chore` | `perf` | `style` | `build` | `ci`.
3. Xác định **scope** (tuỳ chọn): module/khu vực bị ảnh hưởng.
4. Viết **subject** ngắn (≤ 72 ký tự), thì hiện tại, không dấu chấm cuối.
5. Nếu thay đổi không tầm thường: thêm **body** giải thích *vì sao* (không chỉ *cái gì*).
6. Nếu có breaking change: thêm footer `BREAKING CHANGE: ...`.

## Định dạng đầu ra
```
<type>(<scope>): <subject>

<body — tuỳ chọn, giải thích lý do và ngữ cảnh>

<footer — tuỳ chọn: BREAKING CHANGE / refs #issue>
```

## Nguyên tắc
- Một commit = một mục đích logic. Nếu diff chứa nhiều việc, gợi ý tách commit.
- KHÔNG tự động `git commit` trừ khi người dùng yêu cầu rõ ràng — chỉ đề xuất message.
- Không thêm dòng đồng tác giả/tự quảng cáo trừ khi project yêu cầu.
