import crypto from "crypto";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiKey from "../../models/apiKey.models.js";
import Config from "../../models/config/config.models.js";
import Server from "../../models/config/server.model.js";
import HashService from "../../services/config/hashService.js";

const validateApiKeyForPolling = async (req) => {
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
    return apiKeyRecord;
};

export const registerServer = asyncHandler(async (req, res) => {
    const { serverId, serverName, environment } = req.body;
    const apiKeyRecord = await validateApiKeyForPolling(req);

    if (!serverId?.trim()) {
        throw new ApiError(400, "serverId is required");
    }

    const server = await Server.findOneAndUpdate(
        { serverId: serverId.trim() },
        {
            customerApiKey: apiKeyRecord.keyId,
            serverName,
            environment,
            lastPoll: new Date(),
            status: "active"
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    return ApiResponse.success(res, "Server registered successfully", { server });
});

export const pollConfig = asyncHandler(async (req, res) => {
    const apiKeyRecord = await validateApiKeyForPolling(req);
    const { configName } = req.params;
    const serverId = req.serverId;

    const config = await Config.findOne({
        customerApiKey: apiKeyRecord.keyId,
        name: configName
    });

    if (!config) {
        throw new ApiError(404, "Config not found");
    }

    if (!Array.isArray(config.rolloutPercentages) || config.rolloutPercentages.length === 0) {
        throw new ApiError(400, "Config rolloutPercentages are not configured");
    }

    const assignedVersionId = HashService.assignVersion(serverId, config.rolloutPercentages);
    const assignedVersion = config.versions.find((version) => version.id === assignedVersionId);

    if (!assignedVersion) {
        throw new ApiError(404, "Assigned config version not found");
    }

    let server = await Server.findOne({ serverId });

    if (!server) {
        server = await Server.create({
            serverId,
            customerApiKey: apiKeyRecord.keyId,
            status: "active"
        });
    }

    server.lastPoll = new Date();
    server.customerApiKey = apiKeyRecord.keyId;

    const activeIndex = server.activeConfigs.findIndex(
        (entry) => entry.configId.toString() === config._id.toString()
    );

    if (activeIndex >= 0) {
        server.activeConfigs[activeIndex].version = assignedVersion.id;
        server.activeConfigs[activeIndex].assignedAt = new Date();
    } else {
        server.activeConfigs.push({
            configId: config._id,
            version: assignedVersion.id,
            assignedAt: new Date()
        });
    }

    await server.save();

    return ApiResponse.success(res, "Config polled successfully", {
        configName: config.name,
        versionId: assignedVersion.id,
        data: assignedVersion.data
    });
});
