import crypto from "crypto";
import { TimeOffRequest, TIME_OFF_REASONS, TIME_OFF_SESSIONS, TIME_OFF_STATUSES } from "../models/TimeOffRequest.js";
import { User } from "../models/User.js";
import { createBadRequestError, createForbiddenError, createNotFoundError } from "../utils/errors.js";
import { createNotification } from "./notificationController.js";
import { sendTimeOffEmails } from "../services/mailService.js";
import {
  normalizeBusinessTripSchedule,
  scheduleOverallDateRange,
  serializeBusinessTripSchedule,
} from "../utils/businessTripSchedule.js";

function newId() {
  return "to-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function isHr(user) {
  return roleLabelOf(user) === "HR";
}

function canViewAll(user) {
  return user?.role === "ADMIN" || ["HR", "BODS"].includes(user?.roleLabel);
}

/** PM (ADMIN) và HR — xóa yêu cầu xin off (từng cái / hàng loạt). */
function canManageTimeOff(user) {
  return user?.role === "ADMIN" || roleLabelOf(user) === "HR";
}

/** User active — `disabled` có thể chưa có trên document cũ. */
function activeUserFilter() {
  return {
    deletedAt: null,
    $or: [{ disabled: false }, { disabled: { $exists: false } }],
  };
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
    ...activeUserFilter(),
    roleLabel: "HR",
  })
    .select("_id")
    .lean();
  return hrs.map((u) => u._id).filter((id) => id !== excludeUserId);
}

function roleLabelOf(user) {
  return user?.roleLabel ?? (user?.role === "ADMIN" ? "ADMIN" : "STAFF");
}

