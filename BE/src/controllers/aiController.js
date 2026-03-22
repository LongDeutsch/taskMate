import { createForbiddenError } from "../utils/errors.js";

/** FastAPI AI chỉ có POST /chat — nhiều người set env chỉ domain (thiếu /chat) → 404. */
function resolveAgentUrl(raw) {
  const fallback = "http://127.0.0.1:8000/chat";
  const s = (raw || fallback).trim().replace(/\/+$/, "");
  if (s.endsWith("/chat")) return s;
  return `${s}/chat`;
}

const AGENT_URL = resolveAgentUrl(process.env.AGENT_URL);
const AI_FETCH_RETRIES = Number(process.env.AI_FETCH_RETRIES || "1"); // retry once by default
const AI_FETCH_RETRY_DELAY_MS = Number(process.env.AI_FETCH_RETRY_DELAY_MS || "45000");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function chatWithAgent(req, res, next) {
  try {
    if (!req.user || req.user.role !== "ADMIN") {
      throw createForbiddenError("AI assistant is only available for admins");
    }
    const { message } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ success: false, message: "message is required" });
    }

    let lastError;
    for (let attempt = 0; attempt <= AI_FETCH_RETRIES; attempt++) {
      try {
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

        return res.json({
          success: true,
          data: { reply: json.reply ?? "", meta: json.meta ?? null },
        });
      } catch (err) {
        lastError = err;
        if (attempt < AI_FETCH_RETRIES) {
          await sleep(AI_FETCH_RETRY_DELAY_MS);
          continue;
        }
      }
    }

    // If we reach here, all retry attempts failed.
    throw lastError;
  } catch (err) {
    next(err);
  }
}

