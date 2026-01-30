import * as authService from '../services/auth.service.js';
import { successResponse, createdResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Auth controller
 * Handles authentication endpoints
 */

/**
 * Register new user
 * POST /api/auth/register
 */
export const register = asyncHandler(async (req, res) => {
    const { email, password, name } = req.body;

    const result = await authService.register({ email, password, name });

    return createdResponse(res, 'User registered successfully', result);
});

/**
 * Login user
 * POST /api/auth/login
 */
export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    return successResponse(res, 200, 'Login successful', result);
});

/**
 * Refresh access token
 * POST /api/auth/refresh-token
 */
export const refreshToken = asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    const tokens = await authService.refreshAccessToken(refreshToken);

    return successResponse(res, 200, 'Token refreshed successfully', tokens);
});

/**
 * Logout user
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
    await authService.logout(req.userId);

    return successResponse(res, 200, 'Logout successful');
});

/**
 * Get current user
 * GET /api/auth/me
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
    return successResponse(res, 200, 'User retrieved successfully', req.user);
});

/**
 * Update profile
 * PUT /api/auth/profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
    const updates = req.body;

    const user = await authService.updateProfile(req.userId, updates);

    return successResponse(res, 200, 'Profile updated successfully', user);
});

/**
 * Change password
 * PUT /api/auth/password
 */
export const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    await authService.changePassword(req.userId, currentPassword, newPassword);

    return successResponse(res, 200, 'Password changed successfully');
});
