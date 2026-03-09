import bcrypt from "bcrypt";
import crypto from "crypto";
import { User } from "../models/User.js";
import { createNotFoundError, createBadRequestError } from "../utils/errors.js";

function newId() {
  return "u-" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
}

export async function list(req, res, next) {
  try {
    const users = await User.find().select("-password").sort({ username: 1 }).lean();
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

export async function toggleDisabled(req, res, next) {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    user.disabled = !user.disabled;
    await user.save();
    const doc = user.toJSON();
    res.json({ success: true, data: { ...doc, id: doc._id } });
  } catch (err) {
    next(err);
  }
}
