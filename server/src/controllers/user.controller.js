import { asyncHandler } from '../middleware/error.middleware.js';
import { successResponse } from '../utils/response.util.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';

/**
 * User Controller
 * Handles user-specific settings and infrastructure configuration
 */

/**
 * Update Infrastructure Settings
 * PUT /api/user/infrastructure
 */
export const updateInfrastructure = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { mongoURI, cloudinaryConfig } = req.body;

    // 1. Validate MongoDB URI
    if (mongoURI) {
        if (!mongoURI.startsWith('mongodb')) {
            throw new Error('Invalid MongoDB URI format');
        }
        // Test connection
        try {
            const conn = await mongoose.createConnection(mongoURI, { serverSelectionTimeoutMS: 5000 }).asPromise();
            await conn.close();
        } catch (error) {
            throw new Error(`Failed to connect to MongoDB: ${error.message}`);
        }
    }

    // 2. Validate Cloudinary Config
    if (cloudinaryConfig) {
        const { cloudName, apiKey, apiSecret } = cloudinaryConfig;
        if (!cloudName || !apiKey || !apiSecret) {
            throw new Error('Cloudinary config missing required fields');
        }
        // Test Cloudinary connection
        try {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret
            });
            await cloudinary.api.ping();
        } catch (error) {
            throw new Error(`Failed to connect to Cloudinary: ${error.message}`);
        }
    }

    // 3. Update User
    const updateData = {};
    if (mongoURI) updateData.mongoURI = mongoURI;
    if (cloudinaryConfig) updateData.cloudinaryConfig = cloudinaryConfig;

    // Set infrastructureReady to true if both are present (or if one is present and other already exists)
    // We fetch user to check existing state if needed, but for now let's just set it if we have data.
    // Actually, let's fetch user to properly toggle infrastructureReady
    const user = await User.findById(userId).select('+mongoURI +cloudinaryConfig.apiSecret');

    if (mongoURI) user.mongoURI = mongoURI;
    if (cloudinaryConfig) user.cloudinaryConfig = cloudinaryConfig;

    if (user.mongoURI && user.cloudinaryConfig?.cloudName && user.cloudinaryConfig?.apiKey && user.cloudinaryConfig?.apiSecret) {
        user.infrastructureReady = true;
    } else {
        user.infrastructureReady = false;
    }

    await user.save();

    // Return user without sensitive data
    const updatedUser = await User.findById(userId);

    return successResponse(res, 200, 'Infrastructure settings updated successfully', updatedUser);
});

/**
 * Get Infrastructure Settings
 * GET /api/user/infrastructure
 */
export const getInfrastructure = asyncHandler(async (req, res) => {
    const userId = req.userId;
    // We select mongoURI and apiSecret to show them back to user (masked or full? usually empty or masked)
    // For now, let's just return what we have, but maybe mask the secret
    const user = await User.findById(userId).select('+mongoURI +cloudinaryConfig.apiSecret');

    const infrastructure = {
        mongoURI: user.mongoURI, // In production, maybe mask this
        cloudinaryConfig: user.cloudinaryConfig,
        // Calculate readiness dynamically to handle legacy data correctly
        infrastructureReady: !!(user.mongoURI && user.cloudinaryConfig?.cloudName && user.cloudinaryConfig?.apiKey && user.cloudinaryConfig?.apiSecret)
    };

    return successResponse(res, 200, 'Infrastructure settings retrieved', infrastructure);
});

/**
 * Update Feature Settings
 * PUT /api/user/settings
 */
export const updateSettings = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const { featureFlags } = req.body;

    const user = await User.findById(userId);
    if (!user) throw new Error('User not found');

    if (featureFlags) {
        // Use native MongoDB $set operator with dot notation for perfect subdocument updates
        const setQuery = {};
        for (const [key, value] of Object.entries(featureFlags)) {
            setQuery[`featureFlags.${key}`] = value;
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { $set: setQuery },
            { new: true }
        );

        return successResponse(res, 200, 'Settings updated successfully', { featureFlags: updatedUser.featureFlags });
    }

    return successResponse(res, 200, 'Settings updated successfully', { featureFlags: user.featureFlags });
});

/**
 * Get Feature Settings
 * GET /api/user/settings
 */
export const getSettings = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const user = await User.findById(userId).select('featureFlags');

    return successResponse(res, 200, 'Settings retrieved', { featureFlags: user.featureFlags });
});
