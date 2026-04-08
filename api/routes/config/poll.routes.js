import express from "express";
import { registerServer, pollConfig } from "../../controllers/config/poll.controller.js";
import { serverIdExtract } from "../../middleware/serverIdExtract.middleware.js";

const router = express.Router();

router.post("/register", registerServer);
router.get("/:configName", serverIdExtract, pollConfig);

export default router;
