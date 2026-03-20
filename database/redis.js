import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on('connect', () => {
  console.log('Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export const storeOTP = async (email, otp) => {
  await redis.set(
    `otp:${email}`,
    otp,
    "EX",
    300 // 5 minutes expiry
  );
};

export const getOTP = async (email) => {
  return await redis.get(`otp:${email}`);
};

export default redis;