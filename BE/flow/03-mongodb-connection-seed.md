# Bước 2: Kết nối MongoDB & Seed dữ liệu

## Kết nối MongoDB

- Tạo file cấu hình (ví dụ `config/database.js` hoặc trong `config/index.js`):
  - Đọc connection string từ biến môi trường (ví dụ `MONGODB_URI`).
  - Gọi `mongoose.connect()` (hoặc driver MongoDB) khi khởi động app.
- Trong `app.js` (hoặc `server.js`): gọi hàm kết nối trước khi listen port; xử lý lỗi kết nối và log rõ ràng.

## Seed dữ liệu từ 3 file JSON

- **Mục đích:** Đưa dữ liệu từ `BE/data/users.json`, `projects.json`, `tasks.json` vào MongoDB (chỉ cần chạy một lần hoặc khi reset DB).

### Luồng seed đề xuất

1. **Chuẩn bị:**
   - Đọc 3 file JSON từ `BE/data/`.
   - (Tùy chọn) Map `id` string sang `_id` ObjectId hoặc giữ `id` làm string trong schema để khớp với FE.

2. **Users:**
   - Với mỗi user: **hash password** (bcrypt) trước khi ghi.
   - Ghi vào collection `users` (insertMany hoặc updateOne với upsert theo username/id).
   - Đảm bảo không trùng username (unique index).

3. **Projects:**
   - Ghi nguyên dữ liệu từ `projects.json` vào collection `projects` (id/name/description/createdAt/updatedAt).

4. **Tasks:**
   - Ghi vào collection `tasks`; mỗi task có `projectId` và `assigneeId` tham chiếu tới `projects.id` và `users.id` (có thể dùng ref trong Mongoose sau).

5. **Thứ tự ghi:** Users → Projects → Tasks (vì task phụ thuộc projectId và assigneeId).

6. **Cách chạy seed:**
   - Script riêng: `node scripts/seed.js` (hoặc `npm run seed`).
   - Hoặc endpoint POST `/api/seed` chỉ bật khi `NODE_ENV=development` (tùy chọn, cẩn thận bảo mật).

## Kiểm tra

- Sau khi chạy seed: dùng MongoDB Compass hoặc mongosh kiểm tra 3 collection có đủ bản ghi, password user đã hash, task có projectId/assigneeId đúng.
