import Redis from 'ioredis';
import { config } from 'dotenv';

// Load environment variables
config();

// Create Redis client instance
const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  tls: process.env.REDIS_TLS === 'true' ? {}
    : undefined,
  retryStrategy: (times) => {
    // Reconnect after
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('🟢 Redis client connected');});

redisClient.on('error', (err) => {
  console.error('🔴 Redis error:', err);
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  redisClient.quit();
  console.log('👋 Redis client disconnected through app termination');
  process.exit(0);
});

// Helper functions
export const setCache = async (key: string, value: any, ttl?: number): Promise<boolean> => {
  try {
    const strValue = JSON.stringify(value);
    if (ttl) {
      await redisClient.setex(key, ttl, strValue);
    } else {
      await redisClient.set(key, strValue);
    }
    return true;
  } catch (error) {
    console.error('Error setting cache:', error);
    return false;
  }
};

export const getCache = async <T>(key: string): Promise<T | null> => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting cache:', error);
    return null;
  }
};

export const deleteCache = async (key: string): Promise<boolean> => {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting cache:', error);
    return false;
  }
};

export const clearAllCache = async (): Promise<boolean> => {
  try {
    await redisClient.flushdb();
    return true;
  } catch (error) {
    console.error('Error clearing cache:', error);
    return false;
  }
};

export default redisClient;
