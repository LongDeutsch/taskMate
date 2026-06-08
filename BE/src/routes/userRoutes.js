import { Router } from "express";
import { body } from "express-validator";
import * as userController from "../controllers/userController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);

/** Mọi user đăng nhập đều xem được danh sách & profile đồng đội */
router.get("/", userController.list);
router.get("/trash", requireRole("ADMIN"), userController.listTrash);
router.delete("/all", requireRole("ADMIN"), userController.deleteAll);
router.get("/:id", userController.getById);

router.post(
  "/",
  requireRole("ADMIN"),
  validate([
    body("username").trim().notEmpty().withMessage("Username is required"),
    body("fullName").trim().optional(),
    body("role").isIn(["ADMIN", "USER"]).optional(),
    body("password").optional(),
  ]),
  userController.create
);
router.delete("/:id", requireRole("ADMIN"), userController.moveToTrash);
router.patch("/:id/restore", requireRole("ADMIN"), userController.restoreFromTrash);

export default router;
