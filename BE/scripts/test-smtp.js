/**
 * Test SMTP port 465 từ máy local hoặc Render Shell.
 *
 *   cd BE
 *   SMTP_EMAIL=long.nguyen@cybertech.com.vn \
 *   SMTP_PASSWORD='your-password' \
 *   SMTP_TO=duy.pham@cybertech.com.vn \
 *   npm run test:smtp
 *
 * Tuỳ chọn: SMTP_HOST, SMTP_PORT (mặc định 465)
 */
import "dotenv/config";
import nodemailer from "nodemailer";
import net from "net";
import tls from "tls";

const host = process.env.SMTP_HOST || "mail.cybertech.com.vn";
const port = Number(process.env.SMTP_PORT || 465);
const email = process.env.SMTP_EMAIL;
const password = process.env.SMTP_PASSWORD;
const to = process.env.SMTP_TO || email;

function log(title, detail = "") {
  console.log(`\n=== ${title} ===`);
  if (detail) console.log(detail);
}

async function testTcp() {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 15000 }, () => {
      log("TCP", `Kết nối TCP tới ${host}:${port} — OK`);
      socket.end();
      resolve(true);
    });
    socket.on("error", (err) => {
      log("TCP", `Lỗi: ${err.message}`);
      resolve(false);
    });
    socket.on("timeout", () => {
      log("TCP", "Timeout sau 15s");
      socket.destroy();
      resolve(false);
    });
  });
}

async function testTls() {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, timeout: 15000 },
      () => {
        log("TLS", `Bắt tay SSL port ${port} — OK`);
        socket.end();
        resolve(true);
      }
    );
    socket.on("error", (err) => {
      log("TLS", `Lỗi: ${err.message}`);
      resolve(false);
    });
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function testSmtpAuthAndSend() {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: true,
    auth: { user: email, pass: password },
    connectionTimeout: 25_000,
    socketTimeout: 30_000,
    tls: { rejectUnauthorized: false },
  });

  log("SMTP verify", `Đang xác thực ${host}:${port}...`);
  await transporter.verify();
  log("SMTP verify", "Đăng nhập SMTP — OK");

  const subject = `[TaskMate SMTP Test] ${new Date().toISOString()}`;
  const info = await transporter.sendMail({
    from: email,
    to,
    subject,
    text: "Test SMTP port 465 từ TaskMate.",
  });

  log("SMTP send", JSON.stringify({
    messageId: info.messageId,
    accepted: info.accepted,
    response: info.response,
  }, null, 2));
  transporter.close?.();
  return info;
}

async function main() {
  console.log(`TaskMate — SMTP test port ${port}`);
  console.log(`Host: ${host}:${port}`);
  if (process.env.RENDER) {
    console.log(
      "\n⚠️  Đang chạy trên Render. Free tier chặn SMTP 465/587 — timeout = bình thường nếu chưa upgrade paid.\n"
    );
  }

  const tcpOk = await testTcp();
  if (!tcpOk) {
    console.error("\nKhông kết nối được TCP. Kiểm tra mạng/VPN/firewall.");
    process.exit(1);
  }

  await testTls();

  if (!email || !password) {
    log("Bỏ qua gửi mail", "Thiếu SMTP_EMAIL hoặc SMTP_PASSWORD.");
    process.exit(0);
  }

  try {
    await testSmtpAuthAndSend();
    log("Hoàn tất", `Gửi thành công qua port ${port}. Kiểm tra INBOX ${to}.`);
  } catch (err) {
    console.error("\nSMTP thất bại:", err?.message ?? err);
    if (err?.code) console.error("Code:", err.code);
    process.exit(1);
  }
}

main();
