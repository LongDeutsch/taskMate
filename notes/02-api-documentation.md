# 2. API Documentation — TaskMate

Tài liệu được rút ra từ **BE** (`BE/src/app.js`, `BE/src/routes/*`) và **AI** (`AI/service.py`). Base path BE mặc định: `http://localhost:<PORT>` (thường `6969` trong `.env.example`).

**Quy ước response lỗi:** `errorHandler` trả JSON `{ success: false, message: "..." }` với HTTP status tương ứng (401/403/400/500…).

---

## 2.1. BE — Public

| Method | Path | Auth | Body / Query | Ghi chú |
|--------|------|------|----------------|---------|
| `POST` | `/api/auth/login` | Không | `{ "username": string, "password": string }` | `express-validator` bắt buộc username/password |
| `GET` | `/health` | Không | — | Kiểm tra DB + `usersCount` |

---

## 2.2. BE — Cần JWT (`Authorization: Bearer <token>`)

### Projects (ADMIN only — `router.use(requireRole("ADMIN"))`)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/projects` | — |
| `GET` | `/api/projects/:id` | — |
| `POST` | `/api/projects` | `{ "name": string, "description"?: string }` — `name` bắt buộc (validate) |
| `PUT` | `/api/projects/:id` | Theo controller |
| `DELETE` | `/api/projects/:id` | — |

### Users (ADMIN only)

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/users` | — |
| `GET` | `/api/users/:id` | — |
| `POST` | `/api/users` | `username` bắt buộc; `fullName`, `role` (ADMIN\|USER), `password` optional |
| `PATCH` | `/api/users/:id` | Toggle disabled (theo controller) |

### Tasks

| Method | Path | Auth / Role | Ghi chú |
|--------|------|-------------|---------|
| `GET` | `/api/tasks` | JWT | Query: `projectId`, `assigneeId`, `status` (xem controller) |
| `GET` | `/api/tasks/:id` | JWT | — |
| `POST` | `/api/tasks` | JWT + **ADMIN** | `projectId`, `title` bắt buộc; `status` ∈ Todo/InProgress/Done; `priority` ∈ Low/Medium/High; … |
| `PUT` | `/api/tasks/:id` | JWT + **ADMIN** | — |
| `DELETE` | `/api/tasks/:id` | JWT + **ADMIN** | — |

### Profile (mọi user đăng nhập)

| Method | Path | Ghi chú |
|--------|------|---------|
| `GET` | `/api/profile` | — |
| `PATCH` | `/api/profile` | JSON hoặc `multipart/form-data` (avatar — xem `uploadAvatar`) |

### AI (proxy tới service AI)

| Method | Path | Role | Body |
|--------|------|------|------|
| `POST` | `/api/ai/chat` | **ADMIN** (`req.user.role === "ADMIN"`) | `{ "message": string }` |

Response thành công: `{ success: true, data: { reply: string, meta?: object } }`.

---

## 2.3. AI — FastAPI (thường chỉ BE gọi)

| Method | Path | Auth | Body | Response |
|--------|------|------|------|----------|
| `POST` | `/chat` | Không (trong code hiện tại) | `{ "message": string }` | `{ "reply": string, "meta": { "classification": ... } }` |

**CORS:** `allow_origins=["*"]` trong `service.py` — production nên thu hẹp theo domain FE.

---

## 2.4. Postman Collection (tùy chọn)

File: **taskmate-api.postman_collection.json** (cùng thư mục `notes/`).

Import vào Postman:

1. **Import** → chọn file `taskmate-api.postman_collection.json`.
2. Tạo **Environment** với biến:
   - `baseUrl` = `http://localhost:6969` (hoặc URL Render BE).
   - `token` = để trống sau khi chạy **Auth → Login**.
3. Sau **Login**, copy `token` từ response vào biến `token` (hoặc dùng script **Tests** trong Postman để `pm.environment.set("token", json.data.token)` nếu bạn bổ sung).

Collection mẫu gồm: Health, Login, Projects list, Tasks list, AI chat (cần ADMIN token).
