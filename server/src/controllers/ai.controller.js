import { successResponse, notFoundResponse, internalErrorResponse } from '../utils/response.util.js';

export const getAIConfig = async (req, res) => {
    try {
        if (!req.user) return internalErrorResponse(res, 'User context missing');

        const User = (await import('../models/User.js')).default;
        const userWithKey = await User.findById(req.user._id)
            .select('+aiSettings.apiKey +aiSettings.apiKeys.openai +aiSettings.apiKeys.gemini +aiSettings.apiKeys.anthropic +aiSettings.apiKeys.openrouter')
            .lean();

        if (!userWithKey) return internalErrorResponse(res, 'User not found');

        const aiSettings = userWithKey.aiSettings || {};
        const apiKeys = aiSettings.apiKeys || { openai: '', gemini: '', anthropic: '', openrouter: '' };

        if (!apiKeys.openai && aiSettings.apiKey) apiKeys.openai = aiSettings.apiKey;

        const savedProvider = aiSettings.provider || 'openai';

        const configData = {
            enabled: aiSettings.enabled !== false,
            provider: savedProvider,
            systemPrompt: aiSettings.systemPrompt || 'You are a helpful WhatsApp assistant.',
            model: aiSettings.model || 'gpt-3.5-turbo',
            maxTokens: aiSettings.maxTokens || 500,
            temperature: aiSettings.temperature || 0.7,
            autoReply: !!aiSettings.autoReply,

            hasApiKey: !!aiSettings.apiKey,
            keysConfigured: {
                openai: !!apiKeys.openai, gemini: !!apiKeys.gemini, anthropic: !!apiKeys.anthropic,
                openrouter: !!apiKeys.openrouter
            }
        };

        return successResponse(res, 200, 'AI configuration retrieved', configData);
    } catch (error) {
        return internalErrorResponse(res, 'Internal Server Error');
    }
};

export const updateAIConfig = async (req, res) => {
    try {
        const { systemPrompt, enabled, autoReply, maxTokens, temperature, apiKey, provider, apiKeys, model } = req.body;
        const updateOps = {};

        if (systemPrompt !== undefined) updateOps['aiSettings.systemPrompt'] = systemPrompt;
        if (enabled !== undefined) updateOps['aiSettings.enabled'] = enabled;
        if (autoReply !== undefined) updateOps['aiSettings.autoReply'] = autoReply;
        if (maxTokens !== undefined) updateOps['aiSettings.maxTokens'] = maxTokens;
        if (temperature !== undefined) updateOps['aiSettings.temperature'] = temperature;
        if (provider) updateOps['aiSettings.provider'] = provider;
        if (model) updateOps['aiSettings.model'] = model;

        if (apiKey) { updateOps['aiSettings.apiKey'] = apiKey; updateOps['aiSettings.apiKeys.openai'] = apiKey; }
        if (apiKeys) {
            if (apiKeys.openai) updateOps['aiSettings.apiKeys.openai'] = apiKeys.openai;
            if (apiKeys.gemini) updateOps['aiSettings.apiKeys.gemini'] = apiKeys.gemini;
            if (apiKeys.anthropic) updateOps['aiSettings.apiKeys.anthropic'] = apiKeys.anthropic;
            if (apiKeys.openrouter) updateOps['aiSettings.apiKeys.openrouter'] = apiKeys.openrouter;
        }

        const User = (await import('../models/User.js')).default;
        const updatedUserRaw = await User.findByIdAndUpdate(
            req.user._id, { $set: updateOps }, { new: true, runValidators: true }
        ).select('+aiSettings.apiKey +aiSettings.apiKeys.openai +aiSettings.apiKeys.gemini +aiSettings.apiKeys.anthropic +aiSettings.apiKeys.openrouter').lean();

        if (!updatedUserRaw) return internalErrorResponse(res, 'User not found');

        const newSettings = updatedUserRaw.aiSettings || {};
        const newKeys = newSettings.apiKeys || { openai: '', gemini: '', anthropic: '', openrouter: '' };
        if (!newKeys.openai && newSettings.apiKey) newKeys.openai = newSettings.apiKey;

        const configData = {
            enabled: newSettings.enabled !== false,
            provider: newSettings.provider || 'openai',
            systemPrompt: newSettings.systemPrompt || 'You are a helpful WhatsApp assistant.',
            model: newSettings.model || 'gpt-3.5-turbo',
            maxTokens: newSettings.maxTokens || 500,
            temperature: newSettings.temperature || 0.7,
            autoReply: !!newSettings.autoReply,

            hasApiKey: !!newSettings.apiKey,
            keysConfigured: {
                openai: !!newKeys.openai, gemini: !!newKeys.gemini, anthropic: !!newKeys.anthropic,
                openrouter: !!newKeys.openrouter
            }
        };

        return successResponse(res, 200, 'AI configuration updated', configData);
    } catch (error) {
        return internalErrorResponse(res, error.message || 'Error');
    }
};
