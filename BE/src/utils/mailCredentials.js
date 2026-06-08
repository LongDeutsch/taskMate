import crypto from "crypto";
import bcrypt from "bcrypt";

const ALGO = "aes-256-gcm";
const BCRYPT_ROUNDS = 10;

function deriveKey() {
  const secret = process.env.MAIL_CREDENTIALS_KEY || process.env.JWT_SECRET || "dev-mail-key-change-me";
  return crypto.scryptSync(secret, "taskmate-mail-v1", 32);
}

/** Mã hóa mật khẩu webmail (cần giải mã để gửi SMTP). */
export function encryptWebmailPassword(plain) {
  const key = deriveKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${enc.toString("hex")}`;
}

export function decryptWebmailPassword(payload) {
  if (!payload) return null;
  try {
    const [ivHex, tagHex, dataHex] = String(payload).split(":");
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = deriveKey();
    const decipher = crypto.createDecipheriv(ALGO, key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const dec = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return dec.toString("utf8");
  } catch {
    return null;
  }
}

/** Hash bcrypt lưu DB để xác minh đã cấu hình (không trả về client). */
export async function hashWebmailPassword(plain) {
  return bcrypt.hash(String(plain), BCRYPT_ROUNDS);
}

export async function verifyWebmailPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(plain), hash);
}

export const DEFAULT_WEBMAIL_URL = "https://mail.cybertech.com.vn/mail/";
export const DEFAULT_SMTP_HOST = "mail.cybertech.com.vn";
export const DEFAULT_SMTP_PORT = 465;
