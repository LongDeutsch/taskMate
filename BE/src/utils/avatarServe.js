import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "avatars");

/** Parse data URL lưu trong MongoDB → buffer + mime. */
export function parseAvatarDataUrl(dataUrl) {
  const match = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], "base64") };
}

/** Trả buffer ảnh từ giá trị `avatar` trong DB (data URL hoặc tên file cũ). */
export function readAvatarPayload(avatar) {
  if (!avatar) return null;
  if (String(avatar).startsWith("data:")) {
    return parseAvatarDataUrl(avatar);
  }
  const filename = String(avatar).replace(/^\/avatars\//, "");
  const filePath = path.join(UPLOAD_DIR, filename);
  if (!fs.existsSync(filePath)) return null;
  const ext = path.extname(filename).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : ext === ".gif"
          ? "image/gif"
          : "image/jpeg";
  return { mime, buffer: fs.readFileSync(filePath) };
}
