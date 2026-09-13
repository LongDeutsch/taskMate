/**
 * TaskMate Mail System — agent máy trạm.
 * Poll HTTP outbound tới TaskMate BE → gửi SMTP local.
 *
 * Cấu hình: copy env.example → .env rồi sửa key.
 * Chạy: npm start   hoặc  start.bat (Windows)
 */
const fs = require("fs");
const path = require("path");
const os = require("os");

// Load .env cạnh mailAgent nếu có (không bắt buộc package dotenv khi set env tay)
try {
  const envPath = path.join(__dirname, ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) process.env[k] = v;
    }
  }
} catch {
  /* ignore */
}

const nodemailer = require("nodemailer");

const API_URL = String(process.env.TASKMATE_API_URL || "https://taskmate-be.onrender.com").replace(
  /\/$/,
  ""
);
const API_KEY = String(process.env.MAIL_AGENT_API_KEY || process.env.TASKMATE_API_KEY || "").trim();
const AGENT_ID =
  String(process.env.MAIL_AGENT_ID || "").trim() ||
  `win-${os.hostname().replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 32) || "station"}`;
const POLL_MS = Math.max(1500, Number(process.env.POLL_INTERVAL_MS || 3000) || 3000);
const SMTP_HOST = process.env.SMTP_HOST || "mail.cybertech.com.vn";
const SMTP_PORT = Number(process.env.SMTP_PORT || 465) || 465;

const DATA_DIR =
  process.env.MAIL_AGENT_DATA_DIR ||
  path.join(os.homedir(), ".taskmate-mail-agent");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadAccounts() {
  ensureDataDir();
  if (!fs.existsSync(ACCOUNTS_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ACCOUNTS_FILE, "utf8")) || {};
  } catch {
    return {};
  }
}

function saveAccounts(accounts) {
  ensureDataDir();
  fs.writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf8");
}

function getAccount(userId) {
  const accounts = loadAccounts();
  const row = accounts[userId];
  if (!row?.email || !row?.password) return null;
  return { email: String(row.email), password: String(row.password) };
}

function upsertAccount(userId, email, password) {
  const accounts = loadAccounts();
  accounts[userId] = {
    email: String(email).trim().toLowerCase(),
    password: String(password),
    updatedAt: new Date().toISOString(),
  };
  saveAccounts(accounts);
}

function deleteAccount(userId) {
  const accounts = loadAccounts();
  if (!accounts[userId]) return;
  delete accounts[userId];
  saveAccounts(accounts);
  console.info("[mail_system] removed bad account for user", userId);
}

function isSmtpAuthError(err) {
  const msg = String(err?.message ?? err ?? "").toLowerCase();
  const code = String(err?.responseCode ?? err?.code ?? "");
  return (
    code === "535" ||
    msg.includes("invalid login") ||
    msg.includes("authentication failed") ||
    msg.includes("535 5.7.8") ||
    (msg.includes("auth") && msg.includes("fail"))
  );
}

