import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { chatWithAgent } from "../controllers/aiController.js";

const router = Router();

router.post("/chat", authMiddleware, chatWithAgent);

export default router;

