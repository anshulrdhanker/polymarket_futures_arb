import { Request, Response, NextFunction } from 'express';
import { Redis } from 'ioredis';

// Connect to Redis for rate limiting storage
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

export interface RateLimitInfo {
  allowed: boolean;
  limit: number;
  current: number;
  resetTime: Date;
  retryAfter?: number;
}

export class RateLimiter {
  /**
   * Gmail API rate limiter - 250 emails per day per user
   */
  static async checkDailyEmailLimit(userId: string): Promise<RateLimitInfo> {
    const key = `email_daily:${userId}`;
    const limit = 250;
    
    try {
      // Get current count
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current) : 0;
      
      // Check if limit exceeded
      if (currentCount >= limit) {
        const ttl = await redis.ttl(key);
        const resetTime = new Date(Date.now() + (ttl * 1000));
        
        return {
          allowed: false,
          limit,
          current: currentCount,
          resetTime,
          retryAfter: ttl
        };
      }
      
      // Increment counter
      const newCount = await redis.incr(key);
      
      // Set expiry to end of day if first increment
      if (newCount === 1) {
        const now = new Date();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        const secondsUntilEndOfDay = Math.floor((endOfDay.getTime() - now.getTime()) / 1000);
        await redis.expire(key, secondsUntilEndOfDay);
      }
      
      const ttl = await redis.ttl(key);
      const resetTime = new Date(Date.now() + (ttl * 1000));
      
      return {
        allowed: true,
        limit,
        current: newCount,
        resetTime
      };
      
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fail open - allow the request if Redis is down
      return {
        allowed: true,
        limit,
        current: 0,
        resetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
      };
    }
  }
  
  /**
   * Gmail API rate limiter - 1 email per second per user
   */
  static async checkSecondlyEmailLimit(userId: string): Promise<RateLimitInfo> {
    const key = `email_second:${userId}`;
    const limit = 1;
    const windowSeconds = 1;
    
    try {
      // Get current count in this second
      const current = await redis.get(key);
      const currentCount = current ? parseInt(current) : 0;
      
      // Check if limit exceeded
      if (currentCount >= limit) {
        return {
          allowed: false,
          limit,
          current: currentCount,
          resetTime: new Date(Date.now() + 1000),
          retryAfter: 1
        };
      }
      
      // Increment counter with 1 second expiry
      const newCount = await redis.incr(key);
      if (newCount === 1) {
        await redis.expire(key, windowSeconds);
      }
      
      return {
        allowed: true,
        limit,
        current: newCount,
        resetTime: new Date(Date.now() + 1000)
      };
      
    } catch (error) {
      console.error('Redis rate limit error:', error);
      // Fail open
      return {
        allowed: true,
        limit,
        current: 0,
        resetTime: new Date(Date.now() + 1000)
      };
    }
  }
  
  /**
   * Combined Gmail rate limiting check
   */
  static async checkGmailRateLimit(userId: string): Promise<RateLimitInfo> {
    // Check both daily and per-second limits
    const [dailyLimit, secondlyLimit] = await Promise.all([
      this.checkDailyEmailLimit(userId),
      this.checkSecondlyEmailLimit(userId)
    ]);
    
    // Return the most restrictive limit
    if (!dailyLimit.allowed) {
      return dailyLimit;
    }
    
    if (!secondlyLimit.allowed) {
      return secondlyLimit;
    }
    
    // Both limits allow, return daily limit info (more relevant)
    return dailyLimit;
  }
}

/**
 * Express middleware for Gmail rate limiting
 */
export const gmailRateLimitMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'User ID required for rate limiting'
      });
      return;
    }
    
    const rateLimit = await RateLimiter.checkGmailRateLimit(userId);
    
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Gmail API rate limit exceeded',
        details: {
          limit: rateLimit.limit,
          current: rateLimit.current,
          resetTime: rateLimit.resetTime,
          retryAfter: rateLimit.retryAfter
        }
      });
      return;
    }
    
    // Add rate limit info to response headers
    res.set({
      'X-RateLimit-Limit': rateLimit.limit.toString(),
      'X-RateLimit-Remaining': (rateLimit.limit - rateLimit.current).toString(),
      'X-RateLimit-Reset': rateLimit.resetTime.toISOString()
    });
    
    next();
    
  } catch (error) {
    console.error('Rate limiting middleware error:', error);
    // Fail open - allow the request
    next();
  }
};

/**
 * Helper function for background jobs to check rate limits
 */
export const checkEmailRateLimit = async (userId: string): Promise<{
  canSend: boolean;
  waitTime?: number;
  reason?: string;
}> => {
  const rateLimit = await RateLimiter.checkGmailRateLimit(userId);
  
  if (rateLimit.allowed) {
    return { canSend: true };
  }
  
  return {
    canSend: false,
    waitTime: rateLimit.retryAfter,
    reason: `Rate limit exceeded: ${rateLimit.current}/${rateLimit.limit}`
  };
};
