import User from '../models/User.js';
import OpenAI from 'openai';

/**
 * AI Service for generating responses
 */

// Helper to get configuration for a user
const getUserAIConfig = async (userId) => {
    const user = await User.findById(userId).select('+aiSettings.apiKey +aiSettings.apiKeys.openai +aiSettings.apiKeys.gemini +aiSettings.apiKeys.anthropic +aiSettings.apiKeys.openrouter');
    if (!user) throw new Error('User not found');

    const settings = user.aiSettings || {};
    const provider = settings.provider || 'openai';

    // Fallback logic for backward compatibility
    let apiKey = '';

    if (settings.apiKeys && settings.apiKeys[provider]) {
        apiKey = settings.apiKeys[provider];
    } else if (provider === 'openai') {
        // Fallback to old apiKey field or env var for OpenAI
        apiKey = settings.apiKey || process.env.OPENAI_API_KEY;
    }

    // Special case for OpenRouter needing env fallback if configured as such (optional)

    return {
        provider,
        apiKey,
        model: settings.model || 'gpt-3.5-turbo',
        systemPrompt: settings.systemPrompt || "You are a helpful customer support assistant.",
        maxTokens: settings.maxTokens || 150,
        temperature: 0.7 // Could also be configurable
    };
};

const generateOpenAIResponse = async (apiKey, model, messages, maxTokens, baseURL = undefined, defaultHeaders = undefined) => {
    const openai = new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders
    });

    const completion = await openai.chat.completions.create({
        messages,
        model,
        max_tokens: maxTokens,
        temperature: 0.7,
    });

    return completion.choices[0].message.content;
};

const generateGeminiResponse = async (apiKey, model, messages, maxTokens) => {
    // Convert messages to Gemini format
    // System instruction is supported in v1beta models, or prepended to first user message
    // messages: [{role: "system", content: "..."} , {role: "user", ...}]

    const contents = [];
    let systemInstruction = null;

    for (const msg of messages) {
        if (msg.role === 'system') {
            systemInstruction = {
                role: 'user', // Gemini treats system prompts often better as first user turn or explicit system_instruction in beta
                parts: [{ text: msg.content }]
            };
            // For stability, let's prepend system prompt to first user message or handle separately
            // But simple REST API v1beta content generation:
        } else if (msg.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: msg.content }] });
        } else if (msg.role === 'assistant') {
            contents.push({ role: 'model', parts: [{ text: msg.content }] });
        }
    }

    // If system prompt exists, prepend it to the first user message for simplicity in standard v1 API
    // Or use v1beta system_instruction if utilizing that endpoint. 
    // Let's stick to v1beta for better features if possible, but v1 is standard.
    // Simple approach: Prepend system prompt to the first message if it's user, or insert a user message at start.

    const effectiveMessages = [...contents];
    if (systemInstruction) {
        // Check if first message is user, if so prepend text. If not, insert new user message.
        if (effectiveMessages.length > 0 && effectiveMessages[0].role === 'user') {
            effectiveMessages[0].parts[0].text = `System Instruction: ${systemInstruction.parts[0].text}\n\n${effectiveMessages[0].parts[0].text}`;
        } else {
            effectiveMessages.unshift(systemInstruction);
        }
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-pro'}:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: effectiveMessages,
                generationConfig: {
                    maxOutputTokens: maxTokens,
                    temperature: 0.7
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Gemini API Error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.candidates && data.candidates[0]?.content?.parts[0]?.text || null;
    } catch (error) {
        console.error('Gemini API call failed:', error);
        throw error;
    }
};

