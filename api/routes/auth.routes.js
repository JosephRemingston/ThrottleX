import express from "express";
import {
	register,
	login,
	refresh,
	logout
} from "../controllers/auth.controller.js";
import {
	registerLimiter,
	loginLimiter
} from "../middleware/ratelimiter.middleware.js";
import { requireTrustedOriginForRefreshCookie } from "../middleware/csrf.middleware.js";

var router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", requireTrustedOriginForRefreshCookie, refresh);
router.post("/logout", requireTrustedOriginForRefreshCookie, logout);

export default router;
