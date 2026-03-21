import express from 'express';
import { apiKeyGeneratorLimiter } from "../middleware/ratelimiter.middleware.js";
import { authenticate } from "../middleware/auth.middleware.js";
import { apiGenerator , revokeApiKey} from "../controllors/apiKey.controllor.js";

var router = express.Router();

router.post("/generate", authenticate, apiKeyGeneratorLimiter, apiGenerator);
router.post("/revoke", authenticate, apiKeyGeneratorLimiter , revokeApiKey);

export default router;