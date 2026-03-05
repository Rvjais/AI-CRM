import rateLimit from 'express-rate-limit';

// Strict limiter for authentication endpoints (login, register, password reset)
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15,                   // 15 attempts per window per IP
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many attempts. Please try again later.' },
    skipSuccessfulRequests: true,
});

// General API limiter for all other routes
export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Too many requests. Please slow down.' },
});

// Limiter for message sending (prevent spam) 
export const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60,             // 60 messages per minute
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Message rate limit exceeded.' },
});

// Limiter for file uploads
export const uploadLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Upload rate limit exceeded.' },
});

// Limiter for WhatsApp connection events
export const connectionLimiter = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: 'Connection attempt rate limit exceeded.' },
});

