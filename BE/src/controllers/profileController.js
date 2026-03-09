import { User } from "../models/User.js";
import { createNotFoundError } from "../utils/errors.js";

function getAvatarUrl(filename) {
  if (!filename) return null;
  return `/avatars/${filename}`;
}

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    const result = {
      ...user,
      id: user._id,
      joinDate: user.joinDate?.toISOString?.()?.slice(0, 10) ?? user.joinDate,
      avatar: user.avatar ? getAvatarUrl(user.avatar) : null,
    };
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { age, gender, joinDate, position } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    if (age !== undefined) user.age = age === "" || age === null ? null : Number(age);
    if (gender !== undefined) user.gender = gender || null;
    if (joinDate !== undefined) user.joinDate = joinDate ? new Date(joinDate) : null;
    if (position !== undefined) user.position = position || null;
    if (req.file) {
      user.avatar = req.file.filename;
    }
    await user.save();
    const doc = user.toJSON();
    res.json({
      success: true,
      data: {
        ...doc,
        id: doc._id,
        joinDate: doc.joinDate?.toISOString?.()?.slice(0, 10) ?? doc.joinDate,
        avatar: doc.avatar ? getAvatarUrl(doc.avatar) : null,
      },
    });
  } catch (err) {
    next(err);
  }
}
