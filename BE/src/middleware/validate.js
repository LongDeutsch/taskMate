import { validationResult } from "express-validator";
import { createBadRequestError } from "../utils/errors.js";

export function validate(validations) {
  return async (req, res, next) => {
    await Promise.all(validations.map((v) => v.run(req)));
    const errors = validationResult(req);
    if (errors.isEmpty()) return next();
    const message = errors.array().map((e) => e.msg).join("; ");
    next(createBadRequestError(message));
  };
}
