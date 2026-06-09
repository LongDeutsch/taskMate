import nodemailer from "nodemailer";
import {
  decryptWebmailPassword,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
} from "../utils/mailCredentials.js";
import { buildTimeOffEmailContent } from "../utils/timeOffLabels.js";
import { isRenderHosted, smtpFailureHint } from "../utils/smtpEnvironment.js";

const SMTP_CONNECTION_TIMEOUT_MS = Number(process.env.SMTP_CONNECTION_TIMEOUT_MS || 25_000);
const SMTP_SOCKET_TIMEOUT_MS = Number(process.env.SMTP_SOCKET_TIMEOUT_MS || 30_000);
const SMTP_PORT = Number(process.env.SMTP_PORT || DEFAULT_SMTP_PORT);

function tlsOptions() {
  const rejectUnauthorized =
    process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "false"
      ? false
      : process.env.NODE_ENV === "production";
  return { rejectUnauthorized };
}

function createTransporter(smtpHost, auth) {
  const host = smtpHost || DEFAULT_SMTP_HOST;
  return nodemailer.createTransport({
    host,
    port: SMTP_PORT,
    secure: true,
    auth,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
    tls: tlsOptions(),
  });
}

function parseNotifyEmails(raw) {
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : String(raw).split(/[,;]/);
  return [...new Set(list.map((e) => String(e).trim().toLowerCase()).filter(Boolean))].filter((e) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)
  );
}

/**
 * Gửi email xin off qua SMTP SSL port 465.
 */
export async function sendTimeOffEmails(user, notifyEmails, request) {
  const emails = parseNotifyEmails(notifyEmails);
  if (emails.length === 0) return { sent: [], failed: [] };

  if (!user?.email || !user?.webmailPasswordEnc) {
    throw new Error("Chưa cấu hình email webmail trong Profile");
  }

  const password = decryptWebmailPassword(user.webmailPasswordEnc);
  if (!password) {
    throw new Error("Không giải mã được mật khẩu webmail — kiểm tra MAIL_CREDENTIALS_KEY trên Render và lưu lại mật khẩu Profile");
  }

  const auth = { user: user.email, pass: password };
  const transporter = createTransporter(user.smtpHost, auth);
  const { text, html, subject } = buildTimeOffEmailContent(request);

  let sent = [];
  let failed = [];
  let sendDetails = [];

  try {
    const info = await transporter.sendMail({
      from: user.email,
      to: emails,
      subject,
      text,
      html,
    });
    sent = emails;
    sendDetails = [
      {
        to: emails.join(", "),
        messageId: info.messageId ?? null,
        response: info.response ?? null,
      },
    ];
    console.info(
      "[mail] accepted by SMTP",
      emails.join(", "),
      `${DEFAULT_SMTP_HOST}:${SMTP_PORT}`,
      info.messageId ?? "",
      info.response ?? ""
    );
  } catch (err) {
    failed = emails;
    const hint = smtpFailureHint(err);
    console.warn("[mail] send failed to", emails.join(", "), hint);
    if (isRenderHosted()) {
      console.warn(
        "[mail] Render free tier blocks outbound SMTP 465/587 — upgrade to paid or use mail relay. See Render changelog."
      );
    }
  } finally {
    transporter.close?.();
  }

  const allFailedNote =
    sent.length === 0 && failed.length > 0
      ? isRenderHosted()
        ? "Render free tier chặn SMTP (port 465). Local gửi OK; trên web cần nâng cấp Render paid hoặc relay mail."
        : "Không gửi được qua SMTP port 465 — kiểm tra firewall/mail server."
      : null;

  return {
    sent,
    failed,
    details: sendDetails,
    note:
      sent.length > 0
        ? "SMTP đã chấp nhận gửi. Kiểm tra hộp thư đến người nhận (có thể trong Spam)."
        : allFailedNote,
  };
}

export { parseNotifyEmails };
