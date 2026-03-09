# Scripts Backend TaskMate

## seed.js — Import dữ liệu vào MongoDB

- Đọc `../data/users.json`, `projects.json`, `tasks.json`.
- **Bảo mật:** Mật khẩu user được **hash bằng bcrypt** (12 rounds) trước khi lưu; không lưu plain text.
- Xóa dữ liệu cũ trong 3 collection rồi insert lại (chạy lại = reset + seed).
- Dùng `_id` = `id` trong JSON để task.projectId / task.assigneeId tham chiếu đúng.

### Chạy

```bash
cd BE
npm install
npm run seed
```

### Biến môi trường (tùy chọn)

- `MONGODB_URI`: mặc định `mongodb://127.0.0.1:27017`
- `DB_NAME`: mặc định `taskmate`

Ví dụ:

```bash
MONGODB_URI="mongodb://127.0.0.1:27017" DB_NAME="taskmate" npm run seed
```

### Yêu cầu

- MongoDB đang chạy (ví dụ local 127.0.0.1:27017).
- Node.js hỗ trợ ES modules (type: "module" trong package.json).
