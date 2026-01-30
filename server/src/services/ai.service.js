import User from '../models/User.js';
import OpenAI from 'openai';

/**
 * AI Service for generating responses
 */
export const generateAIResponse = async (userId, userMessage) => {
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

        const openai = new OpenAI({ apiKey });

        console.log(`[AI Service] Generating response for user ${userId} using ${model}`);

        const completion = await openai.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            model: model,
            max_tokens: maxTokens,
            temperature: 0.7,
        });

        const response = completion.choices[0].message.content;
        return response;

    } catch (error) {
        console.error('Error in AI generation:', error);
        return "I'm having trouble connecting to my AI brain right now. Please try again later.";
    }
};

export const analyzeSentiment = async (text) => {
    // Keep this simple for now to avoid burning tokens on every status update
    // Could eventually use OpenAI embeddings or simple classification

    // Mock sentiment analysis
    const positiveWords = ['good', 'great', 'excellent', 'thanks', 'happy', 'love', 'perfect'];
    const negativeWords = ['bad', 'issue', 'problem', 'sad', 'angry', 'hate', 'terrible', 'wrong'];

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
