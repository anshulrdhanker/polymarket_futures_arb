import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { ValidationError } from '../services/queueTypes';

/**
 * Rate limiting middleware for campaign creation
 * Limits each IP to 5 requests per 15 minutes
 */
export const campaignCreationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 campaign creation requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many campaign creation attempts, please try again later',
  },
  handler: (req: Request, res: Response, next: NextFunction, options) => {
    res.status(options.statusCode).json({
      ...options.message,
      retryAfter: Math.ceil(options.windowMs / 1000), // in seconds
    });
  },
});

/**
 * Rate limiting middleware for API endpoints
 * More permissive than campaign creation
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many requests, please try again later',
  },
});

/**
 * Rate limiting middleware for authentication endpoints
 * Stricter than regular API endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 requests per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts, please try again later',
  },
});
