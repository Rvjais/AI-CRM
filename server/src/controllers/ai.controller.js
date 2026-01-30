import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

export const getAIConfig = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }
        return successResponse(res, user.aiSettings, 'AI configuration retrieved');
    } catch (error) {
        console.error('Get AI Config Error:', error);
        return errorResponse(res, 'Internal Server Error', 500);
    }
};

export const updateAIConfig = async (req, res) => {
    try {
        const { systemPrompt, enabled, autoReply, maxTokens, temperature } = req.body;

        const user = await User.findById(req.user.userId);
        if (!user) {
            return errorResponse(res, 'User not found', 404);
        }

        // Update fields
        if (systemPrompt !== undefined) user.aiSettings.systemPrompt = systemPrompt;
        if (enabled !== undefined) user.aiSettings.enabled = enabled;
        if (autoReply !== undefined) user.aiSettings.autoReply = autoReply;
        if (maxTokens !== undefined) user.aiSettings.maxTokens = maxTokens;

        // Note: Temperature is not in the schema currently, we might need to add it or store it in mixed
        // user.aiSettings.temperature = temperature;

        await user.save();

        return successResponse(res, user.aiSettings, 'AI configuration updated');
    } catch (error) {
        console.error('Update AI Config Error:', error);
        return errorResponse(res, 'Internal Server Error', 500);
    }
};
