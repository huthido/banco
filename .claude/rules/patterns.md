# Rule: Convention code & test

> Mẫu rule convention. Sửa lại theo project thật. Được nạp qua import từ `CLAUDE.md`.

## Code style
- Tuân theo style của code lân cận (đặt tên, độ dày comment, idiom). Không áp style mới.
- Tên có ý nghĩa; tránh viết tắt khó hiểu.
- Không để lại `console.log`/debug print khi commit.

## Xử lý lỗi
- Không "nuốt" lỗi im lặng. Log hoặc ném lỗi có ngữ cảnh.
- Validate đầu vào ở ranh giới (API, form, hàm public).

## Testing
- Mỗi bug fix kèm 1 test tái hiện bug.
- Chạy test trước khi báo "đã xong"; dán output để chứng minh.
- Ưu tiên test nhanh, độc lập; tránh phụ thuộc trạng thái toàn cục.

## Commit
- Theo Conventional Commits (`feat:`, `fix:`, `refactor:`…). Xem skill `commit-helper`.
- Commit nhỏ, theo từng lát cắt dọc hoàn chỉnh.
