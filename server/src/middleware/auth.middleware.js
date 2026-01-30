import { verifyAccessToken } from '../utils/jwt.util.js';
import { unauthorizedResponse, forbiddenResponse } from '../utils/response.util.js';
import User from '../models/User.js';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */

export const authenticate = async (req, res, next) => {
    try {
        // Get token from header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return unauthorizedResponse(res, 'No token provided');
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token
        const decoded = verifyAccessToken(token);

        // Get user from database
        const user = await User.findById(decoded.userId).select('-password');

        if (!user) {
            return unauthorizedResponse(res, 'User not found');
        }

        if (!user.isActive) {
            return forbiddenResponse(res, 'Account is deactivated');
        }

        // Attach user to request
        req.user = user;
        req.userId = user._id;

        next();
    } catch (error) {
        if (error.message.includes('token')) {
            return unauthorizedResponse(res, error.message);
        }
        return unauthorizedResponse(res, 'Authentication failed');
    }
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't fail if missing
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId).select('-password');

            if (user && user.isActive) {
                req.user = user;
                req.userId = user._id;
            }
        }

        next();
    } catch (error) {
        // Silently fail for optional auth
        next();
    }
};

/**
 * Role-based authorization middleware
 * @param {Array} roles - Allowed roles
 */
export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return unauthorizedResponse(res, 'Authentication required');
        }

        if (!roles.includes(req.user.role)) {
            return forbiddenResponse(res, 'Insufficient permissions');
        }

        next();
    };
};
