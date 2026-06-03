import crypto from "crypto";
import { Notification } from "../models/Notification.js";
import { createNotFoundError } from "../utils/errors.js";

function newNotificationId() {
  return "n-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

/**
 * Tạo notification cho 1 user. Best-effort: lỗi sẽ được ghi log nhưng KHÔNG ném ra
 * để không chặn flow tạo/sửa task.
 */
export async function createNotification({
  userId,
  type,
  taskId,
  taskTitle,
  timeOffId,
  actorId,
  actorName,
  changeSummary,
}) {
  if (!userId || userId === actorId) return null;
  try {
    const doc = await Notification.create({
      _id: newNotificationId(),
      userId,
      type,
      taskId: taskId ?? null,
      taskTitle: taskTitle ?? "",
      timeOffId: timeOffId ?? null,
      actorId: actorId ?? null,
      actorName: actorName ?? "",
      changeSummary: changeSummary ?? "",
      read: false,
    });
    return doc;
  } catch (err) {
    console.warn("[notifications] create failed:", err?.message ?? err);
    return null;
  }
}

export async function list(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const onlyUnread = req.query.unread === "true" || req.query.unread === "1";
    const filter = { userId: req.user.id };
    if (onlyUnread) filter.read = false;
    const items = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const data = items.map((n) => ({
      ...n,
      id: n._id,
      createdAt: n.createdAt?.toISOString?.() ?? n.createdAt,
    }));
    const unreadCount = await Notification.countDocuments({ userId: req.user.id, read: false });
    res.json({ success: true, data: { items: data, unreadCount } });
  } catch (err) {
    next(err);
  }
}

export async function markRead(req, res, next) {
  try {
    const n = await Notification.findOne({ _id: req.params.id, userId: req.user.id });
    if (!n) return next(createNotFoundError("Notification not found"));
    if (!n.read) {
      n.read = true;
      await n.save();
    }
    res.json({ success: true, data: { id: n._id, read: true } });
  } catch (err) {
    next(err);
  }
}

export async function markAllRead(req, res, next) {
  try {
    const r = await Notification.updateMany(
      { userId: req.user.id, read: false },
      { $set: { read: true } }
    );
    res.json({ success: true, data: { matched: r.matchedCount ?? r.n ?? 0, modified: r.modifiedCount ?? r.nModified ?? 0 } });
  } catch (err) {
    next(err);
  }
}
