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
    const { mongoURI, cloudinaryConfig, twilioConfig } = req.body;

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

    // 3. Validate Twilio Config
    if (twilioConfig) {
        const { accountSid, authToken, phoneNumber } = twilioConfig;
        if (accountSid && authToken) {
            try {
                const { verifyCredentials } = await import('../services/twilio.service.js');
                await verifyCredentials(accountSid, authToken);
            } catch (error) {
                throw new Error(`Failed to verify Twilio credentials: ${error.message}`);
            }
        }
    }

    // 4. Update User
    const user = await User.findById(userId).select('+mongoURI +cloudinaryConfig.apiSecret +twilioConfig.accountSid +twilioConfig.authToken');

    if (mongoURI) user.mongoURI = mongoURI;
    if (cloudinaryConfig) user.cloudinaryConfig = cloudinaryConfig;
    if (twilioConfig) {
        user.twilioConfig = {
            accountSid: twilioConfig.accountSid || user.twilioConfig?.accountSid,
            authToken: twilioConfig.authToken || user.twilioConfig?.authToken,
            phoneNumber: twilioConfig.phoneNumber || user.twilioConfig?.phoneNumber,
        };
    }

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
    const user = await User.findById(userId).select('+mongoURI +cloudinaryConfig.apiSecret +twilioConfig.accountSid +twilioConfig.authToken');

    const infrastructure = {
        mongoURI: user.mongoURI,
        cloudinaryConfig: user.cloudinaryConfig,
        twilioConfig: {
            accountSid: user.twilioConfig?.accountSid || '',
            authToken: user.twilioConfig?.authToken || '',
            phoneNumber: user.twilioConfig?.phoneNumber || '',
        },
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
