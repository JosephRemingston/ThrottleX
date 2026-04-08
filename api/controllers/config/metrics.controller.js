import crypto from "crypto";
import mongoose from "mongoose";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiKey from "../../models/apiKey.models.js";
import Config from "../../models/config/config.models.js";
import Metric from "../../models/config/metric.models.js";

const getLookbackSeconds = () => {
    const parsed = Number.parseInt(process.env.METRICS_LOOKBACK_SECONDS ?? "60", 10);
    return Number.isNaN(parsed) || parsed <= 0 ? 60 : parsed;
};

const validateApiKeyForServer = async (req) => {
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

export const ingestMetrics = asyncHandler(async (req, res) => {
    const serverId = req.serverId;
    const {
        configId,
        version,
        errorRate = 0,
        latency = 0,
        crashCount = 0,
        requestCount = 0,
        customMetrics = {}
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(configId)) {
        throw new ApiError(400, "configId must be a valid ObjectId");
    }

    if (!version?.trim()) {
        throw new ApiError(400, "version is required");
    }

    const apiKeyRecord = await validateApiKeyForServer(req);

    const config = await Config.findOne({
        _id: configId,
        customerApiKey: apiKeyRecord.keyId
    });

    if (!config) {
        throw new ApiError(404, "Config not found");
    }

    const metric = await Metric.create({
        serverId,
        configId,
        version: version.trim(),
        errorRate,
        latency,
        crashCount,
        requestCount,
        customMetrics
    });

    return ApiResponse.success(res, "Metric ingested successfully", { metric });
});

export const getAggregatedMetrics = asyncHandler(async (req, res) => {
    const { configId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(configId)) {
        throw new ApiError(400, "configId must be a valid ObjectId");
    }

    const customerApiKey = req.apiKey?.keyId;
    if (!customerApiKey) {
        throw new ApiError(401, "Validated API key is required");
    }

    const config = await Config.findOne({ _id: configId, customerApiKey });
    if (!config) {
        throw new ApiError(404, "Config not found");
    }

    const lookbackSeconds = getLookbackSeconds();
    const since = new Date(Date.now() - lookbackSeconds * 1000);

    const byVersion = await Metric.aggregate([
        {
            $match: {
                configId: new mongoose.Types.ObjectId(configId),
                timestamp: { $gte: since }
            }
        },
        {
            $group: {
                _id: "$version",
                averageErrorRate: { $avg: "$errorRate" },
                averageLatency: { $avg: "$latency" },
                totalRequests: { $sum: "$requestCount" }
            }
        },
        {
            $project: {
                _id: 0,
                version: "$_id",
                averageErrorRate: { $round: ["$averageErrorRate", 4] },
                averageLatency: { $round: ["$averageLatency", 4] },
                totalRequests: 1
            }
        },
        {
            $sort: { version: 1 }
        }
    ]);

    return ApiResponse.success(res, "Aggregated metrics retrieved successfully", {
        configId,
        lookbackSeconds,
        byVersion
    });
});
