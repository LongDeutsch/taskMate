const API_URL_KEY = "xinoff_api_url";
const WEBMAIL_EMAIL_KEY = "xinoff_webmail_email";

function isElectron(): boolean {
  return typeof window.taskmateDesktop !== "undefined";
}

export function requireElectron(feature: string): void {
  if (!isElectron()) {
    throw new Error(
      `${feature} cần chạy trong app Electron. Dùng lệnh: cd app_win && npm run dev (không mở http://127.0.0.1:5174 trên trình duyệt).`
    );
  }
}

export async function getDesktopConfig() {
  if (isElectron()) {
    return window.taskmateDesktop.getConfig();
  }
  return {
    apiUrl: localStorage.getItem(API_URL_KEY) || "https://taskmate-be.onrender.com",
    webmailEmail: localStorage.getItem(WEBMAIL_EMAIL_KEY) || "",
    hasWebmailPassword: false,
  };
}

export async function setDesktopConfig(cfg: {
  apiUrl?: string;
  webmailEmail?: string;
  webmailPassword?: string;
}) {
  if (isElectron()) {
    return window.taskmateDesktop.setConfig(cfg);
  }
  if (cfg.apiUrl) localStorage.setItem(API_URL_KEY, cfg.apiUrl.replace(/\/$/, ""));
  if (cfg.webmailEmail !== undefined) localStorage.setItem(WEBMAIL_EMAIL_KEY, cfg.webmailEmail.trim());
  if (cfg.webmailPassword) {
    throw new Error("Lưu mật khẩu webmail cần chạy app Electron (npm run dev).");
  }
  return { ok: true };
}

export async function sendDesktopMail(payload: {
  to: string[];
  subject: string;
  text: string;
  html: string;
}) {
  requireElectron("Gửi mail SMTP");
  return window.taskmateDesktop!.sendMail(payload);
}

export { isElectron };
