const MAX_EDGE = 512;
const JPEG_QUALITY = 0.82;
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

/** Kiểm tra file avatar trước khi upload. Trả về thông báo lỗi hoặc null nếu hợp lệ. */
export function validateAvatarFile(file: File): string | null {
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return "Chỉ chấp nhận JPG, PNG, GIF hoặc WebP";
  }
  if (file.size > MAX_AVATAR_SIZE_BYTES) {
    return file.type === "image/gif"
      ? "GIF tối đa 5 MB"
      : "Ảnh tối đa 5 MB";
  }
  return null;
}

/**
 * Chuẩn bị ảnh đại diện trước khi upload.
 * GIF giữ nguyên (có animation); ảnh tĩnh nén JPEG để giảm dung lượng DB.
 */
export async function compressAvatarFile(file: File): Promise<File> {
  const validationError = validateAvatarFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  if (file.type === "image/gif") {
    return file;
  }

  if (!file.type.startsWith("image/")) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY);
    });
    if (!blob) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
