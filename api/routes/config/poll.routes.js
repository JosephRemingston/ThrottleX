import express from "express";
import { registerServer, pollConfig } from "../../controllers/config/poll.controller.js";
import { serverIdExtract } from "../../middleware/serverIdExtract.middleware.js";
import { serverApiKeyAuth } from "../../middleware/serverApiKey.middleware.js";

const router = express.Router();

router.use(serverApiKeyAuth);

router.post("/register", registerServer);
router.get("/:configName", serverIdExtract, pollConfig);

export default router;
