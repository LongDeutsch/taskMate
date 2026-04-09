import { Router } from "express";
import { body } from "express-validator";
import * as projectController from "../controllers/projectController.js";
import { authMiddleware } from "../middleware/auth.js";
import { requireRole } from "../middleware/rbac.js";
import { validate } from "../middleware/validate.js";

const router = Router();
router.use(authMiddleware);
router.use(requireRole("ADMIN"));

router.get("/trash", projectController.listTrash);
router.get("/", projectController.list);
router.get("/:id", projectController.getById);
router.post(
  "/",
  validate([
    body("name").trim().notEmpty().withMessage("Project name is required"),
  ]),
  projectController.create
);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.remove);
router.patch("/:id/restore", projectController.restoreFromTrash);

export default router;
