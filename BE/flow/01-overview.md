# Luồng triển khai Backend TaskMate (MVC + MongoDB)

## Mục tiêu

Xây dựng Backend API cho TaskMate dựa trên 3 collection từ dữ liệu trong `BE/data`:
- **users** (từ `users.json`) — tài khoản, đăng nhập, phân quyền
- **projects** (từ `projects.json`) — quản lý dự án
- **tasks** (từ `tasks.json`) — quản lý công việc theo dự án

Backend tuân thủ **MVC** (Model – View không dùng cho API, thay bằng Route/Controller), lưu trữ trên **MongoDB**.

---

## Nguồn dữ liệu

| File trong BE/data | Collection MongoDB | Ghi chú |
|--------------------|--------------------|--------|
| users.json         | users              | id, username, password (hash khi lưu), fullName, role, disabled |
| projects.json      | projects           | id, name, description, createdAt, updatedAt |
| tasks.json         | tasks              | id, projectId, title, description, status, priority, deadline, assigneeId, createdAt, updatedAt |

Quan hệ: **Task** thuộc **Project** (projectId), được gán cho **User** (assigneeId).

---

## Các bước triển khai (tóm tắt)

1. **Khởi tạo dự án & cấu trúc MVC** — framework (Node/Express hoặc tương đương), thư mục models / controllers / routes / config / middleware.
2. **Kết nối MongoDB & seed dữ liệu** — connection string, import 3 file JSON vào 3 collection.
3. **Models & Schema** — định nghĩa schema (Mongoose hoặc native driver) cho User, Project, Task.
4. **Authentication & Authorization** — login (username/password), JWT, middleware RBAC (ADMIN vs USER).
5. **API Projects** — CRUD project (Admin).
6. **API Users** — danh sách user, tạo user, bật/tắt user (Admin).
7. **API Tasks** — CRUD task, filter theo project/user/status, assignee (Admin full; User chỉ xem task được giao).
8. **Validation & Error handling** — validate body/query, format lỗi thống nhất.
9. **Testing & Documentation** — test API, tài liệu API (Postman/OpenAPI).

Chi tiết từng bước nằm trong các file đánh số trong `BE/flow/`.
