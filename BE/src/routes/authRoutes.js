import { Router } from "express";
import { body } from "express-validator";
import { login } from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.post(
  "/login",
  validate([
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ]),
  login
);

export default router;
