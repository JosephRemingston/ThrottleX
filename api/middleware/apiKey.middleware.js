import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import apiKeyModels from "../models/apiKey.models.js";

export const apiKeyAuth = asyncHandler(async (req, res, next) => {
    const user = req.user;
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
        throw new ApiError("API key is missing", 401);
    }

    // 1️⃣ Split API key
    const parts = apiKey.split("_");

    if (parts.length < 3) {
        throw new ApiError("Invalid API key format", 401);
    }

    const keyId = parts[1];

    // 2️⃣ Find using keyId (FAST)
    const apiKeyRecord = await apiKeyModels.findOne({ keyId });

    if (!apiKeyRecord) {
        throw new ApiError("Invalid API key", 401);
    }

    // 3️⃣ Hash incoming key
    const hashedKey = crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex");

    // 4️⃣ Compare hashes
    if (hashedKey !== apiKeyRecord.key) {
        throw new ApiError("Invalid API key", 401);
    }

    // 5️⃣ Ownership check (IMPORTANT)
    if (apiKeyRecord.user.toString() !== user._id.toString()) {
        throw new ApiError("API key does not belong to user", 403);
    }

    // 6️⃣ Other checks
    if (apiKeyRecord.revoked) {
        throw new ApiError("API key has been revoked", 403);
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        throw new ApiError("API key has expired", 403);
    }

    req.apiKey = apiKeyRecord;
    next();
});