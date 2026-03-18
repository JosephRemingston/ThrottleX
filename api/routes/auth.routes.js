import express from "express";
import { register } from "../controllors/auth.controllor.js";

var router = express.Router();

router.post("/register", register);

export default router;