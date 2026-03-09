# Bước 8: Validation & Error handling

## Validation

- **Vị trí:** Trước khi vào controller (middleware validate) hoặc ngay đầu từng action trong controller.
- **Nội dung cần validate:**
  - **Login:** username, password có tồn tại và format (length, ký tự đặc biệt nếu có quy định).
  - **Project:** name required; description optional.
  - **User (tạo):** username (unique), fullName, password (nếu tạo mới).
  - **Task:** projectId, title required; status, priority, deadline, assigneeId theo enum/format.
- **Công cụ:** Joi, Zod, express-validator (chọn một).
- **Kết quả:** Nếu invalid → trả 400 với message lỗi rõ ràng (từ validator), không gọi model.

## Error handling thống nhất

- **Central error middleware:** Middleware 4 tham số `(err, req, res, next)` đặt cuối app.
  - Phân loại lỗi: validation (400), unauthorized (401), forbidden (403), not found (404), lỗi DB/server (500).
  - Trả JSON thống nhất: `{ success: false, message?, error? }` (không lộ stack trace ra production).
- **Trong controller:** Gọi next(err) khi gặp lỗi (ví dụ user không tìm thấy → next(createNotFoundError())) thay vì res.status(...).json(...) rải rác.

## Luồng request có lỗi

1. Validate input → fail → 400, không vào controller.
2. Auth middleware → fail → 401.
3. RBAC middleware → fail → 403.
4. Controller/Model → lỗi (ví dụ document không tồn tại) → next(err) → error middleware → 404 hoặc 500 tùy loại.
