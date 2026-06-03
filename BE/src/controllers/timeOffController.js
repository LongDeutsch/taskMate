import crypto from "crypto";
import { TimeOffRequest, TIME_OFF_REASONS, TIME_OFF_SESSIONS, TIME_OFF_STATUSES } from "../models/TimeOffRequest.js";
import { User } from "../models/User.js";
import { createBadRequestError, createForbiddenError, createNotFoundError } from "../utils/errors.js";
import { createNotification } from "./notificationController.js";

function newId() {
  return "to-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function isHr(user) {
  return user?.roleLabel === "HR";
}

function canViewAll(user) {
  return user?.role === "ADMIN" || ["HR", "BODS"].includes(user?.roleLabel);
}

function parseDateOnly(value, field) {
  if (!value) {
    throw createBadRequestError(`${field} is required`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw createBadRequestError(`${field} is invalid`);
  }
  // Chuẩn hoá về 00:00 UTC để so sánh ngày, không lệch timezone.
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function getHrRecipients(excludeUserId) {
  const hrs = await User.find({
    roleLabel: "HR",
    deletedAt: null,
    disabled: false,
  })
    .select("_id")
    .lean();
  return hrs.map((u) => u._id).filter((id) => id !== excludeUserId);
}

function roleLabelOf(user) {
  return user?.roleLabel ?? (user?.role === "ADMIN" ? "ADMIN" : "STAFF");
}

function isTimeOffRecipientCandidate(user) {
  const label = roleLabelOf(user);
  return user?.role === "ADMIN" || label === "HR" || label === "BODS";
}

async function resolveRecipients(requestedRecipientIds, excludeUserId) {
  const requested = Array.isArray(requestedRecipientIds)
    ? requestedRecipientIds.filter((id) => typeof id === "string" && id.trim() !== "")
    : [];
  const hrIds = await getHrRecipients(excludeUserId);
  const ids = [...new Set([...hrIds, ...requested])].filter((id) => id !== excludeUserId);
  if (ids.length === 0) return { recipientIds: [], recipients: [] };

  const users = await User.find({
    _id: { $in: ids },
    deletedAt: null,
    disabled: false,
  })
    .select("_id username fullName role roleLabel")
    .lean();

  const valid = users.filter(isTimeOffRecipientCandidate);
  const validIds = new Set(valid.map((u) => u._id));
  const invalid = ids.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw createBadRequestError("Người nhận phải là tài khoản active có quyền cao hơn Staff");
  }

  return {
    recipientIds: valid.map((u) => u._id),
    recipients: valid.map((u) => ({
      id: u._id,
      fullName: u.fullName ?? "",
      username: u.username ?? "",
      roleLabel: roleLabelOf(u),
    })),
  };
}

function serialize(doc) {
  if (!doc) return null;
  const d = typeof doc.toJSON === "function" ? doc.toJSON() : { ...doc };
  d.id = d._id ?? d.id;
  if (d.startDate instanceof Date) d.startDate = d.startDate.toISOString().slice(0, 10);
  if (d.endDate instanceof Date) d.endDate = d.endDate.toISOString().slice(0, 10);
  if (d.createdAt instanceof Date) d.createdAt = d.createdAt.toISOString();
  if (d.updatedAt instanceof Date) d.updatedAt = d.updatedAt.toISOString();
  if (d.decidedAt instanceof Date) d.decidedAt = d.decidedAt.toISOString();
  return d;
}

export async function create(req, res, next) {
  try {
    const { startDate, endDate, session, reason, reasonOther, recipientIds } = req.body ?? {};

    if (!TIME_OFF_SESSIONS.includes(session)) {
      return next(createBadRequestError("session must be MORNING / AFTERNOON / FULL"));
    }
    if (!TIME_OFF_REASONS.includes(reason)) {
      return next(createBadRequestError("reason invalid"));
    }
    if (reason === "OTHER" && !String(reasonOther ?? "").trim()) {
      return next(createBadRequestError('reasonOther is required when reason is "OTHER"'));
    }

    let start;
    let end;
    try {
      start = parseDateOnly(startDate, "startDate");
      end = parseDateOnly(endDate, "endDate");
    } catch (err) {
      return next(err);
    }
    if (end < start) {
      return next(createBadRequestError("endDate must be after or equal to startDate"));
    }

    // Snapshot tên + role hiển thị của user để HR vẫn thấy được sau này.
    const me = await User.findById(req.user.id).select("fullName roleLabel role").lean();
    const userRoleLabel = roleLabelOf(me);
    const resolvedRecipients = await resolveRecipients(recipientIds, req.user.id);
    if (resolvedRecipients.recipientIds.length === 0) {
      return next(createBadRequestError("Vui lòng chọn ít nhất một người nhận xin off"));
    }

    const id = newId();
    const created = await TimeOffRequest.create({
      _id: id,
      userId: req.user.id,
      userName: me?.fullName ?? req.user.fullName ?? req.user.username ?? "",
      userRoleLabel,
      recipientIds: resolvedRecipients.recipientIds,
      recipients: resolvedRecipients.recipients,
      startDate: start,
      endDate: end,
      session,
      reason,
      reasonOther: reason === "OTHER" ? String(reasonOther).trim() : "",
      status: "pending",
    });

    // Notify người nhận (best-effort). HR luôn được include mặc định.
    await Promise.all(
      resolvedRecipients.recipientIds.map((uid) =>
        createNotification({
          userId: uid,
          type: "time_off_submitted",
          timeOffId: id,
          actorId: req.user.id,
          actorName: req.user.fullName ?? req.user.username ?? "",
          changeSummary: `${created.userName} xin off ${created.startDate.toISOString().slice(0, 10)} → ${created.endDate.toISOString().slice(0, 10)}`,
        })
      )
    );

    res.status(201).json({ success: true, data: serialize(created) });
  } catch (err) {
    next(err);
  }
}

/** Danh sách người nhận mà user có thể chọn khi xin off. */
export async function listRecipients(req, res, next) {
  try {
    const users = await User.find({
      deletedAt: null,
      disabled: false,
    })
      .select("_id username fullName role roleLabel")
      .sort({ roleLabel: 1, fullName: 1 })
      .lean();

    const data = users
      .filter((u) => u._id !== req.user.id)
      .filter(isTimeOffRecipientCandidate)
      .map((u) => ({
        id: u._id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        roleLabel: roleLabelOf(u),
        isDefault: roleLabelOf(u) === "HR",
      }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Yêu cầu của chính user đang đăng nhập. */
export async function listMine(req, res, next) {
  try {
    const items = await TimeOffRequest.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: items.map(serialize) });
  } catch (err) {
    next(err);
  }
}

/** Toàn bộ yêu cầu — chỉ HR và ADMIN xem được. */
export async function listAll(req, res, next) {
  try {
    if (!canViewAll(req.user)) {
      return next(createForbiddenError("Only HR/Admin can view all time-off requests"));
    }
    const { status } = req.query;
    const filter = {};
    if (status && TIME_OFF_STATUSES.includes(status)) filter.status = status;
    const items = await TimeOffRequest.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: items.map(serialize) });
  } catch (err) {
    next(err);
  }
}

/** User huỷ yêu cầu của chính mình khi còn pending. */
export async function cancelMine(req, res, next) {
  try {
    const doc = await TimeOffRequest.findById(req.params.id);
    if (!doc) return next(createNotFoundError("Time-off request not found"));
    if (doc.userId !== req.user.id) {
      return next(createForbiddenError("Cannot cancel other user's request"));
    }
    if (doc.status !== "pending") {
      return next(createBadRequestError("Only pending requests can be cancelled"));
    }
    await doc.deleteOne();
    res.json({ success: true, data: { id: doc._id } });
  } catch (err) {
    next(err);
  }
}

/** HR/Admin duyệt hoặc từ chối. */
export async function setStatus(req, res, next) {
  try {
    if (!canViewAll(req.user)) {
      return next(createForbiddenError("Only HR/Admin can decide time-off requests"));
    }
    const { status, decisionNote } = req.body ?? {};
    if (!["approved", "rejected"].includes(status)) {
      return next(createBadRequestError('status must be "approved" or "rejected"'));
    }
    const doc = await TimeOffRequest.findById(req.params.id);
    if (!doc) return next(createNotFoundError("Time-off request not found"));

    doc.status = status;
    doc.decidedById = req.user.id;
    doc.decidedByName = req.user.fullName ?? req.user.username ?? "";
    doc.decidedAt = new Date();
    doc.decisionNote = String(decisionNote ?? "").slice(0, 500);
    doc.updatedAt = new Date();
    await doc.save();

    // Notify chủ đơn về quyết định.
    await createNotification({
      userId: doc.userId,
      type: "time_off_status_updated",
      timeOffId: doc._id,
      actorId: req.user.id,
      actorName: req.user.fullName ?? req.user.username ?? "",
      changeSummary:
        status === "approved"
          ? `${isHr(req.user) ? "HR" : "Admin"} đã duyệt yêu cầu xin off`
          : `${isHr(req.user) ? "HR" : "Admin"} đã từ chối yêu cầu xin off`,
    });

    res.json({ success: true, data: serialize(doc) });
  } catch (err) {
    next(err);
  }
}
