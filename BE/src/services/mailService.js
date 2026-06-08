import nodemailer from "nodemailer";
import {
  decryptWebmailPassword,
  DEFAULT_SMTP_HOST,
  DEFAULT_SMTP_PORT,
} from "../utils/mailCredentials.js";
import { buildTimeOffEmailContent } from "../utils/timeOffLabels.js";

function buildTransporter({ smtpHost, email, password }) {
  return nodemailer.createTransport({
    host: smtpHost || DEFAULT_SMTP_HOST,
    port: DEFAULT_SMTP_PORT,
    secure: true,
    auth: {
      user: email,
      pass: password,
    },
    tls: {
      rejectUnauthorized: process.env.NODE_ENV === "production",
    },
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
 * Gửi email xin off qua SMTP port 465.
 * @returns {{ sent: string[], failed: string[] }}
 */
export async function sendTimeOffEmails(user, notifyEmails, request) {
  const emails = parseNotifyEmails(notifyEmails);
  if (emails.length === 0) return { sent: [], failed: [] };

  if (!user?.email || !user?.webmailPasswordEnc) {
    throw new Error("Chưa cấu hình email webmail trong Profile");
  }

  const password = decryptWebmailPassword(user.webmailPasswordEnc);
  if (!password) {
    throw new Error("Không giải mã được mật khẩu webmail");
  }

  const transporter = buildTransporter({
    smtpHost: user.smtpHost,
    email: user.email,
    password,
  });

  const { text, html, subject } = buildTimeOffEmailContent(request);

  const sent = [];
  const failed = [];
  const sendDetails = [];

  for (const to of emails) {
    try {
      const info = await transporter.sendMail({
        from: user.email,
        to,
        subject,
        text,
        html,
      });
      sent.push(to);
      sendDetails.push({
        to,
        messageId: info.messageId ?? null,
        response: info.response ?? null,
      });
      console.info("[mail] accepted by SMTP", to, info.messageId ?? "", info.response ?? "");
    } catch (err) {
      failed.push(to);
      console.warn("[mail] send failed to", to, err?.message ?? err);
    }
  }

  return {
    sent,
    failed,
    details: sendDetails,
    note:
      "SMTP đã chấp nhận gửi. Mail gửi qua API thường không xuất hiện trong thư mục Đã gửi trên webmail — kiểm tra hộp thư đến người nhận.",
  };
}

export { parseNotifyEmails };
