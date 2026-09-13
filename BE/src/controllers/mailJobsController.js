import crypto from "crypto";
import { MailJob } from "../models/MailJob.js";
import { MailStationAccount } from "../models/MailStationAccount.js";
import { User } from "../models/User.js";
import { TimeOffRequest, TIME_OFF_REASONS, TIME_OFF_SESSIONS } from "../models/TimeOffRequest.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../utils/errors.js";
import { createNotification } from "./notificationController.js";
import {
  encryptWebmailPassword,
  decryptWebmailPassword,
} from "../utils/mailCredentials.js";
import { buildTimeOffEmailContent } from "../utils/timeOffLabels.js";
import { textToSimpleHtml } from "../utils/mailTemplate.js";
import {
  normalizeBusinessTripSchedule,
  scheduleOverallDateRange,
  serializeBusinessTripSchedule,
} from "../utils/businessTripSchedule.js";

function textToHtmlFromPlain(text) {
  return textToSimpleHtml(text);
}

function newJobId() {
  return "mj-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function newTimeOffId() {
  return "to-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function newStationAccountId() {
  return "msa-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function roleLabelOf(user) {
  return user?.roleLabel ?? (user?.role === "ADMIN" ? "ADMIN" : "STAFF");
}

function activeUserFilter() {
  return {
    deletedAt: null,
    $or: [{ disabled: false }, { disabled: { $exists: false } }],
  };
}

function parseDateOnly(value, field) {
  if (!value) throw createBadRequestError(`${field} is required`);
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) throw createBadRequestError(`${field} is invalid`);
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

async function getHrRecipients(excludeUserId) {
  const hrs = await User.find({ ...activeUserFilter(), roleLabel: "HR" })
    .select("_id")
    .lean();
  return hrs.map((u) => u._id).filter((id) => id !== excludeUserId);
}

async function resolveRecipients(requestedRecipientIds, excludeUserId) {
  const requested = Array.isArray(requestedRecipientIds)
    ? requestedRecipientIds.filter((id) => typeof id === "string" && id.trim() !== "")
    : [];
  const hrIds = requested.length > 0 ? requested : await getHrRecipients(excludeUserId);
  const ids = [...new Set(hrIds)].filter((id) => id !== excludeUserId);
  if (ids.length === 0) return { recipientIds: [], recipients: [] };

  const users = await User.find({
    _id: { $in: ids },
    ...activeUserFilter(),
    roleLabel: "HR",
  })
    .select("_id username fullName role roleLabel email")
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
      email: String(u.email ?? "").trim().toLowerCase(),
    })),
  };
}

function serializeJob(doc, { includeSecrets = false } = {}) {
  if (!doc) return null;
  const d = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const out = {
    id: d._id,
    status: d.status,
    userId: d.userId,
    userName: d.userName,
    mail: {
      to: d.mail?.to ?? [],
      subject: d.mail?.subject ?? "",
      text: d.mail?.text ?? "",
      html: d.mail?.html ?? "",
    },
    claimedBy: d.claimedBy || "",
    error: d.error || "",
    sentTo: d.sentTo ?? [],
    timeOffId: d.timeOffId ?? null,
    hasCredentialsPending: Boolean(d.credentialsPasswordEnc),
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
  };
  if (includeSecrets && d.credentialsPasswordEnc) {
    out.credentials = {
      email: d.credentialsEmail || "",
      password: decryptWebmailPassword(d.credentialsPasswordEnc) || "",
    };
  }
  return out;
}

/**
 * Tạo TimeOffRequest + notify HR (không gửi SMTP BE).
 */
