import User from '../models/User.js';
import OpenAI from 'openai';

/**
 * AI Service for generating responses
 */
// Helper to get OpenAI client
const getOpenAIClient = async (userId) => {
    const user = await User.findById(userId).select('+aiSettings.apiKey');
    if (!user) throw new Error('User not found');

    const apiKey = user.aiSettings?.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) return null;

    const isOpenRouter = apiKey.startsWith('sk-or-');
    const baseURL = isOpenRouter ? 'https://openrouter.ai/api/v1' : undefined;

    return new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders: isOpenRouter ? {
            "HTTP-Referer": process.env.FRONTEND_URL || "https://localhost",
            "X-Title": "WhatsApp CRM"
        } : undefined
    });
};

export const generateAIResponse = async (userId, chatJid, userMessage) => {
    try {
        const user = await User.findById(userId).select('+aiSettings.apiKey');
        // ... (We can keep the existing logic or refactor, let's keep it consistent but use helper if easy)
        // For minimal breakage, I will leave generateAIResponse mostly as is but let's try to use the helper pattern for new functions

        // Re-implementing using helper to be clean
        const openai = await getOpenAIClient(userId);
        if (!openai) {
            console.warn('[AI Service] No API Key found.');
            return `[AI Not Configured] Please add OPENAI_API_KEY to server/.env or configure it in AI Settings.`;
        }

        const systemPrompt = user.aiSettings?.systemPrompt || "You are a helpful customer support assistant.";
        const model = user.aiSettings?.model || "gpt-3.5-turbo";
        const maxTokens = user.aiSettings?.maxTokens || 150;

        const Message = (await import('../models/Message.js')).default;
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(20) // Reduced context for speed
            .lean();
        recentMessages.reverse();

        const history = recentMessages.map(msg => ({
            role: msg.fromMe ? 'assistant' : 'user',
            content: msg.content.text || '[Media Message]'
        }));

        const messages = [
            { role: "system", content: systemPrompt },
            ...history,
            { role: "user", content: userMessage }
        ];

        const completion = await openai.chat.completions.create({
            messages,
            model,
            max_tokens: maxTokens,
            temperature: 0.7,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error in AI generation:', error);
        return null;
    }
};

export const analyzeSentiment = async (text, userId) => {
    try {
        const openai = await getOpenAIClient(userId);
        if (openai) {
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
    } catch (e) {
        console.warn('OpenAI sentiment analysis failed, falling back to local:', e.message);
    }

    // Fallback logic
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
        const user = await User.findById(userId).select('+aiSettings.apiKey aiSettings.systemPrompt');
        if (!user) return null;

        const openai = await getOpenAIClient(userId);
        if (!openai) return null;

        const systemPrompt = user.aiSettings?.systemPrompt || "You are a customer support assistant.";

        const Message = (await import('../models/Message.js')).default;
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(30) // Increased slightly for better context
            .lean();
        recentMessages.reverse();

        const conversation = recentMessages.map(m => `${m.fromMe ? 'Agent' : 'User'}: ${m.content.text || '[Media]'}`).join('\n');

        const completion = await openai.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are an AI that summarizes conversations based on the following brand/system guidelines: "${systemPrompt}". \n\nSummarize this conversation in 1-2 brief sentences. Focus on the user's main intent and current status.`
                },
                { role: "user", content: conversation }
            ],
            model: "gpt-3.5-turbo",
            max_tokens: 100,
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Error generating summary:', error);
        return null;
    }
};

export const generateSuggestions = async (userId, chatJid) => {
    try {
        const openai = await getOpenAIClient(userId);
        if (!openai) return [];

        const Message = (await import('../models/Message.js')).default;
        const recentMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(10)
            .lean();
        recentMessages.reverse();

        const conversation = recentMessages.map(m => `${m.fromMe ? 'Agent' : 'User'}: ${m.content.text || '[Media]'}`).join('\n');

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: "Based on the conversation, suggest 3 short, actionable response options or actions for the agent. Return JSON array of strings: [\"suggestion1\", \"suggestion2\", \"suggestion3\"]" },
                { role: "user", content: conversation }
            ],
            model: "gpt-3.5-turbo",
            max_tokens: 150,
        });

        const content = completion.choices[0].message.content;
        try {
            const parsed = JSON.parse(content);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            console.warn('Failed to parse suggestions JSON', content);
            // Fallback: try to extract lines if JSON parse fails
            return content.split('\n').filter(line => line.trim().length > 0).slice(0, 3);
        }
    } catch (error) {
        console.error('Error generating suggestions:', error);
        return [];
    }
};
