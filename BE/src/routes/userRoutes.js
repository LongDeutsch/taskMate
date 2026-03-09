import { Router } from "express";
import { body } from "express-validator";
import * as userController from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

router.get("/", userController.list);
router.get("/:id", userController.getById);
router.post(
  "/",
  validate([
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("fullName").trim().optional(),
    body("role").isIn(["ADMIN", "USER"]).optional(),
    body("password").optional(),
  ]),
  userController.create
);
router.patch("/:id", userController.toggleDisabled);

export default router;
