# Bước 3: Models & Schema (MVC – Model)

## Nguyên tắc

- Mỗi collection tương ứng **một Model** (Mongoose schema).
- Schema phản ánh cấu trúc đã có trong 3 file JSON và đủ cho API (thêm field nếu cần: ví dụ `createdAt` mặc định).

## User Model

- **Collection:** `users`
- **Trường gợi ý:**  
  - `username` (string, required, unique),  
  - `password` (string, required — lưu đã hash),  
  - `fullName` (string),  
  - `role` (enum: ADMIN, USER),  
  - `disabled` (boolean, default false).  
- Có thể thêm `id` string (để khớp FE) hoặc chỉ dùng `_id`.
- **Lưu ý:** Khi tạo/sửa user từ API, luôn hash password trước khi lưu (không lưu plain text).

## Project Model

- **Collection:** `projects`
- **Trường:** id (hoặc _id), name, description, createdAt, updatedAt.
- Quan hệ: Task có `projectId` tham chiếu tới Project (ObjectId hoặc string id).

## Task Model

- **Collection:** `tasks`
- **Trường:** id (hoặc _id), projectId (ref Project), title, description, status (Todo | InProgress | Done), priority (Low | Medium | High), deadline (Date hoặc string ISO), assigneeId (ref User, có thể null), createdAt, updatedAt.
- **Index gợi ý:** projectId, assigneeId, status, deadline (để filter và sort nhanh).

## Luồng sử dụng trong Controller

- Controller gọi `Model.find()`, `Model.findById()`, `Model.create()`, `Model.findByIdAndUpdate()`, `Model.findByIdAndDelete()` (hoặc tương đương).
- Không đặt logic nghiệp vụ phức tạp trong model; logic nghiệp vụ nằm ở **controller** (hoặc service layer nếu tách riêng).
