import { User } from "../models/User.js";
import { calcAgeFromDateOfBirth, formatDateOnly, isBirthdayToday } from "../utils/birthday.js";

/** Public: danh sách user có sinh nhật hôm nay (không cần đăng nhập). */
export async function listToday(req, res, next) {
  try {
    const users = await User.find({
      deletedAt: null,
      disabled: false,
      dateOfBirth: { $ne: null },
    })
      .select("_id fullName dateOfBirth")
      .lean();

    const data = users
      .filter((u) => isBirthdayToday(u.dateOfBirth))
      .map((u) => ({
        id: u._id,
        fullName: u.fullName,
        dateOfBirth: formatDateOnly(u.dateOfBirth),
        age: calcAgeFromDateOfBirth(u.dateOfBirth),
      }));

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
