import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { mailAgentApiKeyAuth } from "../middleware/mailAgentAuth.js";
import * as mailJobsController from "../controllers/mailJobsController.js";

const router = Router();

/** Máy trạm — đặt trước /:id để tránh conflict */
router.get("/agent/next", mailAgentApiKeyAuth, mailJobsController.claimNext);
router.patch("/agent/:id", mailAgentApiKeyAuth, mailJobsController.agentUpdate);
router.get(
  "/agent/station-accounts/next",
  mailAgentApiKeyAuth,
  mailJobsController.claimStationAccountUpdate
);
router.patch(
  "/agent/station-accounts/:id",
  mailAgentApiKeyAuth,
  mailJobsController.reportStationAccountUpdate
);

/** User — cập nhật email/mật khẩu ghi đè trên máy trạm */
router.post(
  "/station-account",
  authMiddleware,
  mailJobsController.requestStationAccountUpdate
);
router.get(
  "/station-account/:id",
  authMiddleware,
  mailJobsController.getStationAccountUpdate
);

/** User TaskMate — tạo / theo dõi job / nộp credentials lần đầu */
router.post("/", authMiddleware, mailJobsController.createJob);
router.get("/:id", authMiddleware, mailJobsController.getJob);
router.post("/:id/credentials", authMiddleware, mailJobsController.submitCredentials);

export default router;
