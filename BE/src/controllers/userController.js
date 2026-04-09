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

export async function list(req, res, next) {
  try {
    await purgeExpiredDeletedUsers();
    const users = await User.find({ deletedAt: null })
      .select("-password")
      .sort({ username: 1 })
      .lean();
    const result = users.map((u) => ({ ...u, id: u._id }));
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
    res.json({ success: true, data: { ...user, id: user._id } });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { username, fullName, role = "USER", password } = req.body;
    const existing = await User.findOne({ username });
    if (existing) {
      return next(createBadRequestError("Username already exists"));
    }
    const hashed = await bcrypt.hash(password || "123456", 12);
    const id = newId();
    const user = await User.create({
      _id: id,
      username,
      fullName: fullName || username,
      role: role === "ADMIN" ? "ADMIN" : "USER",
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

export async function moveToTrash(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    if (user.role === "ADMIN") {
      return next(createBadRequestError("Cannot delete ADMIN user"));
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
