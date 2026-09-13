import { createUnauthorizedError } from "../utils/errors.js";

/**
 * Auth máy trạm gửi mail — header X-Api-Key.
 * Ưu tiên MAIL_AGENT_API_KEY; fallback HOOKS_API_KEY nếu chưa tách key.
 */
export function mailAgentApiKeyAuth(req, res, next) {
  const configured = String(
    process.env.MAIL_AGENT_API_KEY ?? process.env.HOOKS_API_KEY ?? ""
  ).trim();
  if (!configured) {
    return next(
      createUnauthorizedError(
        "MAIL_AGENT_API_KEY (hoặc HOOKS_API_KEY) chưa cấu hình trên server"
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

  req.agentId = String(req.get("x-agent-id") ?? "default-agent").trim() || "default-agent";
  next();
}
