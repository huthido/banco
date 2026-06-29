# Rule: Kiến trúc & phân tầng

> Mẫu rule kiến trúc. Sửa lại theo project thật. Được nạp qua import từ `CLAUDE.md`.

## Phân tầng (ví dụ)
- `ui/` — chỉ trình bày; không gọi thẳng DB/API ngoài.
- `domain/` — logic nghiệp vụ thuần, không phụ thuộc framework.
- `infra/` — DB, HTTP client, hệ thống ngoài.
- Quy tắc phụ thuộc: `ui → domain → infra`. KHÔNG cho `domain` import `ui`.

## Nguyên tắc
- Một module = một trách nhiệm. Tránh "file tạp nham".
- Đặt code mới cạnh code cùng loại; tái sử dụng utility sẵn có trước khi viết mới.
- Thay đổi public API → kiểm tra blast radius (dùng `codegraph_impact` nếu có index).

## Khi thêm tính năng
- Ưu tiên **lát cắt dọc** (UI → domain → infra cho 1 use case) thay vì làm xong từng tầng.
