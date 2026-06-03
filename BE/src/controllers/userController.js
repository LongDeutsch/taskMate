import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../models/User.js";
import { createNotFoundError, createBadRequestError } from "../utils/errors.js";

const TRASH_RETENTION_DAYS = 5;

function newId() {
  return "u-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

function restoreDeadlineFrom(now = new Date()) {
  return new Date(now.getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function purgeExpiredDeletedUsers() {
  await User.deleteMany({
    deletedAt: { $ne: null },
    restoreUntil: { $ne: null, $lt: new Date() },
  });
}

/** Suy ra roleLabel cho user lean (cũ) chưa có trường roleLabel. */
function withRoleLabel(u) {
  return {
    ...u,
    id: u._id,
    roleLabel: u.roleLabel ?? (u.role === "ADMIN" ? "ADMIN" : "STAFF"),
  };
}

const ALLOWED_ROLE_LABELS = ["ADMIN", "STAFF", "HR", "BODS"];

export async function list(req, res, next) {
  try {
    await purgeExpiredDeletedUsers();
    const users = await User.find({ deletedAt: null })
      .select("-password")
      .sort({ username: 1 })
      .lean();
    const result = users.map(withRoleLabel);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function getById(req, res, next) {
  try {
    const user = await User.findById(req.params.id).select("-password").lean();
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    res.json({ success: true, data: withRoleLabel(user) });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { username, fullName, role, password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) {
      return next(createBadRequestError("Username already exists"));
    }

    // Form FE gửi field `role` chứa label (ADMIN/STAFF/HR/BODS).
    let roleLabel = (req.body.roleLabel ?? role ?? "STAFF").toString().toUpperCase();
    if (!ALLOWED_ROLE_LABELS.includes(roleLabel)) {
      roleLabel = "STAFF";
    }
    const rbacRole = roleLabel === "ADMIN" ? "ADMIN" : "USER";

    const hashed = await bcrypt.hash(password || "123456", 12);
    const id = newId();
    const user = await User.create({
      _id: id,
      username,
      fullName: fullName || username,
      role: rbacRole,
      roleLabel,
      password: hashed,
      disabled: false,
    });
    const doc = user.toJSON();
    res.status(201).json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}

export async function listTrash(req, res, next) {
  try {
    await purgeExpiredDeletedUsers();
    const users = await User.find({ deletedAt: { $ne: null } })
      .select("-password")
      .sort({ deletedAt: -1 })
      .lean();
    const result = users.map((u) => ({ ...u, id: u._id }));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/** Không xóa user ADMIN (PM) — username `pm` hoặc role ADMIN. */
function isProtectedAdminUser(user) {
  return user.role === "ADMIN" || user.username === "pm";
}

export async function deleteAll(req, res, next) {
  try {
    await purgeExpiredDeletedUsers();
    const now = new Date();
    const restoreUntil = restoreDeadlineFrom(now);
    const result = await User.updateMany(
      {
        deletedAt: null,
        role: { $ne: "ADMIN" },
        username: { $ne: "pm" },
      },
      { $set: { deletedAt: now, restoreUntil, disabled: true } }
    );
    res.json({
      success: true,
      data: { deletedCount: result.modifiedCount },
      message: "Users moved to trash (PM/Admin kept)",
    });
  } catch (err) {
    next(err);
  }
}

export async function moveToTrash(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    if (isProtectedAdminUser(user)) {
      return next(createBadRequestError("Cannot delete ADMIN/PM user"));
    }
    if (user.deletedAt) {
      return next(createBadRequestError("User is already in trash"));
    }
    const now = new Date();
    user.deletedAt = now;
    user.restoreUntil = restoreDeadlineFrom(now);
    user.disabled = true;
    await user.save();
    const doc = user.toJSON();
    res.json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}

export async function restoreFromTrash(req, res, next) {
  try {
    await purgeExpiredDeletedUsers();
    const user = await User.findById(req.params.id);
    if (!user || !user.deletedAt) {
      return next(createNotFoundError("User not found in trash"));
    }
    user.deletedAt = null;
    user.restoreUntil = null;
    user.disabled = false;
    await user.save();
    const doc = user.toJSON();
    res.json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}
