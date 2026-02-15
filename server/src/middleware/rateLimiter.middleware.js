import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import { errorResponse } from '../utils/response.util.js';
import { ERROR_CODES } from '../config/constants.js';

/**
 * Rate limiting middleware configurations
 */

// Custom error handler for rate limit
const rateLimitHandler = (req, res) => {
    console.error(`⚠️ [RateLimit] IP ${req.ip} hit rate limit on ${req.originalUrl}`);
    return errorResponse(
        res,
        429,
        'Too many requests, please try again later',
        ERROR_CODES.RATE_LIMIT_ERROR
    );
};

/**
 * General API rate limiter
 * 100 requests per 15 minutes per IP
 */
export const apiLimiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW * 60 * 1000,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    message: 'Too many requests from this IP, please try again later',
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'development', // Skip rate limiting in development
});

/**
 * Strict limiter for authentication endpoints
 * 5 requests per hour per IP
 */
export const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // Increased from 5 to 50 for easier login during development
    message: 'Too many authentication attempts, please try again later',
    handler: rateLimitHandler,
    skipSuccessfulRequests: true, // Don't count successful logins
});

/**
 * Message sending rate limiter
 * 50 messages per minute per user
 */
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 50,
    message: 'Too many messages sent, please slow down',
    handler: rateLimitHandler,
    keyGenerator: (req) => {
        // Use userId if authenticated, otherwise IP
        return req.userId ? req.userId.toString() : req.ip;
    },
});

/**
 * Media upload rate limiter
 * 20 uploads per hour per user
 */
export const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20,
    message: 'Too many uploads, please try again later',
    handler: rateLimitHandler,
    keyGenerator: (req) => {
        return req.userId ? req.userId.toString() : req.ip;
    },
});

/**
 * WhatsApp connection rate limiter
 * 3 connection attempts per hour per user
 */
/**
 * WhatsApp connection rate limiter
 * Relaxed for testing: 100 connection attempts per hour per user
 */
export const connectionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Increased from 3 to 100 for dev/testing
    message: 'Too many connection attempts, please try again later',
    handler: rateLimitHandler,
    keyGenerator: (req) => {
        return req.userId ? req.userId.toString() : req.ip;
    },
});
