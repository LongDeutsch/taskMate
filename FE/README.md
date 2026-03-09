# TaskMate

TaskMate là ứng dụng quản lý công việc (task management) theo **dự án (project)** với hai cấp quyền: **Project Manager (Admin)** và **Nhân viên (User)**. Admin cũng là người quản lý dự án.

## Các phân hệ chính

1. **Quản lý Dự án (Projects)** – Admin tạo/sửa/xoá dự án. Mỗi task thuộc một dự án; có thể lọc task theo **tên dự án** hoặc **user** (người được giao).
2. **Quản trị & Người dùng (User Management)** – Admin quản lý tài khoản, tạo user, bật/tắt tài khoản.
3. **Quản lý Công việc (Tasks)** – Admin tạo/sửa/xoá task theo dự án, gán deadline, priority, assign cho user. User chỉ xem task được giao (read-only).
4. **Theo dõi (My Tasks)** – User xem danh sách task được assign, lọc theo dự án; xem chi tiết (có hiển thị tên dự án).
5. **Nhắc nhở & Tự động hoá (Automation)** – Quản lý rule nhắc deadline (mock). Admin tạo rule, User chỉ xem.

## Cài đặt & Chạy

```bash
npm install
npm run dev
```

Mở trình duyệt tại địa chỉ hiển thị (thường là `http://localhost:5173`).

## Tài khoản demo

| Username | Password  | Role  | Ghi chú                    |
|----------|-----------|--------|----------------------------|
| `admin`  | `admin123`| ADMIN  | Full quyền: Dashboard, Projects, Tasks CRUD, Users, Automation |
| `user1`  | `123456`  | USER  | Chỉ xem: Dashboard, My Tasks, Automation (read-only) |
| `user2`  | `123456`  | USER  | Giống user1                |

## Cấu trúc thư mục (Bulletproof React)

```
src/
├── app/                    # Ứng dụng: routes, layout, providers
│   ├── components/         # ProtectedRoute, AdminRoute, Sidebar, Header
│   ├── layouts/            # MainLayout (sidebar + header)
│   ├── providers/          # QueryProvider (TanStack Query)
│   └── routes.tsx          # Định nghĩa routes
├── features/               # Theo từng tính năng (feature-first)
│   ├── auth/               # Login, store, useAuth
│   ├── dashboard/          # Trang Dashboard
│   ├── projects/          # Admin: Quản lý dự án (CRUD)
│   ├── tasks/              # My Tasks, Task detail, Admin CRUD (theo dự án)
│   ├── users/              # Admin: Users Management
│   └── automation/         # Automation rules (mock)
├── shared/                 # Dùng chung
│   ├── api/                # Mock client, mock data (localStorage)
│   ├── lib/                # utils (cn), ...
│   └── types/              # User, Project, Task, AutomationRule, Role
├── components/             # UI chung (shadcn/ui)
├── styles/
└── assets/
```

- **app**: Điểm vào routing, layout, bọc provider.
- **features**: Mỗi feature có api, components, hooks, pages, schemas (zod) riêng.
- **shared**: Types, mock API, utils dùng cho nhiều feature.

## RBAC trong FE

- **ADMIN**: Có thể vào mọi route; thấy sidebar đầy đủ (Dashboard, My Tasks, Automation, **Projects**, Tasks (CRUD), Users). Có nút Create/Edit/Delete cho projects, tasks, Users, Automation rules. Có thể **lọc task theo dự án** và **theo user** (người được giao).
- **USER**: Chỉ vào được `/dashboard`, `/tasks`, `/tasks/:id`, `/automation`. Có thể **lọc task theo dự án** (chỉ các dự án có task được giao cho mình). Không vào được `/admin/projects`, `/admin/tasks`, `/admin/users`. Nếu cố truy cập route admin → redirect về `/dashboard`.
- **Route guard**: `ProtectedRoute` yêu cầu đã login; chưa login → redirect `/login`. `AdminRoute` bọc các route admin; nếu không phải ADMIN → redirect `/dashboard`.
- **UI theo role**: Nút CRUD và link "Admin" trong sidebar chỉ render khi `useAuth().isAdmin === true`.

## Công nghệ

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **react-router-dom** – routing
- **TanStack Query** – state server (mock), cache
- **Zod** – validation form
- Mock data lưu trong **localStorage**, không cần backend thật.
