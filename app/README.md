# TaskMate Xin off (Mac)

App desktop gửi **email xin off qua SMTP local** (port 465), sau đó **đồng bộ yêu cầu** lên TaskMate BE qua API (`skipMail: true`).

## Yêu cầu

- macOS
- Node.js 20+
- TaskMate BE đã deploy (hoặc `http://localhost:6969` khi dev local)

## Cài đặt

```bash
cd app
npm install
```

## Chạy dev

```bash
npm run dev
```

Nếu báo **`Cannot read properties of undefined (reading 'whenReady')`** — terminal Cursor/IDE đang set `ELECTRON_RUN_AS_NODE=1`. Script `npm run dev` đã tự unset; hoặc chạy thủ công:

```bash
unset ELECTRON_RUN_AS_NODE
npm run dev
```

Nếu báo **Port 5174 is already in use** (Vite cũ còn chạy):

```bash
npm run kill-port
npm run dev
```

Đợi terminal hiện `[electron] app ready` — cửa sổ **TaskMate Xin off** sẽ mở. **Không** mở `http://127.0.0.1:5174` trên Chrome/Safari.

Nếu không thấy cửa sổ Electron, chạy 2 terminal:

```bash
# Terminal 1
npm run dev:vite

# Terminal 2 (sau khi Vite ready)
npm run dev:electron
```

## Build & chạy production

```bash
npm run build
npm start
```

## Đóng gói .dmg (tuỳ chọn)

```bash
npm run pack
```

## Luồng sử dụng

1. **Đăng nhập** TaskMate (username/password) — xác định user qua JWT
2. **Cài đặt** → nhập email webmail + mật khẩu (lưu Keychain trên Mac)
3. **Tạo yêu cầu** → app gửi mail tới tất cả HR → `POST /api/time-off` với `skipMail: true`
4. **HR/Admin** xem tab **Tất cả**, duyệt/từ chối

## API URL mặc định

`https://taskmate-be.onrender.com` — đổi trong màn đăng nhập hoặc Cài đặt.

## BE

Cần deploy BE có hỗ trợ `skipMail: true` trong body `POST /api/time-off`.
