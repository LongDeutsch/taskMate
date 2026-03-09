## TaskMate - Hệ thống quản lý công việc (AI + BE + FE)

TaskMate là một ứng dụng quản lý công việc/dự án với kiến trúc tách ba phần:

- **FE**: Frontend React + Vite + Tailwind, cung cấp giao diện web cho người dùng.
- **BE**: Backend Node.js/Express + MongoDB, cung cấp REST API cho auth, users, projects, tasks, profile và tích hợp AI.
- **AI**: FastAPI service cho TaskMate AI Agent, đọc dữ liệu từ MongoDB và xử lý hội thoại thông minh.

---

## Cấu trúc thư mục chính

- **`FE/`**: Frontend React
  - `src/app` – layout, routes, shell ứng dụng.
  - `src/features/auth` – đăng nhập, quản lý phiên.
  - `src/features/tasks`, `projects`, `users`, `dashboard`, `automation`, `profile` – trang nghiệp vụ chính.
  - `src/features/ai/components/ai-chat-widget.tsx` – UI chat với AI agent.
  - `src/shared/api` – client HTTP, mock-client, mock-data, types chia sẻ.
  - `.env.example` – cấu hình `VITE_API_URL` tới BE.

- **`BE/`**: Backend API
  - `src/app.js` – khởi tạo Express app, cấu hình CORS, JSON, static, mount routes.
  - Các routes chính:
    - `/api/auth` – xác thực, đăng nhập.
    - `/api/projects` – CRUD dự án.
    - `/api/tasks` – CRUD task.
    - `/api/users` – quản lý người dùng.
    - `/api/profile` – hồ sơ cá nhân.
    - `/api/ai` – endpoint nói chuyện với AI agent.
  - `src/routes/aiRoutes.js` – route `/api/ai/chat` bảo vệ bằng `authMiddleware`.
  - `src/controllers/aiController.js` – controller gọi sang AI service qua `AGENT_URL`.
  - `data/` – dữ liệu mẫu (ví dụ `users.json`) cho seeding.
  - `package.json` – scripts `dev`, `start`, `seed`.

- **`AI/`**: AI Agent Service
  - `service.py` – FastAPI app:
    - Khởi tạo app `TaskMate AI Agent`.
    - `@app.on_event("startup")` gọi `config.load_data_from_mongo()` để load dữ liệu ban đầu.
    - Endpoint `POST /chat` nhận `message`, build state cho agent graph, trả về `reply` + `meta`.
  - `requirements.txt` – danh sách dependencies (FastAPI, uvicorn, langgraph, langchain-google-genai, rapidfuzz, pymongo, ...).
  - Các module khác (ví dụ `config.py`, `agent.py`, ...) định nghĩa kết nối MongoDB và graph của AI agent.

---

## Luồng hoạt động tổng quan

1. **Người dùng thao tác trên FE**
   - FE gọi **BE** qua `VITE_API_URL` (ví dụ `http://localhost:6969`) để đăng nhập, lấy dữ liệu projects/tasks/users, cập nhật profile, v.v.
2. **Quản trị viên sử dụng AI Assistant**
   - Ở giao diện admin, widget chat AI (`ai-chat-widget`) gửi request lên **BE** endpoint `/api/ai/chat`.
   - BE kiểm tra `req.user.role` (chỉ cho phép `ADMIN`) rồi forward `message` sang **AI** service tại `AGENT_URL` (mặc định `http://127.0.0.1:8000/chat`).
3. **AI Agent xử lý**
   - AI service đọc dữ liệu mới nhất từ MongoDB (`config.load_data_from_mongo()`), build state ban đầu từ câu hỏi, chạy `graph.invoke(...)` để tạo câu trả lời.
   - Trả về JSON `{ reply, meta }` cho BE, sau đó FE hiển thị message AI cho admin.

---

## Cách chạy từng phần

### 1. Chạy Backend (`BE`)

**Yêu cầu**:
- Node.js (phiên bản LTS mới).
- MongoDB đang chạy (local hoặc remote), cấu hình trong `.env` của BE.

**Các bước**:

```bash
cd BE
npm install

# Tạo file .env dựa trên .env.example
# (điền thông tin MongoDB URI, JWT_SECRET, PORT, ...)

# (tuỳ chọn) seed dữ liệu mẫu
npm run seed

# Chạy server
npm run dev
# hoặc
npm start
```

BE sẽ lắng nghe tại port được cấu hình trong `.env` (ví dụ `6969`), có endpoint `/health` để kiểm tra kết nối DB.

---

### 2. Chạy AI Agent (`AI`)

**Yêu cầu**:
- Python 3.11+.
- MongoDB (trùng database với BE, config trong `config.py` hoặc biến môi trường).

**Các bước**:

```bash
cd AI
python -m venv .venv
source .venv/bin/activate  # macOS/Linux
# hoặc .venv\Scripts\activate  # Windows

pip install -r requirements.txt

# Chạy service
export AGENT_PORT=8000  # nếu muốn đổi port
uvicorn service:app --host 0.0.0.0 --port ${AGENT_PORT:-8000} --reload
```

AI service phải chạy thành công để BE có thể gọi được endpoint `/chat`. BE dùng biến môi trường `AGENT_URL` (mặc định `http://127.0.0.1:8000/chat`).

---

### 3. Chạy Frontend (`FE`)

**Yêu cầu**:
- Node.js (phiên bản hỗ trợ Vite, React 19).

**Các bước**:

```bash
cd FE
npm install

# Tạo file .env từ .env.example
cp .env.example .env
# Đảm bảo VITE_API_URL trỏ đúng về BE, ví dụ:
# VITE_API_URL=http://localhost:6969

npm run dev
```

FE sẽ chạy bằng Vite (mặc định `http://localhost:5173`), giao tiếp với BE thông qua `VITE_API_URL`.

---

## Ghi chú cấu hình & môi trường

- **Đồng bộ PORT**:
  - `VITE_API_URL` trong `FE/.env` phải trùng với `PORT` cấu hình trong `.env` của `BE`.
  - `AGENT_URL` trong `.env` của `BE` phải trỏ tới `AI` service, ví dụ `http://127.0.0.1:8000/chat`.

- **Quyền truy cập AI**:
  - Chỉ user có `role = "ADMIN"` mới được gọi API `/api/ai/chat`. Nếu không, BE trả về lỗi 403.

- **Dữ liệu MongoDB**:
  - AI service luôn reload dữ liệu từ Mongo trước mỗi lần chat để đồng bộ với BE, đảm bảo AI hiểu đúng trạng thái tasks/projects/users mới nhất.

---

## Tech stack tóm tắt

- **FE**:
  - React 19, React Router 7, TanStack Query, Tailwind CSS 4, shadcn UI, Zod.
- **BE**:
  - Node.js, Express, MongoDB + Mongoose, JWT auth, Multer (upload avatar), Express Validator.
- **AI**:
  - Python, FastAPI, Uvicorn, LangGraph, LangChain Google GenAI, RapidFuzz, PyMongo.

README này được viết để mô tả tổng quan kiến trúc và cách chạy 3 services `FE`, `BE`, `AI` của project **TaskMate**.
