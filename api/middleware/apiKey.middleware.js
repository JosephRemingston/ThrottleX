import crypto from "crypto";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import apiKeyModels from "../models/apiKey.models.js";

export const apiKeyAuth = asyncHandler(async (req, res, next) => {
    const tenant = req.tenant;
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
        throw new ApiError(401, "API key is missing");
    }

    if (!tenant?._id) {
        throw new ApiError(401, "Authenticated tenant is required before API key validation");
    }

    const parts = apiKey.split("_");

    if (parts.length < 3) {
        throw new ApiError(401, "Invalid API key format");
    }

    const keyId = parts[parts.length - 2];

    const apiKeyRecord = await apiKeyModels.findOne({ keyId }).select("+keyHash");

    if (!apiKeyRecord) {
        throw new ApiError(401, "Invalid API key");
    }

    const hashedKey = crypto
        .createHash("sha256")
        .update(apiKey)
        .digest("hex");

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

    if (apiKeyRecord.tenantId.toString() !== tenant._id.toString()) {
        throw new ApiError(403, "API key does not belong to tenant");
    }

    apiKeyRecord.lastUsed = new Date();
    await apiKeyRecord.save();

    req.apiKey = apiKeyRecord;
    next();
});
