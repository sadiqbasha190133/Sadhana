
import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  signup,
  signin,
  getMe
} from "../controllers/auth.controller.js";

import { authenticate } from "../middleware/authenticate.js";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Try again later."
  }
});

router.post("/signup", authLimiter, signup);
router.post("/signin", authLimiter, signin);

router.get("/me", authenticate, getMe);

export default router;
