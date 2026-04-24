import mongoose from 'mongoose';
import redis from '../redis/index.js';
import { logger } from './logger.js';

let redisClient = null;

export const setRedisClient = (client) => {
  redisClient = client;
};

export const checkHealth = async () => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: 'unknown' },
      redis: { status: 'unknown' }
    }
  };

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      health.checks.database.status = 'ok';
    } else {
      health.checks.database.status = 'disconnected';
      health.status = 'degraded';
    }
  } catch (error) {
    health.checks.database.status = 'error';
    health.checks.database.message = error.message;
    health.status = 'unhealthy';
    logger.error('Health check: Database error', { error: error.message });
  }

  // Check Redis
  try {
    if (redisClient) {
      await redisClient.ping();
      health.checks.redis.status = 'ok';
    } else {
      health.checks.redis.status = 'not_configured';
      // Don't mark as unhealthy, Redis is optional
    }
  } catch (error) {
    health.checks.redis.status = 'error';
    health.checks.redis.message = error.message;
    health.status = 'degraded';
    logger.warn('Health check: Redis error', { error: error.message });
  }

  return health;
};
