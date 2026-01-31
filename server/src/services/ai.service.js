import User from '../models/User.js';
import OpenAI from 'openai';

/**
 * AI Service for generating responses
 */
export const generateAIResponse = async (userId, chatJid, userMessage) => {
    try {
        const user = await User.findById(userId).select('+aiSettings.apiKey');

        if (!user) {
            throw new Error('User not found');
        }

        // Get API Key from User settings or Env
        const apiKey = user.aiSettings?.apiKey || process.env.OPENAI_API_KEY;

        // Get System Prompt from User settings
        const systemPrompt = user.aiSettings?.systemPrompt || "You are a helpful customer support assistant.";
        const model = user.aiSettings?.model || "gpt-3.5-turbo";
        const maxTokens = user.aiSettings?.maxTokens || 150;

        if (!apiKey) {
            console.warn('[AI Service] No API Key found. Returning mock request.');
            return `[AI Not Configured] Please add OPENAI_API_KEY to server/.env or configure it in AI Settings.`;
        }

        // Check if using OpenRouter
        const isOpenRouter = apiKey.startsWith('sk-or-');
        const baseURL = isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined;

        const openai = new OpenAI({
            apiKey,
            baseURL,
            defaultHeaders: isOpenRouter ? {
                "HTTP-Referer": process.env.FRONTEND_URL || "https://localhost",
                "X-Title": "WhatsApp CRM"
            } : undefined
        });

        // Fetch recent context
        // Ensure we import the Message model dynamically or at top if not circular
        const Message = (await import('../models/Message.js')).default;

        // Fetch last 100 messages
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

        // Reverse to chronological order
        recentMessages.reverse();

        // Format history for OpenAI
        const history = recentMessages.map(msg => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content.text || '[Media Message]'
        }));

        // Construct final messages array
        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage }
        ];

        console.log(`[AI Service] Generating response for user ${userId} using ${model} with context size ${history.length}`);

        const completion = await openai.chat.completions.create({
            messages: messages,
            model: model,
            max_tokens: maxTokens,
            temperature: 0.7,
        });

        const response = completion.choices[0].message.content;
        return response;

    } catch (error) {
        console.error('Error in AI generation:', error);
        // Return clearer error
        if (error.response) {
            return `[AI Error] ${error.response.status}: ${error.response.data?.error?.message || error.message}`;
        }
        return `[AI Error] ${error.message}`;
    }
};

export const analyzeSentiment = async (text, userId) => {
    try {
        // 1. Try OpenAI if enabled
        if (userId) {
            const user = await User.findById(userId).select('+aiSettings.apiKey');
            const apiKey = user?.aiSettings?.apiKey || process.env.OPENAI_API_KEY;

            if (apiKey) {
                const isOpenRouter = apiKey.startsWith('sk-or-');
                const baseURL = isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined;

                const openai = new OpenAI({
                    apiKey,
                    baseURL,
                    defaultHeaders: isOpenRouter ? {
                        "HTTP-Referer": process.env.FRONTEND_URL || "https://localhost",
                        "X-Title": "WhatsApp CRM"
                    } : undefined
                });
                const completion = await openai.chat.completions.create({
                    messages: [
                        { role: "system", content: "You are a sentiment analyzer. Reply with specific Valid JSON ONLY: {\"sentiment\": \"positive\" | \"neutral\" | \"negative\", \"confidence\": 0.0-1.0}." },
                        { role: "user", content: `Analyze the sentiment of this WhatsApp message: "${text}"` }
                    ],
                    model: "gpt-3.5-turbo",
                    max_tokens: 50,
                    temperature: 0,
                });

                const content = completion.choices[0].message.content;
                try {
                    const result = JSON.parse(content);
                    return result.sentiment || 'neutral';
                } catch (e) {
                    console.warn('Failed to parse sentiment JSON', content);
                }
            }
        }
    } catch (e) {
        console.warn('OpenAI sentiment analysis failed, falling back to local:', e.message);
    }

    // 2. Fallback to basic keyword analysis
    // Keep this simple for now to avoid burning tokens on every status update
    // Could eventually use OpenAI embeddings or simple classification

    // Mock sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'thanks', 'happy', 'love', 'perfect', 'ok', 'okay', 'yes', 'fine'];
    const negativeWords = ['bad', 'issue', 'problem', 'sad', 'angry', 'hate', 'terrible', 'wrong', 'no', 'stop', 'cancel'];

    const lowerText = text.toLowerCase();
    let score = 0;

    positiveWords.forEach(word => {
        if (lowerText.includes(word)) score++;
    });

    negativeWords.forEach(word => {
        if (lowerText.includes(word)) score--;
    });

    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
};
