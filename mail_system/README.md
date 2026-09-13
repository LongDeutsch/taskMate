# TaskMate `mail_system` — máy trạm gửi mail

Folder độc lập: copy cả thư mục này sang PC văn phòng, **không** cần `app_win` hay source TaskMate.

## Yêu cầu
- Windows (hoặc máy bất kỳ có Node)
- [Node.js 18+](https://nodejs.org/)
- Internet tới TaskMate BE (Render)
- SMTP nội bộ `mail.cybertech.com.vn` (port 465)

## Cài đặt trên máy trạm

1. Copy folder `mail_system` sang PC (USB / shared folder).
2. Tạo file cấu hình:

```bat
copy env.example .env
notepad .env
```

Điền:

```env
TASKMATE_API_URL=https://taskmate-be.onrender.com
MAIL_AGENT_API_KEY=<key trên Render: MAIL_AGENT_API_KEY hoặc HOOKS_API_KEY>
MAIL_AGENT_ID=pc-van-phong-1
```

3. Cài dependency + chạy:

```bat
npm install
npm start
```

Hoặc double-click **`start.bat`**.

4. Giữ cửa sổ chạy (hoặc gắn Task Scheduler chạy khi Windows login).

## Phía TaskMate (Render)

- Env `MAIL_AGENT_API_KEY` (hoặc đã có `HOOKS_API_KEY`) — **cùng giá trị** với `.env` máy trạm
- Deploy BE + FE đã có flow Xin off → MailJob

## Lần đầu gửi mail

Lần đầu / cập nhật mail: user nhập trên web → agent **verify SMTP** rồi mới ghi `accounts.json`.
Sai mật khẩu → không lưu / hỏi nhập lại.

Trên web Xin off: nút **Cập nhật mail máy trạm** → ghi đè account theo user đang đăng nhập.

Account: `%USERPROFILE%\.taskmate-mail-agent\accounts.json`

Xóa account lỗi (nếu đã lưu sai trước đây):

```bat
del "%USERPROFILE%\.taskmate-mail-agent\accounts.json"
```

## Kiểm tra agent sống

Console sẽ in:

```
[mail_system] start
  API     : https://taskmate-be.onrender.com
  AgentId : pc-van-phong-1
...
```

Khi có job: `[mail_system] claimed mj-...`

## Lỗi "Invalid login" dù nhớ đúng mật khẩu

1. Phải là mật khẩu **webmail** (`https://mail.cybertech.com.vn`), **không** phải mật khẩu đăng nhập TaskMate.
2. Tắt autofill trình duyệt / gõ tay lại (tránh dán nhầm mật khẩu khác).
3. Test thẳng trên máy trạm:

```bat
set SMTP_EMAIL=long_pip@cybertech.com.vn
set SMTP_PASSWORD=mat-khau-webmail
npm run test:smtp
```

- `OK` → mật khẩu đúng, cập nhật lại trên web.
- `FAIL` / Invalid login → mật khẩu SMTP chưa đúng hoặc tài khoản bị khóa tạm sau nhiều lần sai; đợi vài phút rồi thử lại trên webmail trước.
