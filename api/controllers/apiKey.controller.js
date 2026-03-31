import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiKey from "../models/apiKey.models.js";
import { generateApiKey } from "../utils/generateApiKey.js";
import Tenant from "../models/tenant.models.js";


export var apiGenerator = asyncHandler(async (req, res) => {

    const tenantId = req.tenant._id;

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    const { apiKey, hashedKey, keyId } = generateApiKey({ prefix: tenant.accountType === "live" ? "sk_live" : "sk_test" });

    const newApiKey = await ApiKey.create({
        tenantId: tenantId,
        keyId: keyId,
        keyHash: hashedKey
    })

    if(!newApiKey) {
        throw new ApiError(500, "Failed to generate API key");
    }

    return ApiResponse.success(res, "API key generated successfully", {
        apiKey // show this ONCE to user
    });
});

export var revokeApiKey = asyncHandler(async (req, res) => {
    const tenantId = req.tenant._id;
    const { keyId } = req.body;

    if (!keyId?.trim()) {
        throw new ApiError(400, "keyId is required");
    }

    const apiKey = await ApiKey.findOne({ tenantId: tenantId, keyId: keyId.trim() });
    if (!apiKey) {
        throw new ApiError(404, "API key not found");
    }

    apiKey.revoked = true;
    var output = await apiKey.save();

    if(!output) {
        throw new ApiError(500, "Failed to revoke API key");
    }

    return ApiResponse.success(res, "API key revoked successfully");
});
