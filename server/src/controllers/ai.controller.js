import { successResponse, notFoundResponse, internalErrorResponse } from '../utils/response.util.js';

export const getAIConfig = async (req, res) => {
    try {
        // User is already attached by auth middleware
        if (!req.user) {
            return internalErrorResponse(res, 'User context missing');
        }

        // Need to explicitly check for API key presence since it's select: false
        const userWithKey = await (await import('../models/User.js')).default.findById(req.user._id).select('+aiSettings.apiKey');

        const config = userWithKey.aiSettings.toObject();

        return successResponse(res, 200, 'AI configuration retrieved', {
            ...config,
            hasApiKey: !!config.apiKey,
            apiKey: undefined // Ensure key is not sent
        });
    } catch (error) {
        console.error('Get AI Config Error:', error);
        return internalErrorResponse(res, 'Internal Server Error');
    }
};

export const updateAIConfig = async (req, res) => {
    try {
        const { systemPrompt, enabled, autoReply, maxTokens, temperature, apiKey } = req.body;

        const user = req.user;
        if (!user) {
            return internalErrorResponse(res, 'User context missing');
        }

        // Update fields
        if (systemPrompt !== undefined) user.aiSettings.systemPrompt = systemPrompt;
        if (enabled !== undefined) user.aiSettings.enabled = enabled;
        if (autoReply !== undefined) user.aiSettings.autoReply = autoReply;
        if (maxTokens !== undefined) user.aiSettings.maxTokens = maxTokens;

        // Only update API key if provided and not empty
        if (apiKey) {
            user.aiSettings.apiKey = apiKey;
        }

        // Note: Temperature is not in the schema currently, we might need to add it or store it in mixed
        // user.aiSettings.temperature = temperature;

        await user.save();

        // Return config but mask API key
        const responseData = {
            ...user.aiSettings.toObject(),
            hasApiKey: !!user.aiSettings.apiKey,
            apiKey: undefined // Don't return the key back
        };

        return successResponse(res, 200, 'AI configuration updated', responseData);
    } catch (error) {
        console.error('Update AI Config Error:', error);
        return internalErrorResponse(res, 'Internal Server Error');
    }
};
