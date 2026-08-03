import crypto from "crypto";
import { User } from "../models/User.js";
import { HookEvent } from "../models/HookEvent.js";
import { createNotification } from "./notificationController.js";
import { createBadRequestError, createForbiddenError, AppError } from "../utils/errors.js";

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

function roleLabelOf(user) {
  return user?.roleLabel ?? (user?.role === "ADMIN" ? "ADMIN" : "STAFF");
}

/** User có mục Automation trên FE (mọi role trừ HR). */
export function canAccessAutomation(user) {
  return !!user && roleLabelOf(user) !== "HR";
}

/**
 * Resolve danh sách userId nhận notification.
 * target:
 *  - "automation" | "admins" (mặc định = automation): mọi user có mục Automation (không phải HR)
 *  - "user:<id>"
 *  - "username:<name>"
 */
async function resolveRecipientIds(target) {
  const raw = String(target ?? "automation").trim() || "automation";

  if (raw === "automation" || raw === "admins") {
    // Khớp FE: mọi user active có mục Automation (= không phải HR), kể cả roleLabel null.
    const users = await User.find({
      deletedAt: null,
      disabled: { $ne: true },
    })
      .select("_id role roleLabel")
      .lean();
    return users.filter((u) => roleLabelOf(u) !== "HR").map((u) => u._id);
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
    'target phải là "automation", "admins", "user:<id>" hoặc "username:<name>"'
  );
}

/**
 * GET /api/hooks/events — danh sách webhook cho trang Automation (JWT).
 */
export async function listEvents(req, res, next) {
  try {
    if (!canAccessAutomation(req.user)) {
      return next(createForbiddenError("Chỉ user có mục Automation mới xem được"));
    }
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
    const items = await HookEvent.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const data = items.map((e) => ({
      id: e._id,
      jobId: e._id,
      source: e.source ?? "",
      title: e.title ?? "",
      message: e.message ?? "",
      status: e.status ?? "success",
      notifiedCount: e.notifiedCount ?? 0,
      createdAt: e.createdAt?.toISOString?.() ?? e.createdAt,
    }));
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
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
        message: message.slice(0, MAX_MESSAGE),
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
        target: String(target ?? "automation").trim() || "automation",
      },
    });
  } catch (err) {
    next(err);
  }
}
