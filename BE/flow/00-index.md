# Luồng triển khai Backend TaskMate (MVC + MongoDB)

Tài liệu mô tả **luồng triển khai** Backend và API cho TaskMate, dựa trên 3 file JSON trong `BE/data` (users, projects, tasks) và lưu trữ trên MongoDB. Không kèm code, chỉ nêu **cách làm** và **thứ tự** triển khai.

---

## Danh mục tài liệu

| File | Nội dung |
|------|----------|
| **01-overview.md** | Tổng quan, mục tiêu, nguồn dữ liệu, tóm tắt 9 bước |
| **02-project-structure-mvc.md** | Cấu trúc dự án theo MVC, stack gợi ý, cây thư mục, luồng request |
| **03-mongodb-connection-seed.md** | Kết nối MongoDB, seed dữ liệu từ 3 file JSON (users, projects, tasks) |
| **04-models-schema.md** | Model/Schema cho User, Project, Task (Mongoose) |
| **05-auth-and-rbac.md** | Đăng nhập (JWT), middleware auth, RBAC (ADMIN vs USER) |
| **06-api-design.md** | Thiết kế API: Auth, Projects, Users, Tasks (bảng method + path + mô tả) |
| **07-validation-error-handling.md** | Validation input, xử lý lỗi thống nhất |
| **08-testing-documentation.md** | Testing API, tài liệu API (Postman/OpenAPI) |

---

## Thứ tự triển khai đề xuất

1. **Cấu trúc dự án** (02) — tạo repo, thư mục, dependencies.
2. **MongoDB & Seed** (03) — kết nối DB, script seed từ 3 JSON.
3. **Models** (04) — định nghĩa schema User, Project, Task.
4. **Auth & RBAC** (05) — login, JWT, middleware auth + rbac.
5. **API** (06) — implement lần lượt: Auth → Projects → Users → Tasks.
6. **Validation & Error** (07) — validate request, error middleware.
7. **Testing & Doc** (08) — test API, viết tài liệu.

Đọc từ **01-overview.md** rồi lần lượt theo **02** → **08** khi implement.
