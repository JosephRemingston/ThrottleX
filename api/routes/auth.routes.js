import express from "express";
import { register } from "../controllors/auth.controllor.js";
import { registerLimiter } from "../middleware/ratelimiter.middleware.js";

var router = express.Router();

router.post("/register", registerLimiter, register);

export default router;