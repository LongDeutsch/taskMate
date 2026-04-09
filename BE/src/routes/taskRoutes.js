import { Router } from "express";
import { body } from "express-validator";
import * as taskController from "../controllers/taskController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const router = Router();

router.get("/trash", authMiddleware, requireRole("ADMIN"), taskController.listTrash);
router.post("/sync-sheets", authMiddleware, requireRole("ADMIN"), taskController.syncSheets);
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
    body("collaboratorIds").optional().isArray().withMessage("collaboratorIds must be an array"),
    body("collaboratorIds.*").optional().isString().withMessage("Each collaborator id must be a string"),
    body("description").optional(),
    body("feedback").optional().isString().isLength({ max: 5000 }).withMessage("feedback too long"),
  ]),
  taskController.create
);
router.put("/:id", authMiddleware, requireRole("ADMIN"), taskController.update);
router.delete("/:id", authMiddleware, requireRole("ADMIN"), taskController.remove);
router.patch("/:id/restore", authMiddleware, requireRole("ADMIN"), taskController.restoreFromTrash);

export default router;
