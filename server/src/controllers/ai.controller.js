import { successResponse, notFoundResponse, internalErrorResponse } from '../utils/response.util.js';

export const getAIConfig = async (req, res) => {
    try {
        // User is already attached by auth middleware
        if (!req.user) {
            return internalErrorResponse(res, 'User context missing');
        }
        return successResponse(res, 200, 'AI configuration retrieved', req.user.aiSettings);
    } catch (error) {
        console.error('Get AI Config Error:', error);
        return internalErrorResponse(res, 'Internal Server Error');
    }
};

export const updateAIConfig = async (req, res) => {
    try {
        const { systemPrompt, enabled, autoReply, maxTokens, temperature } = req.body;

        const user = req.user;
        if (!user) {
            return internalErrorResponse(res, 'User context missing');
        }

        // Update fields
        if (systemPrompt !== undefined) user.aiSettings.systemPrompt = systemPrompt;
        if (enabled !== undefined) user.aiSettings.enabled = enabled;
        if (autoReply !== undefined) user.aiSettings.autoReply = autoReply;
        if (maxTokens !== undefined) user.aiSettings.maxTokens = maxTokens;

        // Note: Temperature is not in the schema currently, we might need to add it or store it in mixed
        // user.aiSettings.temperature = temperature;

        await user.save();

        return successResponse(res, 200, 'AI configuration updated', user.aiSettings);
    } catch (error) {
        console.error('Update AI Config Error:', error);
        return internalErrorResponse(res, 'Internal Server Error');
    }
};
