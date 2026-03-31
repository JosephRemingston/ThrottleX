import jwt from 'jsonwebtoken';
import redis from "../database/redis.js";
const ACCESS_TOKEN_EXPIRY = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRY = '7d'; // 7 days

const getJwtSecret = (envKey) => {
  const secret = process.env[envKey];

  if (!secret) {
    throw new Error(`${envKey} is not configured`);
  }

  return secret;
};

export const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, getJwtSecret('ACCESS_TOKEN_SECRET'), {
    expiresIn: ACCESS_TOKEN_EXPIRY
  });
};

export const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, getJwtSecret('REFRESH_TOKEN_SECRET'), {
    expiresIn: REFRESH_TOKEN_EXPIRY
  });
};

export const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret('ACCESS_TOKEN_SECRET'));
  } catch (error) {
    return null;
  }
};

export const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, getJwtSecret('REFRESH_TOKEN_SECRET'));
  } catch (error) {
    return null;
  }
};

// Store token in Redis with expiry (for blacklisting on logout)
export const storeTokenInRedis = async (userId, token, expiryInSeconds) => {
  const key = `user:${userId}:token`;
  await redis.setex(key, expiryInSeconds, token);
};

// Check if token is blacklisted
export const isTokenBlacklisted = async (token) => {
  const exists = await redis.get(`blacklist:${token}`);
  return !!exists;
};

// Blacklist token (for logout)
export const blacklistToken = async (token, expiryInSeconds) => {
  await redis.setex(`blacklist:${token}`, expiryInSeconds, 'true');
};

// Store refresh token in Redis
export const storeRefreshToken = async (userId, refreshToken) => {
  const key = `refresh:${userId}`;
  // 7 days in seconds
  await redis.setex(key, 7 * 24 * 60 * 60, refreshToken);
};

// Get refresh token from Redis
export const getRefreshToken = async (userId) => {
  const key = `refresh:${userId}`;
  return await redis.get(key);
};

// Delete refresh token from Redis
export const deleteRefreshToken = async (userId) => {
  const key = `refresh:${userId}`;
  await redis.del(key);
};
