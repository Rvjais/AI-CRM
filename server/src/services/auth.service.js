import User from '../models/User.js';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.util.js';
import { validatePasswordStrength } from '../utils/validators.util.js';
import logger from '../utils/logger.util.js';

/**
 * Authentication service
 * Handles user registration, login, and token management
 */

/**
 * Register new user
 * @param {Object} userData - User registration data
 * @returns {Object} User and tokens
 */
export const register = async ({ email, password, name }) => {
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Validate password strength
        const passwordValidation = validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
            throw new Error(passwordValidation.message);
        }

        // Create user
        const user = await User.create({
            email,
            password,
            name,
        });

        // Generate tokens
        const tokens = generateTokens({ userId: user._id });

        // Save refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        logger.info(`User registered: ${email}`);

        return {
            user: user.toPublicJSON(),
            ...tokens,
        };
    } catch (error) {
        logger.error('Registration error:', error);
        throw error;
    }
};

/**
 * Login user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} User and tokens
 */
export const login = async (email, password) => {
    try {
        // Find user with password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Check if user is active
        if (!user.isActive) {
            throw new Error('Account is deactivated');
        }

        // Compare password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            throw new Error('Invalid credentials');
        }

        // Generate tokens
        const tokens = generateTokens({ userId: user._id });

        // Update last login and save refresh token
        user.lastLogin = new Date();
        user.refreshToken = tokens.refreshToken;
        await user.save();

        logger.info(`User logged in: ${email}`);

        return {
            user: user.toPublicJSON(),
            ...tokens,
        };
    } catch (error) {
        logger.error('Login error:', error);
        throw error;
    }
};

/**
 * Refresh access token
 * @param {String} refreshToken - Refresh token
 * @returns {Object} New tokens
 */
export const refreshAccessToken = async (refreshToken) => {
    try {
        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        // Find user
        const user = await User.findById(decoded.userId).select('+refreshToken');
        if (!user) {
            throw new Error('User not found');
        }

        // Check if refresh token matches
        if (user.refreshToken !== refreshToken) {
            throw new Error('Invalid refresh token');
        }

        // Generate new tokens
        const tokens = generateTokens({ userId: user._id });

        // Update refresh token
        user.refreshToken = tokens.refreshToken;
        await user.save();

        logger.info(`Token refreshed for user: ${user.email}`);

        return tokens;
    } catch (error) {
        logger.error('Token refresh error:', error);
        throw error;
    }
};

/**
 * Logout user
 * @param {String} userId - User ID
 */
export const logout = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (user) {
            user.refreshToken = null;
            await user.save();
            logger.info(`User logged out: ${user.email}`);
        }
    } catch (error) {
        logger.error('Logout error:', error);
        throw error;
    }
};

/**
 * Update user profile
 * @param {String} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Object} Updated user
 */
export const updateProfile = async (userId, updates) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        // Update allowed fields
        if (updates.name) user.name = updates.name;
        if (updates.email) {
            // Check if new email already exists
            const emailExists = await User.findOne({ email: updates.email, _id: { $ne: userId } });
            if (emailExists) {
                throw new Error('Email already in use');
            }
            user.email = updates.email;
        }

        await user.save();

        logger.info(`Profile updated for user: ${user.email}`);

        return user.toPublicJSON();
    } catch (error) {
        logger.error('Profile update error:', error);
        throw error;
    }
};

/**
 * Change password
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 */
export const changePassword = async (userId, currentPassword, newPassword) => {
    try {
        const user = await User.findById(userId).select('+password');
        if (!user) {
            throw new Error('User not found');
        }

        // Verify current password
        const isPasswordValid = await user.comparePassword(currentPassword);
        if (!isPasswordValid) {
            throw new Error('Current password is incorrect');
        }

        // Validate new password
        const passwordValidation = validatePasswordStrength(newPassword);
        if (!passwordValidation.isValid) {
            throw new Error(passwordValidation.message);
        }

        // Update password
        user.password = newPassword;
        await user.save();

        logger.info(`Password changed for user: ${user.email}`);
    } catch (error) {
        logger.error('Password change error:', error);
        throw error;
    }
};
