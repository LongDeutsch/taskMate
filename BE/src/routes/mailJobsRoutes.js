import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { mailAgentApiKeyAuth } from "../middleware/mailAgentAuth.js";
import * as mailJobsController from "../controllers/mailJobsController.js";

const router = Router();

/** Máy trạm — đặt trước /:id để tránh conflict */
router.get("/agent/next", mailAgentApiKeyAuth, mailJobsController.claimNext);
router.patch("/agent/:id", mailAgentApiKeyAuth, mailJobsController.agentUpdate);

/** User TaskMate — tạo / theo dõi job / nộp credentials lần đầu */
router.post("/", authMiddleware, mailJobsController.createJob);
router.get("/:id", authMiddleware, mailJobsController.getJob);
router.post("/:id/credentials", authMiddleware, mailJobsController.submitCredentials);

export default router;
