# Dữ liệu mock TaskMate cho MongoDB

Thư mục này chứa dữ liệu mẫu để import vào MongoDB: **10 user** (1 PM/admin + 9 thành viên), **3 dự án**, **100 task**.

---

## Tài khoản / mật khẩu (User)

| Username   | Password  | Role  | Ghi chú        |
|-----------|-----------|--------|----------------|
| **pm**    | **admin123** | ADMIN | Project Manager |
| nguyenvana | 123456   | USER  | Nguyễn Văn A   |
| tranthib  | 123456   | USER  | Trần Thị B     |
| lethic    | 123456   | USER  | Lê Thị C       |
| phamvand  | 123456   | USER  | Phạm Văn D     |
| hoangthie | 123456   | USER  | Hoàng Thị E    |
| phanvanf  | 123456   | USER  | Phan Văn F     |
| vuthig    | 123456   | USER  | Vũ Thị G       |
| dangvanh  | 123456   | USER  | Đặng Văn H     |
| buitihi   | 123456   | USER  | Bùi Thị I      |

Tài khoản/mật khẩu nằm trong:
- **users.json**: mỗi document có trường `username` và `password`.
- **mockdata.csv**: các dòng `entity_type=user`, cột `username` và `password`.

---

## Import lên MongoDB (khuyến nghị)

Dùng **file JSON** theo từng collection:

```bash
# Giả sử database tên taskmate
mongosh "mongodb://localhost:27017"

use taskmate

# Import (chạy từ thư mục BE/data)
# Cách 1: mongosh
db.users.insertMany(<paste nội dung users.json>)
db.projects.insertMany(<paste nội dung projects.json>)
db.tasks.insertMany(<paste nội dung tasks.json>)

# Cách 2: mongoimport (nếu có)
mongoimport --db taskmate --collection users --file users.json --jsonArray
mongoimport --db taskmate --collection projects --file projects.json --jsonArray
mongoimport --db taskmate --collection tasks --file tasks.json --jsonArray
```

**Lưu ý:** Trước khi import, có thể map `id` sang `_id` (ObjectId hoặc giữ string) tùy schema backend.

---

## Cấu trúc file

| File           | Nội dung |
|----------------|----------|
| **users.json** | 10 user: `id`, `username`, `password`, `fullName`, `role`, `disabled` |
| **projects.json** | 3 project: `id`, `name`, `description`, `createdAt`, `updatedAt` |
| **tasks.json** | 100 task: `id`, `projectId`, `title`, `description`, `status`, `priority`, `deadline`, `assigneeId`, `createdAt`, `updatedAt` |
| **mockdata.csv** | Gộp chung: 1 header + 10 user + 3 project + 100 task (114 dòng). Cột `password` ở vị trí thứ 4. |

---

## mockdata.csv

- **Encoding:** UTF-8
- **Cột:** entity_type, id, username, **password**, full_name, role, disabled, project_id, project_name, project_description, task_title, task_description, status, priority, deadline, assignee_id, created_at, updated_at
- **Dòng 1:** Header
- **Dòng 2–11:** User (có username + password)
- **Dòng 12–14:** Project
- **Dòng 15–114:** Task (100 task)

Khi đọc CSV: lọc theo `entity_type` (user / project / task) rồi map vào từng collection tương ứng.
