import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { verifyAccessToken, isTokenBlacklisted } from '../../redis/jwt.js';
import Tenant from '../models/tenant.models.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    throw ApiError.badRequest('Access token is required');
  }

  // Check if token is blacklisted
  const blacklisted = await isTokenBlacklisted(token);
  if (blacklisted) {
    return ApiResponse.unauthorized(res, 'You have been logged out please login again');
  }

  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }

  // Get user from database
  const tenant = await Tenant.findById(decoded.userId).select('-password -refreshToken');
  if (!tenant) {
    return ApiResponse.badRequest(res, 'User not found');
  }

  req.tenant = tenant;
  next();
});