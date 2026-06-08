import { Router } from "express";
import { body } from "express-validator";
import { authMiddleware } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as bugReportController from "../controllers/bugReportController.js";

const router = Router();
router.use(authMiddleware);

router.get("/open", bugReportController.listOpen);
router.get("/", bugReportController.list);
router.post(
  "/",
  validate([
    body("title").trim().notEmpty().withMessage("title is required"),
    body("content").trim().notEmpty().withMessage("content is required"),
  ]),
  bugReportController.create
);
router.get("/:id", bugReportController.getById);
router.put(
  "/:id",
  validate([
    body("title").trim().notEmpty().withMessage("title is required"),
    body("content").trim().notEmpty().withMessage("content is required"),
  ]),
  bugReportController.update
);
router.patch(
  "/:id/status",
  validate([body("status").trim().notEmpty().withMessage("status is required")]),
  bugReportController.updateStatus
);
router.delete("/:id", bugReportController.remove);

export default router;
