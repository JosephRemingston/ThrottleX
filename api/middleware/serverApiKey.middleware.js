import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiKey from "../models/apiKey.models.js";

export const serverApiKeyAuth = asyncHandler(async (req, res, next) => {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
        throw new ApiError(401, "API key is missing");
    }

    const parts = apiKey.split("_");
    if (parts.length < 3) {
        throw new ApiError(401, "Invalid API key format");
    }

    const keyId = parts[parts.length - 2];
    const apiKeyRecord = await ApiKey.findOne({ keyId }).select("+keyHash");

    if (!apiKeyRecord) {
        throw new ApiError(401, "Invalid API key");
    }

    const hashedKey = crypto.createHash("sha256").update(apiKey).digest("hex");
    const storedKeyBuffer = Buffer.from(apiKeyRecord.keyHash, "hex");
    const providedKeyBuffer = Buffer.from(hashedKey, "hex");

    if (
        storedKeyBuffer.length !== providedKeyBuffer.length ||
        !crypto.timingSafeEqual(storedKeyBuffer, providedKeyBuffer)
    ) {
        throw new ApiError(401, "Invalid API key");
    }

    if (apiKeyRecord.revoked) {
        throw new ApiError(403, "API key has been revoked");
    }

    if (apiKeyRecord.expiresAt && apiKeyRecord.expiresAt < new Date()) {
        throw new ApiError(403, "API key has expired");
    }

    apiKeyRecord.lastUsed = new Date();
    await apiKeyRecord.save();

    req.apiKey = apiKeyRecord;
    next();
});
