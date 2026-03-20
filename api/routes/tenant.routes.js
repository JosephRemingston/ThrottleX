import express from "express";
import {
	sendOtp,
	verifyOtp,
	getTenantProfile
} from "../controllors/tenant.controllor.js";
import { authenticate } from "../middleware/auth.middleware.js";
import {
	sendOtpLimiter,
	verifyOtpLimiter
} from "../middleware/ratelimiter.middleware.js";

var router = express.Router();

router.post("/send", authenticate, sendOtpLimiter, sendOtp);
router.post("/verify", authenticate, verifyOtpLimiter, verifyOtp);
router.get("/profile", authenticate, getTenantProfile);

export default router;
