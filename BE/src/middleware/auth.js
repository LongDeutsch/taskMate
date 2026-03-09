import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { createUnauthorizedError } from "../utils/errors.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export async function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next(createUnauthorizedError("Missing or invalid Authorization header"));
    }
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select("-password").lean();
    if (!user) {
      return next(createUnauthorizedError("User not found"));
    }
    if (user.disabled) {
      return next(createUnauthorizedError("Account is disabled"));
    }
    req.user = { id: user._id, username: user.username, role: user.role, fullName: user.fullName };
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      return next(createUnauthorizedError("Invalid or expired token"));
    }
    next(err);
  }
}
