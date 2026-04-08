import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Config from "../../models/config/config.models.js";
import Server from "../../models/config/server.model.js";
import HashService from "../../services/config/hashService.js";

export const registerServer = asyncHandler(async (req, res) => {
    const { serverId, serverName, environment } = req.body;
    const customerApiKey = req.apiKey?.keyId;

    if (!customerApiKey) {
        throw new ApiError(401, "Validated API key is required");
    }

    if (!serverId?.trim()) {
        throw new ApiError(400, "serverId is required");
    }

    const server = await Server.findOneAndUpdate(
        { serverId: serverId.trim() },
        {
            customerApiKey,
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
    const { configName } = req.params;
    const serverId = req.serverId;
    const customerApiKey = req.apiKey?.keyId;

    if (!customerApiKey) {
        throw new ApiError(401, "Validated API key is required");
    }

    const config = await Config.findOne({
        customerApiKey,
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
            customerApiKey,
            status: "active"
        });
    }

    server.lastPoll = new Date();
    server.customerApiKey = customerApiKey;

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
