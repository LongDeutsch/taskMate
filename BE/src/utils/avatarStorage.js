import fs from "fs";

/** Đọc file upload và lưu dạng data URL vào MongoDB (ổn định trên Render). */
export function avatarFromUploadedFile(file) {
  const buffer = fs.readFileSync(file.path);
  const dataUrl = `data:${file.mimetype};base64,${buffer.toString("base64")}`;
  try {
    fs.unlinkSync(file.path);
  } catch {
    /* ignore */
  }
  return dataUrl;
}
