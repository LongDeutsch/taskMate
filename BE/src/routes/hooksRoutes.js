import { Router } from "express";
import { hooksApiKeyAuth } from "../middleware/hooksAuth.js";
import { authMiddleware } from "../middleware/auth.js";
import * as hooksController from "../controllers/hooksController.js";

const router = Router();

/** Danh sách webhook cho trang Automation — cần đăng nhập TaskMate */
router.get("/events", authMiddleware, hooksController.listEvents);

/** Nhận sự kiện từ PC crawl — auth bằng X-Api-Key */
router.post("/events", hooksApiKeyAuth, hooksController.postEvent);

export default router;
