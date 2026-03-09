# Bước 4: Authentication & Authorization (RBAC)

## Authentication (Đăng nhập)

1. **Endpoint:** POST `/api/auth/login` (hoặc POST `/api/login`).
2. **Body:** username, password (plain text gửi từ client).
3. **Luồng:**
   - Tìm user theo username; nếu không có → 401.
   - Kiểm tra user.disabled === true → 401 (hoặc 403).
   - So sánh password với hash đã lưu (bcrypt.compare) → sai thì 401.
   - Tạo JWT (payload chứa userId, username, role), ký bằng secret, set thời hạn (ví dụ 1 ngày).
   - Trả về client: accessToken (và có thể refreshToken nếu triển khai).
4. **Lưu ý:** Không trả password (và không lưu plain password trong DB).

## Authorization (RBAC)

- **ADMIN (PM):** toàn quyền — CRUD project, CRUD task, CRUD user (trừ đổi mật khẩu tùy chính sách), xem mọi task.
- **USER:** chỉ xem task có assigneeId = chính mình; không tạo/sửa/xóa task; không vào route quản lý user/project (admin only).

## Middleware đề xuất

1. **auth middleware (ví dụ `middleware/auth.js`):**
   - Đọc header Authorization (Bearer &lt;token&gt;).
   - Verify JWT, lấy payload (userId, role).
   - Gắn user (hoặc userId/role) vào `req.user` (req.user.id, req.user.role).
   - Sai hoặc thiếu token → 401.

2. **RBAC middleware (ví dụ `middleware/rbac.js`):**
   - Nhận tham số danh sách role được phép (ví dụ chỉ ADMIN).
   - Nếu req.user.role không nằm trong danh sách → 403.
   - Áp dụng cho route: ví dụ tất cả route `/api/admin/*` hoặc từng route cụ thể (projects CRUD, users CRUD, tasks create/update/delete).

## Luồng áp dụng trên route

- Route **public:** chỉ POST login (không cần auth).
- Route **cần đăng nhập:** gắn auth middleware trước controller.
- Route **chỉ Admin:** auth → rbac([‘ADMIN’]) → controller.
- Route **User chỉ xem task của mình:** auth → trong controller chỉ query task có assigneeId = req.user.id.
