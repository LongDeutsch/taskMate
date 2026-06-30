# TaskMate Xin off (Windows)

App desktop Windows gửi **email xin off qua SMTP local** (port 465), sau đó **đồng bộ yêu cầu** lên TaskMate BE qua API (`skipMail: true`).

Tương tự [`app/`](../app/) (bản Mac) nhưng đóng gói cho **Windows x64**.

## Yêu cầu (dev)

- Windows 10/11 (x64) hoặc máy build có `electron-builder --win`
- Node.js 20+
- TaskMate BE đã deploy

## Cài đặt

```bash
cd app_win
npm install
```

## Chạy dev (trên Windows)

```bash
npm run dev
```

Đợi cửa sổ **TaskMate Xin off** mở. **Không** mở `http://127.0.0.1:5174` trên trình duyệt.

## Đóng gói cho user Windows

Chạy trên **Windows** (khuyến nghị) hoặc máy có công cụ build Win:

```bash
npm run pack
```

File output trong `release/`:

| File | Mô tả |
|------|--------|
| `TaskMate Xin off 1.0.0.exe` | **Portable** — double-click chạy, không cần cài |
| `TaskMate Xin off-1.0.0-win.zip` | Giải nén → chạy `TaskMate Xin off.exe` |

Gửi user file **`.exe` portable** hoặc **`.zip`** là đủ.

Icon app: `build/icon.ico` (256×256, từ `calendar.ico` gốc). File `.exe` và cửa sổ/taskbar Windows sẽ hiển thị icon lịch sau khi `npm run pack`.

### Lần chạy đầu trên Windows

Windows SmartScreen có thể cảnh báo vì app chưa ký code signing. Chọn **More info → Run anyway**.

## Luồng sử dụng

1. **Đăng nhập** TaskMate (username/password)
2. **Cài đặt** → email webmail + mật khẩu (lưu Windows Credential / DPAPI)
3. **Tạo yêu cầu** → gửi mail HR → đồng bộ `POST /api/time-off` với `skipMail: true`
4. **HR/Admin** duyệt/từ chối trong tab **Tất cả**

## API mặc định

`https://taskmate-be.onrender.com` — đổi trên màn đăng nhập hoặc Cài đặt.