async function persistTimeOffFromJob(job) {
  const payload = job.requestPayload ?? {};
  const me = await User.findById(job.userId).select("fullName roleLabel role username").lean();
  if (!me) throw createBadRequestError("User tạo job không còn tồn tại");

  const id = newTimeOffId();
  const created = await TimeOffRequest.create({
    _id: id,
    userId: job.userId,
    userName: job.userName || me.fullName || me.username || "",
    userRoleLabel: roleLabelOf(me),
    recipientIds: payload.recipientIds ?? [],
    recipients: (payload.recipients ?? []).map((r) => ({
      id: r.id,
      fullName: r.fullName ?? "",
      username: r.username ?? "",
      roleLabel: "HR",
    })),
    startDate: new Date(`${String(payload.startDate).slice(0, 10)}T00:00:00.000Z`),
    endDate: new Date(`${String(payload.endDate).slice(0, 10)}T00:00:00.000Z`),
    session: payload.session,
    reason: payload.reason,
    reasonOther: payload.reason === "OTHER" ? String(payload.reasonOther ?? "").trim() : "",
    details: payload.reason === "BUSINESS_TRIP" ? "" : String(payload.details ?? "").trim(),
    businessTripSchedule: payload.businessTripSchedule ?? [],
    status: "pending",
  });

  await Promise.all(
    (payload.recipientIds ?? []).map((uid) =>
      createNotification({
        userId: uid,
        type: "time_off_submitted",
        timeOffId: id,
        actorId: job.userId,
        actorName: job.userName || "",
        changeSummary: `${created.userName} xin off ${created.startDate.toISOString().slice(0, 10)} → ${created.endDate.toISOString().slice(0, 10)}`,
      })
    )
  );

  return id;
}

/** User JWT — tạo MailJob từ form Xin off (chưa tạo TimeOff). */
export async function createJob(req, res, next) {
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
      /** Bản nháp đã review trên FE — ưu tiên dùng nếu hợp lệ */
      mailDraft,
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

    const me = await User.findById(req.user.id)
      .select("fullName roleLabel role mailTemplate")
      .lean();
    const userName = me?.fullName ?? req.user.fullName ?? req.user.username ?? "";
    const resolved = await resolveRecipients(recipientIds, req.user.id);
    if (resolved.recipientIds.length === 0) {
      return next(createBadRequestError("Chưa có tài khoản HR active để nhận yêu cầu xin off"));
    }

    const recipientEmails = [
      ...new Set(
        resolved.recipients
          .map((r) => r.email)
          .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e))
      ),
    ];
    if (recipientEmails.length === 0) {
      return next(
        createBadRequestError("HR chưa có email trong hồ sơ — không thể gửi mail qua máy trạm")
      );
    }

    const emailRequest = {
      userName,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      session,
      reason,
      reasonOther: reason === "OTHER" ? String(reasonOther).trim() : "",
      details: reason === "BUSINESS_TRIP" ? "" : String(details ?? "").trim(),
      businessTripSchedule:
        reason === "BUSINESS_TRIP" ? serializeBusinessTripSchedule(normalizedSchedule) : [],
    };

    const generated = buildTimeOffEmailContent(emailRequest, me?.mailTemplate);
    const draftSubject = String(mailDraft?.subject ?? "").trim();
    const draftText = String(mailDraft?.text ?? "").trim();
    const draftHtml = String(mailDraft?.html ?? "").trim();
    const subject = draftSubject || generated.subject;
    const text = draftText || generated.text;
    const html = draftHtml || (draftText ? textToHtmlFromPlain(draftText) : generated.html);

    const id = newJobId();
    const now = new Date();
    const job = await MailJob.create({
      _id: id,
      status: "queued",
      userId: req.user.id,
      userName,
      requestPayload: {
        startDate: emailRequest.startDate,
        endDate: emailRequest.endDate,
        session,
        reason,
        reasonOther: emailRequest.reasonOther,
        details: emailRequest.details,
        businessTripSchedule: reason === "BUSINESS_TRIP" ? normalizedSchedule : [],
        recipientIds: resolved.recipientIds,
        recipients: resolved.recipients.map(({ id: rid, fullName, username, roleLabel }) => ({
          id: rid,
          fullName,
          username,
          roleLabel,
        })),
      },
      mail: { to: recipientEmails, subject, text, html },
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      data: serializeJob(job),
      message: "Đã tạo job — chờ máy trạm nhận và gửi mail",
    });
  } catch (err) {
    next(err);
  }
}

/** User JWT — xem trạng thái job. */
export async function getJob(req, res, next) {
  try {
    const job = await MailJob.findById(req.params.id).lean();
    if (!job) return next(createNotFoundError("Mail job not found"));
    if (job.userId !== req.user.id && req.user.role !== "ADMIN") {
      return next(createForbiddenError("Không có quyền xem job này"));
    }
    res.json({ success: true, data: serializeJob(job) });
  } catch (err) {
    next(err);
  }
}

/**
 * User JWT — nhập email/mật khẩu lần đầu khi job = need_credentials.
 * Agent sẽ lấy credentials qua /next rồi xóa khỏi BE.
 */
