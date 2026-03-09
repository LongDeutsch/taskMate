# Bước 9: Testing & Documentation

## Testing

- **API test:** Dùng Postman/Insomnia hoặc automated test (Jest + supertest).
- **Luồng kiểm tra:**
  1. Login với pm / admin123 → lấy token.
  2. Gọi lần lượt: GET projects, GET users, GET tasks (với token) → kiểm tra phân quyền (Admin thấy đủ).
  3. Login với user (ví dụ nguyenvana / 123456) → GET tasks → chỉ thấy task assign cho user đó.
  4. CRUD project, user, task (chỉ với token Admin); với token User → expect 403 cho POST/PUT/DELETE.
  5. Validation: gửi body thiếu/sai → expect 400.
- **Tùy chọn:** Viết test case cho từng route (login, projects CRUD, users, tasks) và chạy trong CI.

## Documentation

- **API doc:** Liệt kê từng endpoint (method, path, body/query, response mẫu, lỗi thường gặp).
- **Cách làm:**
  - File Markdown trong repo (ví dụ `BE/docs/API.md`) hoặc
  - OpenAPI/Swagger (file YAML/JSON + Swagger UI) để test trực tiếp.
- **Nội dung tối thiểu:** Base URL, bảng endpoint (như trong 06-api-design.md), ví dụ request/response, mô tả RBAC (ai được gọi endpoint nào).

## Thứ tự trong luồng tổng thể

Sau khi hoàn thành bước 1–8, chạy seed, test thủ công bằng Postman, rồi bổ sung test tự động và tài liệu API (bước 9). Khi có thay đổi API, cập nhật lại doc và test.
