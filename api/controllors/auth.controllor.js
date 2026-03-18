import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Tenant from "../models/tenant.models.js";
import { generateApiKey } from "../utils/generateApiKey.js";

const register = asyncHandler(async (req, res) => {
    const { name, email, accountType } = req.body;

    if (!name || !name.trim()) {
        throw new ApiError(400, "Name is required");
    }

    if (!email || !email.trim()) {
        throw new ApiError(400, "Email is required");
    }

    if (!accountType) {
        throw new ApiError(400, "Account type is required");
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already exists
    const existingTenant = await Tenant.findOne({ email: normalizedEmail });
    if (existingTenant) {
        throw new ApiError(400, "Email already in use");
    }

    let prefix = "";
    if (accountType === "test") {
        prefix = "test";
    } else if (accountType === "live") {
        prefix = "live";
    } else {
        throw new ApiError(400, 'Invalid account type. Must be "test" or "live".');
    }

    const tenant = await Tenant.create({
        name: normalizedName,
        email: normalizedEmail,
        accountType,
        isActive: false,
        apiKey : null,
    });

    return ApiResponse.success(res, "Tenant registered successfully", {
        tenant: {
            id: tenant._id,
            name: tenant.name,
            email: tenant.email,
            accountType: tenant.accountType,
            isActive: tenant.isActive,
            createdAt: tenant.createdAt,
        }
    });
});

export { register };