async function resolveRecipients(requestedRecipientIds, excludeUserId) {
  const requested = Array.isArray(requestedRecipientIds)
    ? requestedRecipientIds.filter((id) => typeof id === "string" && id.trim() !== "")
    : [];
  // Có chọn cụ thể → chỉ gửi tới HR đã chọn; không chọn → mặc định tất cả HR active.
  const hrIds =
    requested.length > 0 ? requested : await getHrRecipients(excludeUserId);
  const ids = [...new Set(hrIds)].filter((id) => id !== excludeUserId);
  if (ids.length === 0) return { recipientIds: [], recipients: [] };

  const users = await User.find({
    _id: { $in: ids },
    ...activeUserFilter(),
    roleLabel: "HR",
  })
    .select("_id username fullName role roleLabel")
    .lean();

  const validIds = new Set(users.map((u) => u._id));
  const invalid = ids.filter((id) => !validIds.has(id));
  if (invalid.length > 0) {
    throw createBadRequestError("Người nhận phải là tài khoản HR active");
  }

  return {
    recipientIds: users.map((u) => u._id),
    recipients: users.map((u) => ({
      id: u._id,
      fullName: u.fullName ?? "",
      username: u.username ?? "",
      roleLabel: "HR",
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
  if (Array.isArray(d.businessTripSchedule) && d.businessTripSchedule.length > 0) {
    d.businessTripSchedule = serializeBusinessTripSchedule(d.businessTripSchedule);
  }
  return d;
}

export async function create(req, res, next) {
  try {
    const {
      startDate,
      endDate,
      session,
      reason,
      reasonOther,
      details,
      businessTripSchedule,
      recipientIds,
      skipMail,
    } = req.body ?? {};

    if (!TIME_OFF_SESSIONS.includes(session)) {
      return next(createBadRequestError("session must be MORNING / AFTERNOON / FULL"));
    }
    if (!TIME_OFF_REASONS.includes(reason)) {
      return next(createBadRequestError("reason invalid"));
    }
    if (reason === "OTHER" && !String(reasonOther ?? "").trim()) {
      return next(createBadRequestError('reasonOther is required when reason is "OTHER"'));
    }

    let normalizedSchedule = [];
    if (reason === "BUSINESS_TRIP") {
      try {
        normalizedSchedule = normalizeBusinessTripSchedule(businessTripSchedule);
      } catch (err) {
        return next(err);
      }
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

    if (reason === "BUSINESS_TRIP" && normalizedSchedule.length > 0) {
      const range = scheduleOverallDateRange(
        serializeBusinessTripSchedule(normalizedSchedule)
      );
      if (range.start) start = parseDateOnly(range.start, "startDate");
      if (range.end) end = parseDateOnly(range.end, "endDate");
    }

    // Snapshot tên + role hiển thị của user để HR vẫn thấy được sau này.
    const me = await User.findById(req.user.id).select("fullName roleLabel role").lean();
    const userRoleLabel = roleLabelOf(me);
    const resolvedRecipients = await resolveRecipients(recipientIds, req.user.id);
    if (resolvedRecipients.recipientIds.length === 0) {
      return next(createBadRequestError("Chưa có tài khoản HR active để nhận yêu cầu xin off"));
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
      details: reason === "BUSINESS_TRIP" ? "" : String(details ?? "").trim(),
      businessTripSchedule: reason === "BUSINESS_TRIP" ? normalizedSchedule : [],
      status: "pending",
    });

    // Notify người nhận đã chọn (best-effort).
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

    const recipientUsers = await User.find({ _id: { $in: resolvedRecipients.recipientIds } })
      .select("email")
      .lean();
    const recipientEmails = [
      ...new Set(
        recipientUsers
          .map((u) => String(u.email ?? "").trim().toLowerCase())
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];

    let mailResult = null;
    if (skipMail === true) {
      mailResult = {
        skipped: true,
        note: "Mail đã gửi từ app local — BE không gửi SMTP.",
      };
    } else if (recipientEmails.length === 0) {
      mailResult = {
        skipped: true,
        note: "Người nhận chưa có email trong hồ sơ — không gửi SMTP.",
      };
    } else {
      const meMail = await User.findById(req.user.id)
        .select("email webmailUrl smtpHost webmailPasswordEnc")
        .lean();
      if (!meMail?.email || !meMail?.webmailPasswordEnc) {
        mailResult = {
          error: "Chưa cấu hình email và mật khẩu webmail trong Profile",
        };
      } else {
        mailResult = {
          queued: true,
          recipients: recipientEmails,
          note: "Yêu cầu đã lưu. Email đang được gửi nền — kiểm tra hộp thư đến người nhận sau 1–2 phút.",
        };
        const mailUser = meMail;
        const mailRequest = created;
        void sendTimeOffEmails(mailUser, recipientEmails, mailRequest)
          .then((result) => {
            if (result.sent?.length) {
              console.info("[time-off] mail sent:", result.sent.join(", "));
            }
            if (result.failed?.length) {
              console.warn("[time-off] mail failed:", result.failed.join(", "));
            }
          })
          .catch((mailErr) => {
            console.warn("[time-off] background mail error:", mailErr?.message ?? mailErr);
          });
      }
    }

    res.status(201).json({
      success: true,
      data: serialize(created),
      mail: mailResult,
    });
  } catch (err) {
    next(err);
  }
}

/** Danh sách người nhận xin off — tất cả HR active (trừ chính mình). */
export async function listRecipients(req, res, next) {
  try {
    const users = await User.find({
      ...activeUserFilter(),
      roleLabel: "HR",
    })
      .select("_id username fullName role roleLabel email")
      .sort({ fullName: 1, username: 1 })
      .lean();

    const data = users
      .filter((u) => u._id !== req.user.id)
      .map((u) => ({
        id: u._id,
        username: u.username,
        fullName: u.fullName,
        role: u.role,
        roleLabel: "HR",
        email: String(u.email ?? "").trim() || undefined,
        isDefault: true,
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

/** Xóa yêu cầu — chỉ PM (ADMIN) và HR. */
export async function cancelMine(req, res, next) {
  try {
    if (!canManageTimeOff(req.user)) {
      return next(createForbiddenError("Chỉ PM và HR mới được xóa yêu cầu xin off"));
    }
    const doc = await TimeOffRequest.findById(req.params.id);
    if (!doc) return next(createNotFoundError("Time-off request not found"));
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
