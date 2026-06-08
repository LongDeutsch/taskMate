import crypto from "crypto";
import { BugReport, BUG_STATUSES } from "../models/BugReport.js";
import { User } from "../models/User.js";
import {
  createBadRequestError,
  createForbiddenError,
  createNotFoundError,
} from "../utils/errors.js";

function newId() {
  return "bug-" + crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

function isAdmin(user) {
  return user?.role === "ADMIN";
}

function serialize(doc) {
  if (!doc) return null;
  const d = typeof doc.toJSON === "function" ? doc.toJSON() : { ...doc };
  d.id = d._id ?? d.id;
  if (d.createdAt instanceof Date) d.createdAt = d.createdAt.toISOString();
  if (d.updatedAt instanceof Date) d.updatedAt = d.updatedAt.toISOString();
  return d;
}

export async function create(req, res, next) {
  try {
    const title = String(req.body?.title ?? "").trim();
    const content = String(req.body?.content ?? "").trim();
    if (!title) return next(createBadRequestError("title is required"));
    if (!content) return next(createBadRequestError("content is required"));
    if (title.length > 200) return next(createBadRequestError("title too long (max 200)"));
    if (content.length > 5000) return next(createBadRequestError("content too long (max 5000)"));

    const me = await User.findById(req.user.id).select("fullName username").lean();
    const id = newId();
    const now = new Date();
    const created = await BugReport.create({
      _id: id,
      userId: req.user.id,
      userName: me?.fullName ?? req.user.fullName ?? req.user.username ?? "",
      title,
      content,
      status: "todo",
      createdAt: now,
      updatedAt: now,
    });

    res.status(201).json({ success: true, data: serialize(created) });
  } catch (err) {
    next(err);
  }
}

/** Danh sách bug: Admin xem tất cả, Staff chỉ xem của mình. */
export async function list(req, res, next) {
  try {
    const filter = isAdmin(req.user) ? {} : { userId: req.user.id };
    const bugs = await BugReport.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: bugs.map(serialize) });
  } catch (err) {
    next(err);
  }
}

/** Bug mở (todo / in_progress) cho dashboard — mọi user đều thấy để xem. */
export async function listOpen(req, res, next) {
  try {
    const bugs = await BugReport.find({
      status: { $in: ["todo", "in_progress"] },
    })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: bugs.map(serialize) });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const bug = await BugReport.findById(req.params.id).lean();
    if (!bug) return next(createNotFoundError("Bug report not found"));
    res.json({ success: true, data: serialize(bug) });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const bug = await BugReport.findById(req.params.id);
    if (!bug) return next(createNotFoundError("Bug report not found"));

    if (bug.userId !== req.user.id) {
      return next(createForbiddenError("Only the bug creator can edit this report"));
    }

    const title = String(req.body?.title ?? "").trim();
    const content = String(req.body?.content ?? "").trim();
    if (!title) return next(createBadRequestError("title is required"));
    if (!content) return next(createBadRequestError("content is required"));
    if (title.length > 200) return next(createBadRequestError("title too long (max 200)"));
    if (content.length > 5000) return next(createBadRequestError("content too long (max 5000)"));

    bug.title = title;
    bug.content = content;
    bug.updatedAt = new Date();
    await bug.save();

    res.json({ success: true, data: serialize(bug) });
  } catch (err) {
    next(err);
  }
}

export async function updateStatus(req, res, next) {
  try {
    if (!isAdmin(req.user)) {
      return next(createForbiddenError("Only Admin/PM can update bug status"));
    }
    const status = String(req.body?.status ?? "").trim();
    if (!BUG_STATUSES.includes(status)) {
      return next(createBadRequestError("status must be todo, in_progress, or done"));
    }

    const bug = await BugReport.findById(req.params.id);
    if (!bug) return next(createNotFoundError("Bug report not found"));

    bug.status = status;
    bug.updatedAt = new Date();
    await bug.save();

    res.json({ success: true, data: serialize(bug) });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    if (!isAdmin(req.user)) {
      return next(createForbiddenError("Only Admin/PM can delete bug reports"));
    }
    const bug = await BugReport.findByIdAndDelete(req.params.id);
    if (!bug) return next(createNotFoundError("Bug report not found"));
    res.json({ success: true, data: serialize(bug) });
  } catch (err) {
    next(err);
  }
}
