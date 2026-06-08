/**
 * Test SMTP port 465 từ máy local.
 *
 * Cách dùng:
 *   cd BE
 *   SMTP_EMAIL=long.nguyen@cybertech.com.vn \
 *   SMTP_PASSWORD='your-password' \
 *   SMTP_TO=duy.pham@cybertech.com.vn \
 *   npm run test:smtp
 *
 * Tuỳ chọn:
 *   SMTP_HOST=mail.cybertech.com.vn  (mặc định)
 *   SMTP_PORT=465                    (mặc định)
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
    const socket = net.connect({ host, port, timeout: 10000 }, () => {
      log("TCP", `Kết nối TCP tới ${host}:${port} — OK`);
      socket.end();
      resolve(true);
    });
    socket.on("error", (err) => {
      log("TCP", `Lỗi: ${err.message}`);
      resolve(false);
    });
    socket.on("timeout", () => {
      log("TCP", "Timeout sau 10s");
      socket.destroy();
      resolve(false);
    });
  });
}

async function testTls() {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host, port, servername: host, rejectUnauthorized: false, timeout: 10000 },
      () => {
        log("TLS", `Bắt tay SSL trên port ${port} — OK`);
        log("TLS cert", socket.getPeerCertificate()?.subject?.CN ?? "(không đọc được CN)");
        socket.end();
        resolve(true);
      }
    );
    socket.on("error", (err) => {
      log("TLS", `Lỗi: ${err.message}`);
      resolve(false);
    });
    socket.on("timeout", () => {
      log("TLS", "Timeout sau 10s");
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
    tls: { rejectUnauthorized: false },
    logger: true,
    debug: true,
  });

  log("SMTP verify", "Đang xác thực đăng nhập SMTP...");
  await transporter.verify();
  log("SMTP verify", "Đăng nhập SMTP — OK");

  const subject = `[TaskMate SMTP Test] ${new Date().toISOString()}`;
  const text = [
    "Đây là email test từ script BE/scripts/test-smtp.js",
    "",
    "Nếu nhận được mail này → SMTP 465 hoạt động.",
    "Lưu ý: gửi qua SMTP thường KHÔNG hiện trong thư mục Đã gửi trên webmail.",
    "Hãy kiểm tra hộp thư đến của người nhận (hoặc Spam).",
  ].join("\n");

  log("SMTP send", `Gửi thử tới ${to}...`);
  const info = await transporter.sendMail({
    from: email,
    to,
    subject,
    text,
  });

  log("SMTP send — kết quả", JSON.stringify({
    messageId: info.messageId,
    accepted: info.accepted,
    rejected: info.rejected,
    response: info.response,
    envelope: info.envelope,
  }, null, 2));

  return info;
}

async function main() {
  console.log("TaskMate — SMTP test (port 465)");
  console.log(`Host: ${host}:${port}`);

  const tcpOk = await testTcp();
  if (!tcpOk) {
    console.error("\nKhông kết nối được TCP. Kiểm tra mạng/VPN/firewall.");
    process.exit(1);
  }

  await testTls();

  if (!email || !password) {
    log("Bỏ qua gửi mail", [
      "Thiếu SMTP_EMAIL hoặc SMTP_PASSWORD.",
      "Chạy lại với:",
      "  SMTP_EMAIL=you@cybertech.com.vn SMTP_PASSWORD='...' SMTP_TO=recipient@... npm run test:smtp",
    ].join("\n"));
    process.exit(0);
  }

  try {
    await testSmtpAuthAndSend();
    log("Hoàn tất", [
      "SMTP chấp nhận gửi (accepted).",
      "Kiểm tra INBOX người nhận — không kiểm tra thư mục Đã gửi của người gửi.",
      "Webmail Roundcube chỉ lưu Đã gửi khi soạn/gửi trong giao diện web, không phải SMTP API.",
    ].join("\n"));
  } catch (err) {
    console.error("\nSMTP thất bại:", err?.message ?? err);
    if (err?.code) console.error("Code:", err.code);
    if (err?.response) console.error("Response:", err.response);
    process.exit(1);
  }
}

main();