export async function submitCredentials(req, res, next) {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(createBadRequestError("Email không hợp lệ"));
    }
    if (!password || password.length < 3) {
      return next(createBadRequestError("Mật khẩu webmail bắt buộc"));
    }

    const job = await MailJob.findById(req.params.id);
    if (!job) return next(createNotFoundError("Mail job not found"));
    if (job.userId !== req.user.id) {
      return next(createForbiddenError("Không có quyền cập nhật job này"));
    }
    if (job.status !== "need_credentials") {
      return next(
        createBadRequestError(`Job đang ở trạng thái ${job.status} — không nhận credentials`)
      );
    }

    job.credentialsEmail = email;
    job.credentialsPasswordEnc = encryptWebmailPassword(password);
    job.credentialsReadyAt = new Date();
    job.updatedAt = new Date();
    await job.save();

    res.json({
      success: true,
      data: serializeJob(job),
      message: "Đã lưu tạm credentials — máy trạm sẽ lấy và gửi mail",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Agent — lấy job tiếp theo (queued) hoặc job need_credentials đã có credentials.
 * Outbound poll từ máy trạm.
 */
export async function claimNext(req, res, next) {
  try {
    const agentId = req.agentId || "default-agent";

    // Ưu tiên job đang chờ credentials của agent này
    let job = await MailJob.findOneAndUpdate(
      {
        status: "need_credentials",
        claimedBy: agentId,
        credentialsPasswordEnc: { $ne: "" },
      },
      { $set: { status: "sending", updatedAt: new Date() } },
      { sort: { credentialsReadyAt: 1 }, new: true }
    );

    if (!job) {
      job = await MailJob.findOneAndUpdate(
        { status: "queued" },
        {
          $set: {
            status: "claimed",
            claimedBy: agentId,
            claimedAt: new Date(),
            updatedAt: new Date(),
          },
        },
        { sort: { createdAt: 1 }, new: true }
      );
    }

    if (!job) {
      return res.status(204).end();
    }

    const data = serializeJob(job, { includeSecrets: true });
    // Xóa credentials tạm ngay sau khi trả về agent
    if (job.credentialsPasswordEnc) {
      await MailJob.updateOne(
        { _id: job._id },
        {
          $set: {
            credentialsPasswordEnc: "",
            credentialsEmail: "",
            credentialsReadyAt: null,
            updatedAt: new Date(),
          },
        }
      );
    }

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Agent — cập nhật trạng thái: need_credentials | sent | failed
 */
export async function agentUpdate(req, res, next) {
  try {
    const agentId = req.agentId || "default-agent";
    const status = String(req.body?.status ?? "").trim().toLowerCase();
    const error = String(req.body?.error ?? "").trim();
    const sentTo = Array.isArray(req.body?.sentTo)
      ? req.body.sentTo.map((e) => String(e).trim()).filter(Boolean)
      : [];

    if (!["need_credentials", "sent", "failed", "sending"].includes(status)) {
      return next(
        createBadRequestError("status phải là need_credentials | sending | sent | failed")
      );
    }

    const job = await MailJob.findById(req.params.id);
    if (!job) return next(createNotFoundError("Mail job not found"));
    if (job.claimedBy && job.claimedBy !== agentId) {
      return next(createForbiddenError("Job đang được agent khác xử lý"));
    }

    if (status === "need_credentials") {
      job.status = "need_credentials";
      job.claimedBy = agentId;
      job.error = error || "";
      job.credentialsEmail = "";
      job.credentialsPasswordEnc = "";
      job.credentialsReadyAt = null;
      job.updatedAt = new Date();
      await job.save();
      return res.json({ success: true, data: serializeJob(job) });
    }

    if (status === "sending") {
      job.status = "sending";
      job.updatedAt = new Date();
      await job.save();
      return res.json({ success: true, data: serializeJob(job) });
    }

    if (status === "failed") {
      job.status = "failed";
      job.error = error || "Gửi mail thất bại";
      job.updatedAt = new Date();
      await job.save();
      return res.json({ success: true, data: serializeJob(job) });
    }

    // sent
    if (job.status === "sent" && job.timeOffId) {
      return res.json({ success: true, data: serializeJob(job), message: "Already sent" });
    }

    let timeOffId = job.timeOffId;
    if (!timeOffId) {
      timeOffId = await persistTimeOffFromJob(job);
    }
    job.status = "sent";
    job.sentTo = sentTo.length ? sentTo : job.mail?.to ?? [];
    job.timeOffId = timeOffId;
    job.error = "";
    job.updatedAt = new Date();
    await job.save();

    res.json({
      success: true,
      data: serializeJob(job),
      message: "Mail sent — time-off created",
    });
  } catch (err) {
    next(err);
  }
}

function serializeStationAccount(doc, { includeSecrets = false } = {}) {
  if (!doc) return null;
  const d = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  const out = {
    id: d._id,
    userId: d.userId,
    email: d.email,
    status: d.status,
    error: d.error || "",
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
  };
  if (includeSecrets && d.passwordEnc) {
    out.password = decryptWebmailPassword(d.passwordEnc) || "";
  }
  return out;
}

/**
 * User JWT — xếp hàng cập nhật email/mật khẩu trên máy trạm (ghi đè accounts.json).
 */
export async function requestStationAccountUpdate(req, res, next) {
  try {
    const email = String(req.body?.email ?? "").trim().toLowerCase();
    const password = String(req.body?.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return next(createBadRequestError("Email không hợp lệ"));
    }
    if (!password || password.length < 3) {
      return next(createBadRequestError("Mật khẩu webmail bắt buộc"));
    }

    // Hủy các pending cũ của cùng user (chỉ giữ bản mới nhất)
    await MailStationAccount.updateMany(
      { userId: req.user.id, status: "pending" },
      {
        $set: {
          status: "failed",
          error: "Đã bị thay bởi yêu cầu cập nhật mới hơn",
          passwordEnc: "",
          updatedAt: new Date(),
        },
      }
    );

    const id = newStationAccountId();
    const now = new Date();
    const doc = await MailStationAccount.create({
      _id: id,
      userId: req.user.id,
      email,
      passwordEnc: encryptWebmailPassword(password),
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({
      success: true,
      data: serializeStationAccount(doc),
      message: "Đã gửi yêu cầu cập nhật — chờ máy trạm xác thực SMTP và ghi đè",
    });
  } catch (err) {
    next(err);
  }
}

/** User JWT — xem trạng thái yêu cầu cập nhật account */
export async function getStationAccountUpdate(req, res, next) {
  try {
    const doc = await MailStationAccount.findById(req.params.id).lean();
    if (!doc) return next(createNotFoundError("Station account update not found"));
    if (doc.userId !== req.user.id && req.user.role !== "ADMIN") {
      return next(createForbiddenError("Không có quyền xem yêu cầu này"));
    }
    res.json({ success: true, data: serializeStationAccount(doc) });
  } catch (err) {
    next(err);
  }
}

/**
 * Agent — lấy 1 yêu cầu cập nhật account pending.
 * Trả secrets một lần rồi xóa passwordEnc trên BE.
 */
export async function claimStationAccountUpdate(req, res, next) {
  try {
    const agentId = req.agentId || "default-agent";
    const doc = await MailStationAccount.findOneAndUpdate(
      { status: "pending", passwordEnc: { $ne: "" } },
      {
        $set: {
          claimedBy: agentId,
          updatedAt: new Date(),
        },
      },
      { sort: { createdAt: 1 }, new: true }
    );

    if (!doc) {
      return res.status(204).end();
    }

    const data = serializeStationAccount(doc, { includeSecrets: true });
    await MailStationAccount.updateOne(
      { _id: doc._id },
      { $set: { passwordEnc: "", updatedAt: new Date() } }
    );

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/** Agent — báo applied / failed sau khi verify SMTP + ghi accounts.json */
export async function reportStationAccountUpdate(req, res, next) {
  try {
    const agentId = req.agentId || "default-agent";
    const status = String(req.body?.status ?? "").trim().toLowerCase();
    const error = String(req.body?.error ?? "").trim();

    if (!["applied", "failed"].includes(status)) {
      return next(createBadRequestError("status phải là applied | failed"));
    }

    const doc = await MailStationAccount.findById(req.params.id);
    if (!doc) return next(createNotFoundError("Station account update not found"));
    if (doc.claimedBy && doc.claimedBy !== agentId) {
      return next(createForbiddenError("Update đang được agent khác xử lý"));
    }

    doc.status = status;
    doc.error = status === "failed" ? error || "Cập nhật thất bại" : "";
    doc.passwordEnc = "";
    doc.updatedAt = new Date();
    await doc.save();

    res.json({ success: true, data: serializeStationAccount(doc) });
  } catch (err) {
    next(err);
  }
}
