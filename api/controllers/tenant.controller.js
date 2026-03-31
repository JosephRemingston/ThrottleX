import asyncHandler from "../utils/asyncHandler.js";
import crypto from "crypto";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Tenant from "../models/tenant.models.js";
import { storeOTP , getOTP, deleteOTP } from "../../database/redis.js";
import { sendOTPEmail } from "../../aws/ses.js";

import { generateOtp } from "../utils/generateOtp.js";


export const getTenantProfile = asyncHandler(async (req, res) => {

    var tenantId = req.tenant._id;
    const tenant = await Tenant.findById(tenantId).select('-password -refreshToken');

    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    return ApiResponse.success(res, "Tenant profile retrieved successfully", {
        tenant
    });
});

export const sendOtp = asyncHandler(async (req, res) => {
    var tenantId = req.tenant._id;
    var tenant = await Tenant.findById(tenantId).select('-password -refreshToken');
    
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    var tenantEmail = tenant.email;

    var otp = generateOtp();

    await storeOTP(tenantEmail, otp);

    await sendOTPEmail(tenantEmail, otp);

    return ApiResponse.success(res, "OTP sent successfully");
});


export const verifyOtp = asyncHandler(async (req, res) => {

    var {otp} = req.body;

    var tenantId = req.tenant._id;
    var tenant = await Tenant.findById(tenantId).select('-password -refreshToken');
    
    if (!tenant) {
        throw new ApiError(404, "Tenant not found");
    }

    var tenantEmail = tenant.email;

    if (!otp) {
        throw new ApiError(400, "OTP is required");
    }

    var storedOtp = await getOTP(tenantEmail);

    if (!storedOtp) {
        throw new ApiError(400, "OTP has expired or is invalid");
    }

    const providedOtpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const storedOtpBuffer = Buffer.from(storedOtp, "hex");
    const providedOtpBuffer = Buffer.from(providedOtpHash, "hex");

    if (
        storedOtpBuffer.length !== providedOtpBuffer.length ||
        !crypto.timingSafeEqual(storedOtpBuffer, providedOtpBuffer)
    ) {
        throw new ApiError(400, "Invalid OTP");
    }

    tenant.isVerified = true;
    await tenant.save();
    await deleteOTP(tenantEmail);
    return ApiResponse.success(res, "OTP verified successfully");
});
