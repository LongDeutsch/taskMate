import { Router } from "express";
import * as birthdayController from "../controllers/birthdayController.js";

const router = Router();

router.get("/today", birthdayController.listToday);

export default router;
