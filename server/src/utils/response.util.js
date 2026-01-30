import { ERROR_CODES } from '../config/constants.js';

/**
 * Standardized API response utilities
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Success message
 * @param {Object} data - Response data
 */
export const successResponse = (res, statusCode = 200, message = 'Success', data = null) => {
    const response = {
        success: true,
        message,
        ...(data && { data }),
    };

    return res.status(statusCode).json(response);
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {Number} statusCode - HTTP status code
 * @param {String} message - Error message
 * @param {String} errorCode - Error code constant
 * @param {Object} details - Additional error details
 */
export const errorResponse = (
    res,
    statusCode = 500,
    message = 'Internal server error',
    errorCode = ERROR_CODES.INTERNAL_ERROR,
    details = null
) => {
    const response = {
        success: false,
        message,
        errorCode,
        ...(details && { details }),
    };

    return res.status(statusCode).json(response);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Data array
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items count
 */
export const paginatedResponse = (res, data, page, limit, total) => {
    const totalPages = Math.ceil(total / limit);

    return res.status(200).json({
        success: true,
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    });
};

/**
 * Created response (201)
 */
export const createdResponse = (res, message = 'Created successfully', data = null) => {
    return successResponse(res, 201, message, data);
};

/**
 * No content response (204)
 */
export const noContentResponse = (res) => {
    return res.status(204).send();
};

/**
 * Bad request response (400)
 */
export const badRequestResponse = (res, message = 'Bad request', details = null) => {
    return errorResponse(res, 400, message, ERROR_CODES.VALIDATION_ERROR, details);
};

/**
 * Unauthorized response (401)
 */
export const unauthorizedResponse = (res, message = 'Unauthorized') => {
    return errorResponse(res, 401, message, ERROR_CODES.AUTHENTICATION_ERROR);
};

/**
 * Forbidden response (403)
 */
export const forbiddenResponse = (res, message = 'Forbidden') => {
    return errorResponse(res, 403, message, ERROR_CODES.AUTHORIZATION_ERROR);
};

/**
 * Not found response (404)
 */
export const notFoundResponse = (res, message = 'Resource not found') => {
    return errorResponse(res, 404, message, ERROR_CODES.NOT_FOUND);
};

/**
 * Internal server error response (500)
 */
export const internalErrorResponse = (res, message = 'Internal server error') => {
    return errorResponse(res, 500, message, ERROR_CODES.INTERNAL_ERROR);
};
