# 4. Security Best Practices — TaskMate

Nội dung bám theo cách triển khai hiện tại trong **BE**, **FE**, **AI** và các file `.env.example`.

---

## 4.1. Environment variables

| Nguyên tắc | Chi tiết |
|------------|----------|
| **Không commit secret** | `.env` đã gitignore; chỉ commit `.env.example` với placeholder (không điền key thật). |
| **Phân tách môi trường** | Local / Render / Vercel: mỗi nơi cấu hình env riêng; không đồng bộ file `.env` qua Git. |
| **FE (Vite)** | Chỉ `VITE_*` được embed vào bundle — **không** đặt secret server-side (DB password, JWT secret) vào `VITE_*`. |
| **BE** | `MONGODB_URI`, `JWT_SECRET`, `AGENT_URL` chỉ trên server. |
| **AI** | `OPENAI_API_KEY`, `MONGODB_URI` — trên Render/Python; không hardcode trong repo. |
| **Rotate** | Đổi `JWT_SECRET` trên production sẽ vô hiệu mọi JWT cũ — user phải đăng nhập lại. |

---

## 4.2. JWT token management

| Thực hành trong code | Ghi chú |
|----------------------|---------|
| **Ký** | `jwt.sign({ userId, username, role }, JWT_SECRET, { expiresIn })` — `authController.js`. |
| **Verify** | `authMiddleware`: `jwt.verify(token, JWT_SECRET)`; lỗi → 401. |
| **Lưu phía client** | `localStorage` (`taskmate_token`) — tiện cho SPA nhưng dễ bị XSS đọc token; cân nhắc `httpOnly` cookie + CSRF nếu nâng cấp bảo mật. |
| **Gửi request** | `Authorization: Bearer <token>` — `FE/src/shared/api/client.ts`. |
| **Hết hạn** | `JWT_EXPIRES` (mặc định `1d`); user thấy `"Invalid or expired token"` khi hết hạn hoặc đổi secret. |
| **RBAC** | `requireRole("ADMIN")` cho route nhạy cảm; AI chat kiểm tra `role === "ADMIN"` trong controller. |

---

## 4.3. Input validation & sanitization

| Lớp | Cách làm trong code |
|-----|---------------------|
| **express-validator** | `authRoutes`: `username`, `password`; `taskRoutes`: `projectId`, `title`, `status`, `priority`, …; `userRoutes`, `projectRoutes` tương ứng. |
| **Middleware `validate`** | Chạy `validationResult` — gom lỗi thành message 400 — `BE/src/middleware/validate.js`. |
| **FastAPI / Pydantic** | AI: `ChatRequest` với `message: str` — body JSON được parse/validate. |
| **Upload** | Profile avatar: `multer` + giới hạn kích thước (`LIMIT_FILE_SIZE` trong `errorHandler`). |
| **MongoDB** | ObjectId cast lỗi → 400 "Invalid id" — `errorHandler`. |

**Khuyến nghị thêm (ngoài code hiện tại):**

- Rate limiting cho `/api/auth/login`.
- Helmet cho HTTP headers.
- Chuẩn hóa CORS: `origin` cụ thể thay vì `origin: true` nếu cần siết chặt.

---

## 4.4. AI & network

| Rủi ro | Mô tả |
|--------|--------|
| **AI `/chat` không auth** | BE là lớp bảo vệ chính; không public AI URL trực tiếp cho browser nếu không có API key / token. |
| **CORS AI** | `allow_origins=["*"]` — chỉ phù hợp dev; production nên giới hạn domain FE. |
| **AGENT_URL** | BE chỉ forward sau khi user đã JWT + ADMIN. |

---

## 4.5. Checklist triển khai production

- [ ] `JWT_SECRET` ngẫu nhiên, đủ dài.
- [ ] `NODE_ENV=production` trên BE.
- [ ] MongoDB Atlas: IP allowlist / user mạnh, không leak URI trong log.
- [ ] OpenAI key chỉ trên AI service env.
- [ ] Không commit `sk-`, `mongodb+srv://...`, JWT vào Git (đã có push protection GitHub).
