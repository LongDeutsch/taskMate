/** Render set biến này trên mọi service. */
export function isRenderHosted() {
  return Boolean(process.env.RENDER);
}

export function isLikelySmtpPortBlockedError(err) {
  const msg = String(err?.message ?? err);
  const code = String(err?.code ?? "");
  return /timeout|timed out|ETIMEDOUT|ECONNREFUSED|ECONNRESET|ESOCKET/i.test(`${msg} ${code}`);
}

/**
 * Gợi ý khi SMTP timeout trên production (thường do Render free chặn port 465/587).
 * @see https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports
 */
export function smtpFailureHint(err) {
  if (!isLikelySmtpPortBlockedError(err)) {
    return String(err?.message ?? err);
  }
  if (isRenderHosted()) {
    return (
      "Render free tier chặn kết nối ra SMTP (port 465/587). " +
      "Local gửi được vì không bị chặn. Giải pháp: nâng cấp Render lên paid instance (Starter ~$7/tháng), " +
      "hoặc nhờ IT cung cấp relay/API gửi mail."
    );
  }
  return "Không kết nối được SMTP port 465 — kiểm tra firewall hoặc mail server chặn IP server.";
}

export const RENDER_SMTP_DOCS =
  "https://render.com/changelog/free-web-services-will-no-longer-allow-outbound-traffic-to-smtp-ports";
