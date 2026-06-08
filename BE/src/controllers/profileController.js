import { User } from "../models/User.js";
import { createNotFoundError } from "../utils/errors.js";
import { createBadRequestError } from "../utils/errors.js";
import { calcAgeFromDateOfBirth, formatDateOnly, getProfileAgeError } from "../utils/birthday.js";
import { avatarFromUploadedFile } from "../utils/avatarStorage.js";
import { formatPublicUser } from "../utils/userFormat.js";

export async function getProfile(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select("-password").lean();
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    res.json({ success: true, data: formatPublicUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { dateOfBirth, gender, joinDate, position } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(createNotFoundError("User not found"));
    }
    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const ageError = getProfileAgeError(dateOfBirth);
        if (ageError) return next(createBadRequestError(ageError));
        const [y, m, d] = String(dateOfBirth).split("-").map(Number);
        user.dateOfBirth = new Date(Date.UTC(y, m - 1, d));
        user.age = calcAgeFromDateOfBirth(user.dateOfBirth);
      } else {
        user.dateOfBirth = null;
        user.age = null;
      }
    }
    if (gender !== undefined) user.gender = gender || null;
    if (joinDate !== undefined) user.joinDate = joinDate ? new Date(joinDate) : null;
    if (position !== undefined) user.position = position || null;
    if (req.file) {
      user.avatar = avatarFromUploadedFile(req.file);
    }
    await user.save();
    const doc = user.toJSON();
    res.json({ success: true, data: formatPublicUser({ ...doc, _id: doc._id }) });
  } catch (err) {
    next(err);
  }
}
