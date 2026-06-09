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

    const sent = [];
    const failed = [];
    for (const recipient of recipients) {
      try {
        const info = await transporter.sendMail({ from, to: recipient, subject, text, html });
        sent.push(recipient);
        console.info("[local-mail] sent to", recipient, info.messageId);
      } catch (err) {
        failed.push(recipient);
        console.warn("[local-mail] failed", recipient, err?.message);
      }
    }
    transporter.close?.();

    if (sent.length === 0) {
      throw new Error(`Gửi mail thất bại: ${failed.join(", ")}`);
    }
    return { sent, failed };
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    title: "TaskMate Xin off",
    show: false,
    webPreferences: {
      preload: path.resolve(__dirname, "desktop/preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  win.once("ready-to-show", () => {
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
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
