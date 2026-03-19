import express from "express";
import {
	register,
	login,
	refresh,
	logout
} from "../controllors/auth.controllor.js";
import {
	registerLimiter,
	loginLimiter
} from "../middleware/ratelimiter.middleware.js";

var router = express.Router();

router.post("/register", registerLimiter, register);
router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;