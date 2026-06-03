import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import * as timeOffController from "../controllers/timeOffController.js";

const router = Router();

router.use(authMiddleware);

router.get("/recipients", timeOffController.listRecipients);
router.post("/", timeOffController.create);
router.get("/mine", timeOffController.listMine);
router.get("/", timeOffController.listAll);
router.delete("/:id", timeOffController.cancelMine);
router.patch("/:id/status", timeOffController.setStatus);

export default router;
