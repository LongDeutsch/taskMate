import { createForbiddenError } from "../utils/errors.js";

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createForbiddenError("Authentication required"));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(createForbiddenError("Insufficient permissions"));
    }
    next();
  };
}
