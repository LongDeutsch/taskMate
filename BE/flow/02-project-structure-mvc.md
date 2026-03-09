# Bước 1: Cấu trúc dự án theo MVC

## Lựa chọn stack gợi ý

- **Runtime:** Node.js
- **Framework:** Express (hoặc Fastify, NestJS nếu ưu tiên structure sẵn)
- **Database:** MongoDB
- **ODM:** Mongoose (schema, validation, middleware)
- **Auth:** JWT (access token), có thể thêm refresh token
- **Validation:** Joi hoặc Zod cho body/query/params

## Cấu trúc thư mục (MVC cho API)

```
BE/
├── src/
│   ├── config/           # Cấu hình (DB, env, constants)
│   │   └── database.js   # Kết nối MongoDB
│   ├── models/           # Model (MVC: M)
│   │   ├── User.js
│   │   ├── Project.js
│   │   └── Task.js
│   ├── controllers/      # Controller (MVC: C)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── projectController.js
│   │   └── taskController.js
│   ├── routes/           # Route = “điều hướng” tới controller (thay View trong API)
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── projectRoutes.js
│   │   └── taskRoutes.js
│   ├── middleware/       # Auth, RBAC, validate, error handler
│   │   ├── auth.js       # Verify JWT, gắn user vào req
│   │   ├── rbac.js       # Kiểm tra ADMIN / USER
│   │   └── validate.js   # Validate request
│   ├── utils/            # Hash password, response chuẩn, errors
│   └── app.js            # Tạo app Express, gắn routes
├── data/                 # users.json, projects.json, tasks.json (đã có)
├── flow/                 # Tài liệu luồng (đang đọc)
├── package.json
└── .env
```

## Luồng request (MVC trong API)

1. **Request** → vào **Route** (định tuyến theo method + path).
2. **Route** → gọi **Middleware** (auth, rbac, validate) nếu cần.
3. **Route** → gọi **Controller** (action tương ứng).
4. **Controller** → dùng **Model** (User/Project/Task) để đọc/ghi MongoDB.
5. **Controller** → trả **Response** (JSON); không có “View” như MVC web truyền thống.

## Thứ tự triển khai cấu trúc

1. Tạo project (npm init), cài dependencies (express, mongoose, dotenv, jsonwebtoken, bcrypt, validator…).
2. Tạo các thư mục và file rỗng theo cây trên.
3. Trong `app.js`: kết nối DB, mount routes, gắn middleware lỗi toàn cục.
4. Tiếp theo: **Kết nối MongoDB & seed** (bước 2).
