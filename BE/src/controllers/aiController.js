import { createForbiddenError } from "../utils/errors.js";

const AGENT_URL = process.env.AGENT_URL || "http://127.0.0.1:8000/chat";

export async function chatWithAgent(req, res, next) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      throw createForbiddenError("AI assistant is only available for admins");
    }
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    const response = await fetch(AGENT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res
        .status(502)
        .json({ success: false, message: json.message || "AI service error" });
    }
    res.json({ success: true, data: { reply: json.reply ?? "", meta: json.meta ?? null } });
  } catch (err) {
    next(err);
  }
}

