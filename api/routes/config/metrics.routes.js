import express from "express";
import { ingestMetrics, getAggregatedMetrics } from "../../controllers/config/metrics.controller.js";
import { serverIdExtract } from "../../middleware/serverIdExtract.middleware.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { apiKeyAuth } from "../../middleware/apiKey.middleware.js";
import { serverApiKeyAuth } from "../../middleware/serverApiKey.middleware.js";

const router = express.Router();

router.post("/", serverApiKeyAuth, serverIdExtract, ingestMetrics);
router.get("/:configId", authenticate, apiKeyAuth, getAggregatedMetrics);

export default router;
