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

/**
 * Get Google Auth URL
 * GET /api/auth/google
 */
export const getGoogleAuthUrl = asyncHandler(async (req, res) => {
    const { oauth2Client, GMAIL_SCOPES } = await import('../config/google.config.js');

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: GMAIL_SCOPES,
        prompt: 'consent' // Force consent to ensure we get a refresh token
    });

    return successResponse(res, 200, 'Auth URL generated', { url });
});

/**
 * Google OAuth callback
 * POST /api/auth/google/callback
 */
export const googleCallback = asyncHandler(async (req, res) => {
    const { code } = req.body;
    const userId = req.userId;

    if (!code) {
        throw new Error('Code is required');
    }

    const { oauth2Client } = await import('../config/google.config.js');
    const { tokens } = await oauth2Client.getToken(code);

    // Save tokens to user
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId);

    if (!user) {
        throw new Error('User not found');
    }

    user.gmailAccessToken = tokens.access_token;
    if (tokens.refresh_token) {
        user.gmailRefreshToken = tokens.refresh_token;
    }
    user.gmailTokenExpiry = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
    user.gmailConnected = true;

    // Get user profile from Google to save googleEmail/googleId
    oauth2Client.setCredentials(tokens);
    const oauth2 = (await import('googleapis')).google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    user.googleId = userInfo.data.id;
    user.googleEmail = userInfo.data.email;

    await user.save();

    return successResponse(res, 200, 'Gmail connected successfully', {
        gmailConnected: true,
        googleEmail: user.googleEmail
    });
});