const generateClaudeResponse = async (apiKey, model, messages, maxTokens) => {
    // Convert messages for Anthropic
    // System prompt is top level parameter
    let system = "";
    const anthropicMessages = [];

    for (const msg of messages) {
        if (msg.role === 'system') {
            system = msg.content;
        } else {
            anthropicMessages.push({
                role: msg.role,
                content: msg.content
            });
        }
    }

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: model || 'claude-3-opus-20240229', // Default if not specified, though usually user selects
                max_tokens: maxTokens,
                system,
                messages: anthropicMessages,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Anthropic API Error: ${response.statusText} - ${errorText}`);
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('Anthropic API call failed:', error);
        throw error;
    }
};

export const generateAIResponse = async (userId, chatJid, userMessage) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) {
            console.warn('[AI Service] No API Key found for provider:', config.provider);
            return `[AI Not Configured] Please add API Key for ${config.provider} in AI Settings.`;
        }

        const Message = (await import('../models/Message.js')).default;
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(20)
            .lean();
        recentMessages.reverse();

        const history = recentMessages.map(msg => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content.text || '[Media Message]'
        }));

        const messages = [
            { role: "system", content: config.systemPrompt },
            ...history,
            { role: "user", content: userMessage }
        ];

        // Logic to prevent using OpenAI model names for other providers
        let model = config.model;

        switch (config.provider) {
            case 'gemini':
                // Force Gemini model if current model looks like OpenAI or is empty
                if (!model || model.includes('gpt')) {
                    model = 'gemini-2.5-flash';
                }
                return await generateGeminiResponse(config.apiKey, model, messages, config.maxTokens);
            case 'anthropic':
                if (!model || model.includes('gpt')) {
                    model = 'claude-3-haiku-20240307';
                }
                return await generateClaudeResponse(config.apiKey, model, messages, config.maxTokens);
            case 'openrouter':
                // OpenRouter might use gpt, so we trust config or default
                return await generateOpenAIResponse(
                    config.apiKey,
                    model || 'openai/gpt-3.5-turbo',
                    messages,
                    config.maxTokens,
                    'https://openrouter.ai/api/v1',
                    {
                        "HTTP-Referer": process.env.FRONTEND_URL || "https://localhost",
                        "X-Title": "WhatsApp CRM"
                    }
                );
            case 'openai':
            default:
                return await generateOpenAIResponse(config.apiKey, model || 'gpt-3.5-turbo', messages, config.maxTokens);
        }

    } catch (error) {
        console.error('Error in AI generation:', error);
        return null;
    }
};

// Simplified versions for other functions (Sentiment, Summary) utilizing the reusable main generation or defaulting to OpenAI for simplicity if others are complex to adapt for small tasks
// For robust implementation, we should adapt these too.

export const analyzeSentiment = async (text, userId) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) return 'neutral';

        const messages = [
            { role: "system", content: "You are a sentiment analyzer. Reply with specific Valid JSON ONLY: {\"sentiment\": \"positive\" | \"neutral\" | \"negative\", \"confidence\": 0.0-1.0}." },
            { role: "user", content: `Analyze the sentiment of this WhatsApp message: "${text}"` }
        ];

        let content = '';

        // Very basic switch for sentiment
        // Valid model selection for sentiment
        if (config.provider === 'gemini') {
            content = await generateGeminiResponse(config.apiKey, 'gemini-1.5-flash', messages, 100);
        } else if (config.provider === 'anthropic') {
            content = await generateClaudeResponse(config.apiKey, 'claude-3-haiku-20240307', messages, 100);
        } else if (config.provider === 'openrouter') {
            content = await generateOpenAIResponse(config.apiKey, 'openai/gpt-3.5-turbo', messages, 100, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        } else {
            content = await generateOpenAIResponse(config.apiKey, 'gpt-3.5-turbo', messages, 100);
        }

        if (content) {
            // Clean JSON markdown if present (Gemini loves markdown blocks)
            content = content.replace(/```json\n?|\n?```/g, '');
            try {
                const result = JSON.parse(content);
                return result.sentiment || 'neutral';
            } catch (e) {
                // Try simple parsing if JSON fails
                const lower = content.toLowerCase();
                if (lower.includes('positive')) return 'positive';
                if (lower.includes('negative')) return 'negative';
                return 'neutral';
            }
        }
    } catch (e) {
        console.warn('AI sentiment analysis failed:', e.message);
    }

    // Fallback
    const positiveWords = ['good', 'great', 'excellent', 'thanks', 'happy', 'love', 'perfect', 'ok', 'yes'];
    const negativeWords = ['bad', 'issue', 'problem', 'sad', 'angry', 'hate', 'terrible', 'wrong', 'no', 'stop'];

    const lowerText = text.toLowerCase();
    let score = 0;
    positiveWords.forEach(word => { if (lowerText.includes(word)) score++; });
    negativeWords.forEach(word => { if (lowerText.includes(word)) score--; });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
};

export const generateSummary = async (userId, chatJid) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) return null;

        const Message = (await import('../models/Message.js')).default;
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(30)
            .lean();
        recentMessages.reverse();

        const conversation = recentMessages.map(m => `${m.fromMe ? 'Agent' : 'User'}: ${m.content.text || '[Media]'}`).join('\n');

        const messages = [
            {
                role: "system",
                content: `You are an AI utilizing the following guidance: "${config.systemPrompt}". \n\nSummarize this conversation in 1-2 brief sentences. Focus on the user's main intent and current status.`
            },
            { role: "user", content: conversation }
        ];

        if (config.provider === 'gemini') return await generateGeminiResponse(config.apiKey, 'gemini-2.5-flash', messages, 200);
        if (config.provider === 'anthropic') return await generateClaudeResponse(config.apiKey, 'claude-3-haiku-20240307', messages, 200);
        if (config.provider === 'openrouter') return await generateOpenAIResponse(config.apiKey, config.model, messages, 200, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        return await generateOpenAIResponse(config.apiKey, 'gpt-3.5-turbo', messages, 200);

    } catch (error) {
        console.error('Error generating summary:', error);
        return null;
    }
};

export const generateSuggestions = async (userId, chatJid) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) return [];

        const Message = (await import('../models/Message.js')).default;
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();
        recentMessages.reverse();

        const conversation = recentMessages.map(m => `${m.fromMe ? 'Agent' : 'User'}: ${m.content.text || '[Media]'}`).join('\n');

        const messages = [
            { role: "system", content: "Based on the conversation, suggest 3 short, actionable response options or actions for the agent. Return JSON array of strings: [\"suggestion1\", \"suggestion2\", \"suggestion3\"]" },
            { role: "user", content: conversation }
        ];

        let content = '';
        if (config.provider === 'gemini') {
            content = await generateGeminiResponse(config.apiKey, 'gemini-2.5-flash', messages, 150);
        } else if (config.provider === 'anthropic') {
            content = await generateClaudeResponse(config.apiKey, 'claude-3-haiku-20240307', messages, 150);
        } else if (config.provider === 'openrouter') {
            content = await generateOpenAIResponse(config.apiKey, config.model, messages, 150, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        } else {
            content = await generateOpenAIResponse(config.apiKey, 'gpt-3.5-turbo', messages, 150);
        }

        if (content) {
            content = content.replace(/```json\n?|\n?```/g, '');
            try {
                const parsed = JSON.parse(content);
                return Array.isArray(parsed) ? parsed : [];
            } catch (e) {
                return content.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
            }
        }
        return [];
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return [];
    }
};
