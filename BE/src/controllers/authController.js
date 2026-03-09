import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { createUnauthorizedError } from "../utils/errors.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";
const JWT_EXPIRES = process.env.JWT_EXPIRES || "1d";

export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username }).lean();
    if (!user) {
      return next(createUnauthorizedError("Invalid username or password"));
    }
    if (user.disabled) {
      return next(createUnauthorizedError("Account is disabled"));
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return next(createUnauthorizedError("Invalid username or password"));
    }
    const token = jwt.sign(
      { userId: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );
    const { password: _, ...userWithoutPassword } = user;
    const avatarUrl = user.avatar ? `/avatars/${user.avatar}` : null;
    const joinDateStr = user.joinDate?.toISOString?.()?.slice(0, 10) ?? null;
    res.status(200).json({
      success: true,
      data: {
        user: { ...userWithoutPassword, id: user._id, avatar: avatarUrl, joinDate: joinDateStr },
        token,
      },
    });
  } catch (err) {
    next(err);
  }
}
