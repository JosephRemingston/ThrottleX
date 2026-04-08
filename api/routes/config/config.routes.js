import express from "express";
import {
    createConfig,
    listConfigs,
    getConfig,
    updateConfig,
    deleteConfig,
    addConfigVersion
} from "../../controllers/config/config.controller.js";
import { authenticate } from "../../middleware/auth.middleware.js";
import { apiKeyAuth } from "../../middleware/apiKey.middleware.js";

const router = express.Router();

router.use(authenticate, apiKeyAuth);

router.post("/", createConfig);
router.get("/", listConfigs);
router.get("/:configId", getConfig);
router.put("/:configId", updateConfig);
router.delete("/:configId", deleteConfig);
router.post("/:configId/versions", addConfigVersion);

export default router;
