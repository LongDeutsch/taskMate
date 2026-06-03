import { Router } from "express";
import * as notificationController from "../controllers/notificationController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.get("/", authMiddleware, notificationController.list);
router.post("/read-all", authMiddleware, notificationController.markAllRead);
router.patch("/:id/read", authMiddleware, notificationController.markRead);

export default router;
