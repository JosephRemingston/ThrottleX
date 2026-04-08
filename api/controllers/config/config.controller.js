import asyncHandler from "../../utils/asyncHandler.js";
import ApiError from "../../utils/ApiError.js";
import ApiResponse from "../../utils/ApiResponse.js";
import Config from "../../models/config/config.models.js";

const getCustomerApiKey = (req) => {
    const keyId = req.apiKey?.keyId;

    if (!keyId) {
        throw new ApiError(401, "Validated API key is required");
    }

    return keyId;
};

const getVersionIdSet = (versions = []) =>
    new Set(
        versions
            .map((version) => version?.id?.trim())
            .filter(Boolean)
    );

const validateRolloutPercentages = (rolloutPercentages, versionIds) => {
    if (!Array.isArray(rolloutPercentages) || rolloutPercentages.length === 0) {
        return;
    }

    const unknownRollout = rolloutPercentages.find(
        (rollout) => !versionIds.has(rollout?.version?.trim?.())
    );

    if (unknownRollout) {
        throw new ApiError(400, "rolloutPercentages reference versions that do not exist");
    }

    const totalPercentage = rolloutPercentages.reduce(
        (sum, rollout) => sum + (typeof rollout?.percentage === "number" ? rollout.percentage : 0),
        0
    );

    if (Math.abs(totalPercentage - 100) > 0.0001) {
        throw new ApiError(400, "rolloutPercentages must sum to 100");
    }
};

export const createConfig = asyncHandler(async (req, res) => {
    const customerApiKey = getCustomerApiKey(req);
    const { name, description, versions = [], rolloutPercentages = [], thresholds = {} } = req.body;

    if (!name?.trim()) {
        throw new ApiError(400, "name is required");
    }

    if (!Array.isArray(versions)) {
        throw new ApiError(400, "versions must be an array");
    }

    if (!Array.isArray(rolloutPercentages)) {
        throw new ApiError(400, "rolloutPercentages must be an array");
    }

    validateRolloutPercentages(rolloutPercentages, getVersionIdSet(versions));

    const configPayload = {
        customerApiKey,
        name: name.trim(),
        description,
        versions,
        rolloutPercentages,
        rollbackThreshold: thresholds.rollbackThreshold,
        advanceThreshold: thresholds.advanceThreshold,
        updatedAt: new Date()
    };

    const config = await Config.create(configPayload);

    return ApiResponse.success(res, "Config created successfully", { config });
});

export const listConfigs = asyncHandler(async (req, res) => {
    const customerApiKey = getCustomerApiKey(req);

    const configs = await Config.find({ customerApiKey }).sort({ createdAt: -1 });

    return ApiResponse.success(res, "Configs retrieved successfully", { configs });
});

export const getConfig = asyncHandler(async (req, res) => {
    const customerApiKey = getCustomerApiKey(req);
    const { configId } = req.params;

    const config = await Config.findOne({ _id: configId, customerApiKey });

    if (!config) {
        throw new ApiError(404, "Config not found");
    }

    return ApiResponse.success(res, "Config retrieved successfully", { config });
});

export const updateConfig = asyncHandler(async (req, res) => {
    const customerApiKey = getCustomerApiKey(req);
    const { configId } = req.params;
    const { rolloutPercentages, thresholds = {} } = req.body;

    if (rolloutPercentages !== undefined && !Array.isArray(rolloutPercentages)) {
        throw new ApiError(400, "rolloutPercentages must be an array");
    }

    const hasThresholdUpdate =
        thresholds.rollbackThreshold !== undefined || thresholds.advanceThreshold !== undefined;

    if (rolloutPercentages === undefined && !hasThresholdUpdate) {
        throw new ApiError(400, "Provide rolloutPercentages or thresholds to update");
    }

    const config = await Config.findOne({ _id: configId, customerApiKey });

    if (!config) {
        throw new ApiError(404, "Config not found");
    }

    if (rolloutPercentages !== undefined) {
        validateRolloutPercentages(rolloutPercentages, getVersionIdSet(config.versions));
        config.rolloutPercentages = rolloutPercentages;
    }

    if (thresholds.rollbackThreshold !== undefined) {
        config.rollbackThreshold = thresholds.rollbackThreshold;
    }

    if (thresholds.advanceThreshold !== undefined) {
        config.advanceThreshold = thresholds.advanceThreshold;
    }

    config.updatedAt = new Date();
    await config.save();

    return ApiResponse.success(res, "Config updated successfully", { config });
});

export const deleteConfig = asyncHandler(async (req, res) => {
    const customerApiKey = getCustomerApiKey(req);
    const { configId } = req.params;

    const deletedConfig = await Config.findOneAndDelete({ _id: configId, customerApiKey });

    if (!deletedConfig) {
        throw new ApiError(404, "Config not found");
    }

    return ApiResponse.success(res, "Config deleted successfully");
});

export const addConfigVersion = asyncHandler(async (req, res) => {
    const customerApiKey = getCustomerApiKey(req);
    const { configId } = req.params;
    const { id, data } = req.body;

    if (!id?.trim()) {
        throw new ApiError(400, "version id is required");
    }

    if (data === undefined || data === null || typeof data !== "object" || Array.isArray(data)) {
        throw new ApiError(400, "version data must be a JSON object");
    }

    const config = await Config.findOne({ _id: configId, customerApiKey });

    if (!config) {
        throw new ApiError(404, "Config not found");
    }

    const versionExists = config.versions.some((version) => version.id === id.trim());
    if (versionExists) {
        throw new ApiError(400, "Version already exists for this config");
    }

    config.versions.push({
        id: id.trim(),
        data
    });
    config.updatedAt = new Date();

    await config.save();

    return ApiResponse.success(res, "Version added successfully", { config });
});
