import asyncHandler from "../utils/asyncHandler";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Tenant from "../models/tenant.models.js";
import { storeOTP , getOTP} from "../../database/redis.js";
import { authenticate } from "../middleware/auth.middleware.js";

import { generateOtp } from "../utils/generateOtp.js";


var getTenantProfile = asyncHandler(async (req, res) => {

    var tenantId = req.tenant._id;
    const tenant = await Tenant.findById(tenantId).select('-password -refreshToken');

    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    return ApiResponse.success(res, "Tenant profile retrieved successfully", {
        tenant
    });
});

var sendOtp = asyncHandler(async (req, res) => {
    

    var tenantId = tenant._id;
    var tenant = await Tenant.findById(tenantId).select('-password -refreshToken');
    
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    var tenantEmail = tenant.email;

    var otp = generateOtp();

    var otpStore = await storeOTP(tenantEmail, otp);

    if (!otpStore) {
        throw new ApiError(500, "Failed to store OTP");
    }
});