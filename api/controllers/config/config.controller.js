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

    const updatePayload = {
        updatedAt: new Date()
    };

    if (rolloutPercentages !== undefined) {
        updatePayload.rolloutPercentages = rolloutPercentages;
    }

    if (thresholds.rollbackThreshold !== undefined) {
        updatePayload.rollbackThreshold = thresholds.rollbackThreshold;
    }

    if (thresholds.advanceThreshold !== undefined) {
        updatePayload.advanceThreshold = thresholds.advanceThreshold;
    }

    const updatedConfig = await Config.findOneAndUpdate(
        { _id: configId, customerApiKey },
        updatePayload,
        { new: true, runValidators: true }
    );

    if (!updatedConfig) {
        throw new ApiError(404, "Config not found");
    }

    return ApiResponse.success(res, "Config updated successfully", { config: updatedConfig });
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
