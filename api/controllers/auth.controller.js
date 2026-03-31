import asyncHandler from "../utils/asyncHandler.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import Tenant from "../models/tenant.models.js";

import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  storeRefreshToken,
  getRefreshToken,
  deleteRefreshToken,
  blacklistToken
} from "../../redis/jwt.js";

const isProduction = process.env.NODE_ENV === "production";
const refreshCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000
};


// ================= REGISTER =================
export const register = asyncHandler(async (req, res) => {
  const { name, email, password, accountType } = req.body;

  if (!name?.trim()) {
    throw new ApiError(400, "Name is required");
  }

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "Password is required");
  }

  if (!["test", "live"].includes(accountType)) {
    throw new ApiError(400, 'Account type must be "test" or "live"');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingTenant = await Tenant.findOne({ email: normalizedEmail });
  if (existingTenant) {
    throw new ApiError(400, "Email already in use");
  }

  const tenant = await Tenant.create({
    name: name.trim(),
    email: normalizedEmail,
    password,
    accountType
  });

  return ApiResponse.success(res, "Tenant registered successfully", {
    tenant: {
      id: tenant._id,
      name: tenant.name,
      email: tenant.email,
      accountType: tenant.accountType,
      createdAt: tenant.createdAt
    }
  });
});


// ================= LOGIN =================
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim()) {
    throw new ApiError(400, "Email is required");
  }

  if (!password?.trim()) {
    throw new ApiError(400, "Password is required");
  }

  const normalizedEmail = email.trim().toLowerCase();

  const tenant = await Tenant.findOne({ email: normalizedEmail });

  if (!tenant) {
    throw new ApiError(401, "Invalid email or password");
  }

  const isMatch = await tenant.isPasswordCorrect(password);

  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Generate tokens
  const accessToken = generateAccessToken(tenant._id);
  const refreshToken = generateRefreshToken(tenant._id);

  // Store refresh token in Redis
  await storeRefreshToken(tenant._id.toString(), refreshToken);

  // Set refresh token in httpOnly cookie
  res.cookie("refreshToken", refreshToken, refreshCookieOptions);

  return ApiResponse.success(res, "Login successful", {
    tenant: {
      id: tenant._id,
      name: tenant.name,
      email: tenant.email
    },
    accessToken
  });
});


// ================= REFRESH TOKEN =================
export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    throw new ApiError(401, "Refresh token missing");
  }

  // Verify token
  const decoded = verifyRefreshToken(token);
  if (!decoded?.userId) {
    throw new ApiError(401, "Invalid refresh token");
  }

  const userId = decoded.userId;

  // Check token in Redis
  const storedToken = await getRefreshToken(userId);

  if (!storedToken || storedToken !== token) {
    throw new ApiError(401, "Refresh token mismatch (possible reuse attack)");
  }

  // ROTATION
  const newAccessToken = generateAccessToken(userId);
  const newRefreshToken = generateRefreshToken(userId);

  // overwrite old refresh token
  await storeRefreshToken(userId, newRefreshToken);

  // update cookie
  res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);

  return ApiResponse.success(res, "Token refreshed", {
    accessToken: newAccessToken
  });
});


// ================= LOGOUT =================
export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies.refreshToken;
  const accessToken = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    if (accessToken) {
      const decodedAccessToken = verifyAccessToken(accessToken);

      if (decodedAccessToken?.exp) {
        const ttl = Math.max(decodedAccessToken.exp - Math.floor(Date.now() / 1000), 1);
        await blacklistToken(accessToken, ttl);
      }
    }

    return ApiResponse.success(res, "Logged out");
  }

  try {
    const decoded = verifyRefreshToken(token);
    if (decoded?.userId) {
      await deleteRefreshToken(decoded.userId);
    }
  } catch {
    // ignore errors (token may already be invalid)
  }

  if (accessToken) {
    const decodedAccessToken = verifyAccessToken(accessToken);

    if (decodedAccessToken?.exp) {
      const ttl = Math.max(decodedAccessToken.exp - Math.floor(Date.now() / 1000), 1);
      await blacklistToken(accessToken, ttl);
    }
  }

  // Clear cookie
  res.clearCookie("refreshToken", {
    httpOnly: refreshCookieOptions.httpOnly,
    secure: refreshCookieOptions.secure,
    sameSite: refreshCookieOptions.sameSite,
    path: refreshCookieOptions.path
  });

  return ApiResponse.success(res, "Logged out successfully");
});
