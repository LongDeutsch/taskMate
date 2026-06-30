const { app, BrowserWindow, ipcMain, safeStorage } = require("electron");
const path = require("path");
const nodemailer = require("nodemailer");
const Store = require("electron-store");

const SMTP_HOST = "mail.cybertech.com.vn";
const SMTP_PORT = 465;

/** @type {import('electron-store')<Record<string, string>> | null} */
let store = null;

function getStore() {
  if (!store) {
    store = new Store({
      name: "taskmate-xinoff-win",
      cwd: path.join(app.getPath("userData")),
      defaults: {
        apiUrl: "https://taskmate-be.onrender.com",
        webmailEmail: "",
        webmailPasswordEnc: "",
      },
    });
  }
  return store;
}

function encryptSecret(plain) {
  if (!plain) return "";
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(plain).toString("base64");
  }
  return Buffer.from(plain, "utf8").toString("base64");
}

function decryptSecret(enc) {
  if (!enc) return "";
  try {
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(Buffer.from(enc, "base64"));
    }
    return Buffer.from(enc, "base64").toString("utf8");
  } catch {
    return "";
  }
}

function registerIpc() {
  ipcMain.handle("config:get", () => {
    const s = getStore();
    return {
      apiUrl: s.get("apiUrl"),
      webmailEmail: s.get("webmailEmail"),
      hasWebmailPassword: Boolean(s.get("webmailPasswordEnc")),
    };
  });

  ipcMain.handle("config:set", (_e, { apiUrl, webmailEmail, webmailPassword }) => {
    const s = getStore();
    if (apiUrl) s.set("apiUrl", String(apiUrl).replace(/\/$/, ""));
    if (webmailEmail !== undefined) s.set("webmailEmail", String(webmailEmail).trim());
    if (webmailPassword) s.set("webmailPasswordEnc", encryptSecret(webmailPassword));
    return { ok: true };
  });

  ipcMain.handle("mail:send", async (_e, { to, subject, text, html }) => {
    const s = getStore();
    const from = s.get("webmailEmail");
    const pass = decryptSecret(s.get("webmailPasswordEnc"));
    if (!from || !pass) {
      throw new Error("Chưa cấu hình email/mật khẩu webmail trong Cài đặt");
    }
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [];
    if (recipients.length === 0) throw new Error("Không có người nhận email");

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: true,
      auth: { user: from, pass },
      connectionTimeout: 25_000,
      socketTimeout: 30_000,
      tls: { rejectUnauthorized: false },
    });

    try {
      const info = await transporter.sendMail({ from, to: recipients, subject, text, html });
      console.info("[local-mail] sent to", recipients.join(", "), info.messageId);
      return { sent: recipients, failed: [] };
    } catch (err) {
      console.warn("[local-mail] failed", recipients.join(", "), err?.message);
      throw new Error(`Gửi mail thất bại: ${err?.message ?? "unknown error"}`);
    } finally {
      transporter.close?.();
    }
  });
}

/** Màn splash hiển thị ngay khi double-click, trong lúc cửa sổ chính tải xong. */
const SPLASH_HTML = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8" />
<style>
  html, body { margin: 0; height: 100%; }
  body {
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 18px; height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    background: #f8fafc; color: #0f172a;
    -webkit-user-select: none; user-select: none;
  }
  .spinner {
    width: 44px; height: 44px; border-radius: 50%;
    border: 4px solid #dbeafe; border-top-color: #2563eb;
    animation: spin 0.8s linear infinite;
  }
  .title { font-size: 1.05rem; font-weight: 600; }
  .sub { font-size: 0.82rem; color: #64748b; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style></head>
<body>
  <div class="spinner"></div>
  <div class="title">TaskMate Xin off</div>
  <div class="sub">Đang khởi động…</div>
</body></html>`;

/** @type {BrowserWindow | null} */
let splashWin = null;

function createSplash() {
  splashWin = new BrowserWindow({
    width: 360,
    height: 240,
    frame: false,
    resizable: false,
    show: true,
    center: true,
    title: "TaskMate Xin off",
    backgroundColor: "#f8fafc",
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  });
  splashWin.loadURL(
    "data:text/html;charset=utf-8," + encodeURIComponent(SPLASH_HTML)
  );
  splashWin.on("closed", () => {
    splashWin = null;
  });
}

function closeSplash() {
  if (splashWin && !splashWin.isDestroyed()) {
    splashWin.close();
  }
  splashWin = null;
}

function createWindow() {
  const iconPath = path.join(__dirname, "build", "icon.ico");
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: "TaskMate Xin off",
    icon: iconPath,
    show: false,
    backgroundColor: "#f8fafc",
    webPreferences: {
      preload: path.resolve(__dirname, "desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
    closeSplash();
    win.show();
    win.focus();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://127.0.0.1:5174";
  if (!app.isPackaged) {
    console.log("[electron] dev mode →", devUrl);
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, "renderer/index.html"));
  }
}

app.whenReady().then(() => {
  console.log("[electron] app ready");
  registerIpc();
  createSplash();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