async function api(pathname, { method = "GET", body } = {}) {
  const res = await fetch(`${API_URL}${pathname}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": API_KEY,
      "X-Agent-Id": AGENT_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return { status: 204, data: null };
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { message: text };
  }
  if (!res.ok) {
    const msg = json?.message || json?.error || res.statusText || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return { status: res.status, data: json?.data ?? json };
}

async function sendSmtp({ from, password, to, subject, text, html }) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: from, pass: password },
    connectionTimeout: 25_000,
    socketTimeout: 30_000,
    tls: { rejectUnauthorized: false },
  });
  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html,
    });
    console.info("[mail_system] sent", to.join(", "), info.messageId);
    return { sent: to, messageId: info.messageId };
  } finally {
    transporter.close?.();
  }
}

/** Kiểm tra đăng nhập SMTP trước khi ghi đè accounts.json */
async function verifySmtp(email, password) {
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: true,
    auth: { user: email, pass: password },
    connectionTimeout: 25_000,
    socketTimeout: 30_000,
    tls: { rejectUnauthorized: false },
  });
  try {
    await transporter.verify();
    return true;
  } finally {
    transporter.close?.();
  }
}

async function processStationAccountUpdate(item) {
  const email = String(item.email ?? "").trim().toLowerCase();
  const password = String(item.password ?? "");
  const userId = item.userId;
  if (!email || !password || !userId) {
    await api(`/api/mail-jobs/agent/station-accounts/${item.id}`, {
      method: "PATCH",
      body: { status: "failed", error: "Thiếu email/password/userId" },
    });
    return;
  }

  console.info("[mail_system] station-account update", item.id, "user=", userId, email);
  try {
    await verifySmtp(email, password);
    upsertAccount(userId, email, password);
    await api(`/api/mail-jobs/agent/station-accounts/${item.id}`, {
      method: "PATCH",
      body: { status: "applied" },
    });
    console.info("[mail_system] station-account applied", userId, email);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[mail_system] station-account failed", item.id, msg);
    await api(`/api/mail-jobs/agent/station-accounts/${item.id}`, {
      method: "PATCH",
      body: {
        status: "failed",
        error: isSmtpAuthError(err)
          ? "Email/mật khẩu không đúng (SMTP auth failed)"
          : msg,
      },
    });
  }
}

async function processJob(job) {
  const userId = job.userId;
  const to = Array.isArray(job.mail?.to) ? job.mail.to.filter(Boolean) : [];
  if (to.length === 0) {
    await api(`/api/mail-jobs/agent/${job.id}`, {
      method: "PATCH",
      body: { status: "failed", error: "Job không có người nhận email" },
    });
    return;
  }

  let account = getAccount(userId);
  /** Credentials mới từ FE — chỉ lưu sau khi SMTP thành công */
  let pendingCreds = null;

  if (job.credentials?.email && job.credentials?.password) {
    pendingCreds = {
      email: String(job.credentials.email).trim().toLowerCase(),
      password: String(job.credentials.password),
    };
    account = pendingCreds;
    console.info("[mail_system] trying credentials for", userId, account.email);
  }

  if (!account) {
    console.info("[mail_system] need_credentials for", userId, job.id);
    await api(`/api/mail-jobs/agent/${job.id}`, {
      method: "PATCH",
      body: { status: "need_credentials" },
    });
    return;
  }

  await api(`/api/mail-jobs/agent/${job.id}`, {
    method: "PATCH",
    body: { status: "sending" },
  });

  try {
    const result = await sendSmtp({
      from: account.email,
      password: account.password,
      to,
      subject: job.mail.subject || "(no subject)",
      text: job.mail.text || "",
      html: job.mail.html || "",
    });
    // Chỉ lưu khi gửi thành công
    upsertAccount(userId, account.email, account.password);
    console.info("[mail_system] saved account for user", userId, account.email);
    await api(`/api/mail-jobs/agent/${job.id}`, {
      method: "PATCH",
      body: { status: "sent", sentTo: result.sent },
    });
    console.info("[mail_system] job sent", job.id);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[mail_system] SMTP failed", job.id, msg);

    if (isSmtpAuthError(err) || pendingCreds) {
      deleteAccount(userId);
      await api(`/api/mail-jobs/agent/${job.id}`, {
        method: "PATCH",
        body: {
          status: "need_credentials",
          error:
            "Email/mật khẩu webmail không đúng hoặc bị từ chối SMTP. Vui lòng nhập lại.",
        },
      });
      console.info("[mail_system] auth failed → ask credentials again", job.id);
      return;
    }

    await api(`/api/mail-jobs/agent/${job.id}`, {
      method: "PATCH",
      body: { status: "failed", error: msg },
    });
  }
}

async function wake() {
  try {
    await fetch(`${API_URL}/api/ping`);
  } catch {
    /* ignore */
  }
}

async function tick() {
  // Ưu tiên cập nhật account (ghi đè) rồi mới gửi mail job
  const accountRes = await api("/api/mail-jobs/agent/station-accounts/next");
  if (accountRes.status !== 204 && accountRes.data) {
    await processStationAccountUpdate(accountRes.data);
  }

  const { status, data } = await api("/api/mail-jobs/agent/next");
  if (status === 204 || !data) return;
  console.info("[mail_system] claimed", data.id, data.status, "user=", data.userId);
  await processJob(data);
}

async function main() {
  if (!API_KEY) {
    console.error(
      "Thiếu MAIL_AGENT_API_KEY. Copy env.example → .env và điền key (trùng Render)."
    );
    process.exit(2);
  }
  ensureDataDir();
  console.info("[mail_system] start");
  console.info("  API     :", API_URL);
  console.info("  AgentId :", AGENT_ID);
  console.info("  Accounts:", ACCOUNTS_FILE);
  console.info("  Poll    :", POLL_MS, "ms");

  await wake();

  while (true) {
    try {
      await tick();
    } catch (err) {
      console.warn("[mail_system] tick error:", err instanceof Error ? err.message : err);
      await wake();
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
