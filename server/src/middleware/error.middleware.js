import logger from '../utils/logger.util.js';
import { errorResponse, internalErrorResponse } from '../utils/response.util.js';
import { ERROR_CODES } from '../config/constants.js';
import env from '../config/env.js';

/**
 * Global error handling middleware
 */

export const errorHandler = (err, req, res, next) => {
    // Log error
    logger.error('❌ [errorHandler]', {
        message: err.message,
        name: err.name,
        stack: err.stack,
        url: req.originalUrl,
    });

    // Mongoose validation error
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
        }));

        return errorResponse(
            res,
            400,
            'Validation failed',
            ERROR_CODES.VALIDATION_ERROR,
            errors
        );
    }

    // Mongoose duplicate key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyPattern)[0];
        return errorResponse(
            res,
            400,
            `${field} already exists`,
            ERROR_CODES.DATABASE_ERROR
        );
    }

    // Mongoose cast error (invalid ObjectId)
    if (err.name === 'CastError') {
        return errorResponse(
            res,
            400,
            'Invalid ID format',
            ERROR_CODES.VALIDATION_ERROR
        );
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return errorResponse(
            res,
            401,
            err.message,
            ERROR_CODES.AUTHENTICATION_ERROR
        );
    }

    // Auth errors
    if (err.message === 'Invalid credentials' || err.message === 'Account is deactivated') {
        return errorResponse(
            res,
            401,
            err.message,
            ERROR_CODES.AUTHENTICATION_ERROR
        );
    }

    // Multer errors (file upload)
    if (err.name === 'MulterError') {
        return errorResponse(
            res,
            400,
            `File upload error: ${err.message}`,
            ERROR_CODES.UPLOAD_ERROR
        );
    }

    // Default internal server error
    const message = env.isDevelopment ? err.message : 'Internal server error';
    const details = env.isDevelopment ? { stack: err.stack } : null;

    return errorResponse(
        res,
        err.statusCode || 500,
        message,
        err.errorCode || ERROR_CODES.INTERNAL_ERROR,
        details
    );
};

/**
 * 404 Not Found handler
 */
export const notFoundHandler = (req, res) => {
    return errorResponse(
        res,
        404,
        `Cannot ${req.method} ${req.originalUrl}`,
        ERROR_CODES.NOT_FOUND
    );
};

/**
 * Async handler wrapper
 * Wraps async route handlers to catch errors
 */
export const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
