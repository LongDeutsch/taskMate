import { Router } from "express";
import { body } from "express-validator";
import * as taskController from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/", authMiddleware, taskController.list);
router.get("/:id", authMiddleware, taskController.getById);

router.post(
  "/",
  authMiddleware,
  requireRole("ADMIN"),
  validate([
    body("projectId").trim().notEmpty().withMessage("projectId is required"),
    body("title").trim().notEmpty().withMessage("Title is required"),
    body("status").isIn(["Todo", "InProgress", "Done"]).optional(),
    body("priority").isIn(["Low", "Medium", "High"]).optional(),
    body("deadline").optional(),
    body("assigneeId").optional(),
    body("description").optional(),
  ]),
  taskController.create
);
router.put("/:id", authMiddleware, requireRole("ADMIN"), taskController.update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), taskController.remove);

export default router;
