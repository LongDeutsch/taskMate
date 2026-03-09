import { Router } from "express";
import * as profileController from "../controllers/profileController.js";
import { authMiddleware } from "../middleware/auth.js";
import { uploadAvatar } from "../config/upload.js";

const router = Router();
router.use(authMiddleware);

router.get("/", profileController.getProfile);
router.patch("/", (req, res, next) => {
  if (req.is("multipart/form-data")) {
    uploadAvatar(req, res, (err) => {
      if (err) return next(err);
      next();
    });
  } else {
    next();
  }
}, profileController.updateProfile);

export default router;
