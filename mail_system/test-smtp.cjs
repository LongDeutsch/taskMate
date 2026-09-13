/**
 * Test SMTP trên máy trạm — nhập mật khẩu bằng tay (tránh CMD làm hỏng ký tự đặc biệt).
 *
 *   node test-smtp.cjs
 *   node test-smtp.cjs long_pip@cybertech.com.vn
 */
const fs = require("fs");
const path = require("path");
const readline = require("readline");
const nodemailer = require("nodemailer");

const host = process.env.SMTP_HOST || "mail.cybertech.com.vn";
const emailArg = String(process.argv[2] || process.env.SMTP_EMAIL || "").trim();

function ask(question, { silent = false } = {}) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (!silent) {
    return new Promise((resolve) => {
      rl.question(question, (ans) => {
        rl.close();
        resolve(ans);
      });
    });
  }
  // Ẩn mật khẩu trên Windows/Unix
  return new Promise((resolve) => {
    const stdout = process.stdout;
    stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.setRawMode) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");
    let buf = "";
    const onData = (ch) => {
      if (ch === "\n" || ch === "\r" || ch === "\u0004") {
        stdin.removeListener("data", onData);
        if (stdin.setRawMode) stdin.setRawMode(!!wasRaw);
        stdin.pause();
        stdout.write("\n");
        rl.close();
        resolve(buf);
        return;
      }
      if (ch === "\u0003") {
        stdout.write("\n");
        process.exit(130);
      }
      if (ch === "\u007f" || ch === "\b") {
        buf = buf.slice(0, -1);
        return;
      }
      buf += ch;
      stdout.write("*");
    };
    stdin.on("data", onData);
  });
}

async function tryAuth(user, pass, port, secure) {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    requireTLS: !secure,
    auth: { user, pass },
    authMethod: "LOGIN",
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 20_000,
    tls: { rejectUnauthorized: false },
  });
  try {
    await transporter.verify();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      message: err?.message || String(err),
      code: err?.code,
      response: err?.response,
      responseCode: err?.responseCode,
      command: err?.command,
    };
  } finally {
    transporter.close?.();
  }
}

(async () => {
  const email = emailArg || (await ask("Email: ")).trim();
  if (!email.includes("@")) {
    console.error("Email không hợp lệ");
    process.exit(2);
  }
  const password = await ask("Mat khau webmail: ", { silent: true });
  if (!password) {
    console.error("Thiếu mật khẩu");
    process.exit(2);
  }

  const local = email.split("@")[0];
  const users = [...new Set([email, email.toLowerCase(), local, local.toLowerCase()].filter(Boolean))];
  const ports = [
    { port: 465, secure: true },
    { port: 587, secure: false },
  ];

  console.log("\nHost:", host);
  console.log("Email:", email);
  console.log("Pass length:", password.length);
  console.log("Dang thu...\n");

  let anyOk = false;
  for (const user of users) {
    for (const p of ports) {
      process.stdout.write(`- user=${user} port=${p.port} ... `);
      const r = await tryAuth(user, password, p.port, p.secure);
      if (r.ok) {
        console.log("OK");
        anyOk = true;
        console.log("\n=> SMTP hoạt động với:", { user, port: p.port });
        process.exit(0);
      }
      console.log("FAIL");
      console.log("  ", r.message);
      if (r.response) console.log("  response:", r.response);
      if (r.responseCode) console.log("  responseCode:", r.responseCode);
    }
  }

  if (!anyOk) {
    console.error("\nTất cả cách đều FAIL.");
    console.error("Webmail OK nhưng SMTP fail thường do:");
    console.error("  1) Hosting chưa bật SMTP Authentication cho mailbox");
    console.error("  2) Cần dùng mật khẩu ứng dụng / SMTP riêng (nếu IT có)");
    console.error("  3) Firewall chặn outbound 465/587 (thường lỗi timeout, không phải Invalid login)");
    process.exit(1);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
