import { successResponse, notFoundResponse, internalErrorResponse } from '../utils/response.util.js';

export const getAIConfig = async (req, res) => {
    try {
        // User is already attached by auth middleware
        if (!req.user) {
            return internalErrorResponse(res, 'User context missing');
        }

        const userWithKey = await (await import('../models/User.js')).default.findById(req.user._id)
            .select('+aiSettings.apiKey +aiSettings.apiKeys.openai +aiSettings.apiKeys.gemini +aiSettings.apiKeys.anthropic +aiSettings.apiKeys.openrouter');

        const config = userWithKey.aiSettings.toObject();

        const apiKeys = config.apiKeys || { openai: '', gemini: '', anthropic: '', openrouter: '' };

        // Populate legacy key into openai if strictly missing from map and present in legacy (backward compat)
        if (!apiKeys.openai && config.apiKey) {
            apiKeys.openai = config.apiKey;
        }

        return successResponse(res, 200, 'AI configuration retrieved', {
            ...config,
            hasApiKey: !!config.apiKey, // Legacy
            provider: config.provider || 'openai',
            // Return masked status for each provider
            keysConfigured: {
                openai: !!apiKeys.openai,
                gemini: !!apiKeys.gemini,
                anthropic: !!apiKeys.anthropic,
                openrouter: !!apiKeys.openrouter
            },
            apiKeys: undefined, // Ensure full key object is not sent
            apiKey: undefined // Ensure legacy key is not sent
        });
    } catch (error) {
        console.error('Get AI Config Error:', error);
        return internalErrorResponse(res, 'Internal Server Error');
    }
};

export const updateAIConfig = async (req, res) => {
    try {
        const { systemPrompt, enabled, autoReply, maxTokens, temperature, apiKey, provider, apiKeys } = req.body;
        console.log('Update AI Config Request Body:', JSON.stringify(req.body, null, 2));

        const userId = req.user._id;

        const updateOps = {};

        // Update fields
        if (systemPrompt !== undefined) updateOps['aiSettings.systemPrompt'] = systemPrompt;
        if (enabled !== undefined) updateOps['aiSettings.enabled'] = enabled;
        if (autoReply !== undefined) updateOps['aiSettings.autoReply'] = autoReply;
        if (maxTokens !== undefined) updateOps['aiSettings.maxTokens'] = maxTokens;
        if (temperature !== undefined) updateOps['aiSettings.temperature'] = temperature;

        if (provider) updateOps['aiSettings.provider'] = provider;
        if (req.body.model) updateOps['aiSettings.model'] = req.body.model;

        // Handle legacy top-level apiKey update
        if (apiKey) {
            updateOps['aiSettings.apiKey'] = apiKey;
            updateOps['aiSettings.apiKeys.openai'] = apiKey;
        }

        // Handle specific provider keys
        if (apiKeys) {
            console.log('Updating API Keys:', apiKeys);
            if (apiKeys.openai) updateOps['aiSettings.apiKeys.openai'] = apiKeys.openai;
            if (apiKeys.gemini) updateOps['aiSettings.apiKeys.gemini'] = apiKeys.gemini;
            if (apiKeys.anthropic) updateOps['aiSettings.apiKeys.anthropic'] = apiKeys.anthropic;
            if (apiKeys.openrouter) updateOps['aiSettings.apiKeys.openrouter'] = apiKeys.openrouter;
        }

        console.log('Update Operations:', updateOps);

        const updatedUser = await (await import('../models/User.js')).default.findByIdAndUpdate(
            userId,
            { $set: updateOps },
            {
                new: true,
                runValidators: true
            }
        ).select('+aiSettings.apiKey +aiSettings.apiKeys.openai +aiSettings.apiKeys.gemini +aiSettings.apiKeys.anthropic +aiSettings.apiKeys.openrouter');

        if (!updatedUser) {
            return internalErrorResponse(res, 'User not found');
        }

        console.log('Updated User AI Settings (Raw):', JSON.stringify(updatedUser.aiSettings, null, 2));

        const newConfig = updatedUser.aiSettings.toObject();
        const newKeys = newConfig.apiKeys || { openai: '', gemini: '', anthropic: '', openrouter: '' };

        console.log('Constructed KeysConfigured:', {
            openai: !!newKeys.openai,
            gemini: !!newKeys.gemini,
            anthropic: !!newKeys.anthropic,
            openrouter: !!newKeys.openrouter
        });

        return successResponse(res, 200, 'AI configuration updated', {
            ...newConfig,
            hasApiKey: !!newConfig.apiKey,
            provider: newConfig.provider || 'openai',
            keysConfigured: {
                openai: !!newKeys.openai,
                gemini: !!newKeys.gemini,
                anthropic: !!newKeys.anthropic,
                openrouter: !!newKeys.openrouter
            },
            apiKeys: undefined,
            apiKey: undefined
        });
    } catch (error) {
        console.error('Update AI Config Error:', error);
        return internalErrorResponse(res, 'Internal Server Error');
    }
};
