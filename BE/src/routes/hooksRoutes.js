import { Router } from "express";
import { hooksApiKeyAuth } from "../middleware/hooksAuth.js";
import * as hooksController from "../controllers/hooksController.js";

const router = Router();

router.post("/events", hooksApiKeyAuth, hooksController.postEvent);

export default router;
