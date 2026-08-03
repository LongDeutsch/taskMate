import { createUnauthorizedError } from "../utils/errors.js";

/**
 * Xác thực webhook bằng header X-Api-Key (khớp env HOOKS_API_KEY trên Render).
 * Không dùng JWT user — dành cho script crawl / job bên ngoài.
 */
export function hooksApiKeyAuth(req, res, next) {
  const configured = String(process.env.HOOKS_API_KEY ?? "").trim();
  if (!configured) {
    return next(
      createUnauthorizedError(
        "HOOKS_API_KEY chưa được cấu hình trên server — thêm biến môi trường rồi redeploy"
      )
    );
  }

  const headerKey = String(req.get("x-api-key") ?? "").trim();
  const bearer = String(req.get("authorization") ?? "");
  const bearerKey = bearer.toLowerCase().startsWith("bearer ")
    ? bearer.slice(7).trim()
    : "";
  const provided = headerKey || bearerKey;

  if (!provided || provided !== configured) {
    return next(createUnauthorizedError("Invalid or missing API key"));
  }
  next();
}
