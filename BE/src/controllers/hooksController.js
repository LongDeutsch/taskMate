import crypto from "crypto";
import { User } from "../models/User.js";
import { HookEvent } from "../models/HookEvent.js";
import { createNotification } from "./notificationController.js";
import { createBadRequestError, AppError } from "../utils/errors.js";

const ALLOWED_STATUS = new Set(["success", "failed", "running"]);
const MAX_TITLE = 200;
const MAX_MESSAGE = 2000;
const MAX_SOURCE = 100;
const MAX_JOB_ID = 120;

/** Rate limit đơn giản theo API key (in-memory; reset khi process restart). */
const rateBuckets = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 30;

function checkRateLimit(key) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || now - bucket.windowStart > RATE_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    rateBuckets.set(key, bucket);
  }
  bucket.count += 1;
  return bucket.count <= RATE_MAX;
}

function newFallbackJobId() {
  return "job-" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

/**
 * Resolve danh sách userId nhận notification.
 * target:
 *  - "admins" (mặc định)
 *  - "user:<id>"
 *  - "username:<name>"
 */
async function resolveRecipientIds(target) {
  const raw = String(target ?? "admins").trim() || "admins";

  if (raw === "admins") {
    const admins = await User.find({
      role: "ADMIN",
      deletedAt: null,
      disabled: { $ne: true },
    })
      .select("_id")
      .lean();
    return admins.map((u) => u._id);
  }

  if (raw.startsWith("user:")) {
    const id = raw.slice(5).trim();
    if (!id) return [];
    const u = await User.findOne({ _id: id, deletedAt: null, disabled: { $ne: true } })
      .select("_id")
      .lean();
    return u ? [u._id] : [];
  }

  if (raw.startsWith("username:")) {
    const username = raw.slice(9).trim();
    if (!username) return [];
    const u = await User.findOne({
      username,
      deletedAt: null,
      disabled: { $ne: true },
    })
      .select("_id")
      .lean();
    return u ? [u._id] : [];
  }

  throw createBadRequestError(
    'target phải là "admins", "user:<id>" hoặc "username:<name>"'
  );
}

/**
 * POST /api/hooks/events
 * Body: { title, message, status?, source?, jobId?, target? }
 */
export async function postEvent(req, res, next) {
  try {
    const apiKey = String(req.get("x-api-key") ?? process.env.HOOKS_API_KEY ?? "");
    if (!checkRateLimit(apiKey)) {
      return next(new AppError("Too many requests — tối đa 30 lần/phút", 429));
    }

    const title = String(req.body?.title ?? "").trim();
    const message = String(req.body?.message ?? "").trim();
    const statusRaw = String(req.body?.status ?? "success").trim().toLowerCase();
    const source = String(req.body?.source ?? "external").trim().slice(0, MAX_SOURCE);
    const jobIdRaw = String(req.body?.jobId ?? "").trim().slice(0, MAX_JOB_ID);
    const target = req.body?.target;

    if (!title) return next(createBadRequestError("title is required"));
    if (!message) return next(createBadRequestError("message is required"));
    if (title.length > MAX_TITLE) {
      return next(createBadRequestError(`title tối đa ${MAX_TITLE} ký tự`));
    }
    if (message.length > MAX_MESSAGE) {
      return next(createBadRequestError(`message tối đa ${MAX_MESSAGE} ký tự`));
    }
    if (!ALLOWED_STATUS.has(statusRaw)) {
      return next(createBadRequestError("status phải là success | failed | running"));
    }

    const jobId = jobIdRaw || newFallbackJobId();

    try {
      await HookEvent.create({
        _id: jobId,
        source,
        title: title.slice(0, MAX_TITLE),
        status: statusRaw,
        notifiedCount: 0,
      });
    } catch (err) {
      if (err?.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "jobId đã được gửi trước đó (idempotent)",
          data: { jobId, duplicate: true },
        });
      }
      throw err;
    }

    const recipientIds = await resolveRecipientIds(target);
    if (recipientIds.length === 0) {
      return next(createBadRequestError("Không tìm thấy người nhận phù hợp với target"));
    }

    const statusTag =
      statusRaw === "failed" ? "❌" : statusRaw === "running" ? "⏳" : "✅";
    const changeSummary = `${statusTag} [${statusRaw}] ${message}`.slice(0, MAX_MESSAGE);

    let notified = 0;
    for (const userId of recipientIds) {
      const doc = await createNotification({
        userId,
        type: "external_job",
        taskId: null,
        taskTitle: title.slice(0, MAX_TITLE),
        actorId: null,
        actorName: source || "external",
        changeSummary,
      });
      if (doc) notified += 1;
    }

    await HookEvent.updateOne({ _id: jobId }, { $set: { notifiedCount: notified } });

    res.status(200).json({
      success: true,
      data: {
        jobId,
        notified,
        status: statusRaw,
        source,
      },
    });
  } catch (err) {
    next(err);
  }
}
