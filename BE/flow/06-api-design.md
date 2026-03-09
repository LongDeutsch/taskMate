# Bước 5–7: Thiết kế API (Projects, Users, Tasks)

## Quy ước chung

- Base path: `/api` (ví dụ `/api/auth/login`, `/api/projects`).
- Response thống nhất: `{ success, data?, message?, error? }`; HTTP status theo chuẩn (200, 201, 400, 401, 403, 404, 500).
- Protected route: header `Authorization: Bearer <accessToken>`.

---

## Auth

| Method | Path             | Mô tả           | Auth |
|--------|------------------|-----------------|------|
| POST   | /api/auth/login  | Login, trả token | Không |

---

## Projects (Admin)

| Method | Path                  | Mô tả              | Auth + RBAC   |
|--------|------------------------|--------------------|---------------|
| GET    | /api/projects          | Danh sách dự án    | Yes, ADMIN    |
| GET    | /api/projects/:id      | Chi tiết 1 dự án   | Yes, ADMIN    |
| POST   | /api/projects          | Tạo dự án          | Yes, ADMIN    |
| PUT    | /api/projects/:id      | Cập nhật dự án     | Yes, ADMIN    |
| DELETE | /api/projects/:id      | Xóa dự án (và task thuộc dự án?) | Yes, ADMIN |

---

## Users (Admin)

| Method | Path                | Mô tả                    | Auth + RBAC |
|--------|---------------------|---------------------------|-------------|
| GET    | /api/users          | Danh sách user            | Yes, ADMIN  |
| GET    | /api/users/:id      | Chi tiết user (để xem dự án/task) | Yes, ADMIN  |
| POST   | /api/users          | Tạo user (username, fullName, role=USER, password mặc định) | Yes, ADMIN  |
| PATCH  | /api/users/:id      | Bật/tắt disabled          | Yes, ADMIN  |

---

## Tasks

| Method | Path                  | Mô tả                                      | Auth + RBAC |
|--------|------------------------|--------------------------------------------|-------------|
| GET    | /api/tasks             | Danh sách task (filter: projectId, assigneeId, status; sort: deadline) | Yes; Admin: mọi task, User: chỉ assigneeId = mình |
| GET    | /api/tasks/:id         | Chi tiết 1 task                            | Yes; User chỉ xem nếu assigneeId = mình |
| POST   | /api/tasks             | Tạo task (projectId, title, description, status, priority, deadline, assigneeId) | Yes, ADMIN  |
| PUT    | /api/tasks/:id         | Cập nhật task                              | Yes, ADMIN  |
| DELETE | /api/tasks/:id         | Xóa task                                   | Yes, ADMIN  |

---

## Luồng triển khai API (thứ tự)

1. **Auth:** Implement login, trả JWT; middleware auth verify token.
2. **Projects:** CRUD + auth + rbac ADMIN.
3. **Users:** List, get by id, create, toggle disabled + auth + rbac ADMIN.
4. **Tasks:** List (với filter/sort, phân quyền Admin vs User), get by id, create, update, delete (Admin only).

Mỗi nhóm API: Route → Middleware (auth, rbac) → Controller → Model → Response.
