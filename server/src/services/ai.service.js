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
        temperature: settings.temperature !== undefined ? settings.temperature : 0.7
    };
};

const generateOpenAIResponse = async (apiKey, model, messages, maxTokens, temperature = 0.7, baseURL = undefined, defaultHeaders = undefined) => {
    const openai = new OpenAI({
        apiKey,
        baseURL,
        defaultHeaders
    });

    const completion = await openai.chat.completions.create({
        messages,
        model,
        max_tokens: maxTokens,
        temperature: temperature,
    });

    return completion.choices[0].message.content;
};

const generateGeminiResponse = async (apiKey, model, messages, maxTokens, temperature = 0.7) => {
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
                    temperature: temperature
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

const generateClaudeResponse = async (apiKey, model, messages, maxTokens, temperature = 0.7) => {
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
                temperature: temperature
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
        // 1. Check Credits
        const user = await User.findById(userId).select('credits');
        if (!user || user.credits <= 0) {
            console.warn(`[AI Service] User ${userId} has insufficient credits: ${user?.credits}`);
            // Optional: Send a specific message like "Credit limit reached. Please upgrade."
            // But we shouldn't reply to the customer with that.
            return null;
        }

        const config = await getUserAIConfig(userId);
        if (!config.apiKey) {
            console.warn('[AI Service] No API Key found for provider:', config.provider);
            return `[AI Not Configured] Please add API Key for ${config.provider} in AI Settings.`;
        }

        const { getClientModels } = await import('../utils/database.factory.js');
        const { WhatsAppSession } = await getClientModels(userId);
        const session = await WhatsAppSession.findOne({ userId });
        const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;

        const { Message } = await getClientModels(userId, hostNumber);

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
        let responseText = null;

        switch (config.provider) {
            case 'gemini':
                // Force Gemini model if current model looks like OpenAI or is empty
                if (!model || model.includes('gpt')) {
                    model = 'gemini-2.5-flash';
                }
                responseText = await generateGeminiResponse(config.apiKey, model, messages, config.maxTokens, config.temperature);
                break;
            case 'anthropic':
                if (!model || model.includes('gpt')) {
                    model = 'claude-3-haiku-20240307';
                }
                responseText = await generateClaudeResponse(config.apiKey, model, messages, config.maxTokens, config.temperature);
                break;
            case 'openrouter':
                // OpenRouter might use gpt, so we trust config or default
                responseText = await generateOpenAIResponse(
                    config.apiKey,
                    model || 'openai/gpt-3.5-turbo',
                    messages,
                    config.maxTokens,
                    config.temperature,
                    'https://openrouter.ai/api/v1',
                    {
                        "HTTP-Referer": process.env.FRONTEND_URL || "https://localhost",
                        "X-Title": "WhatsApp CRM"
                    }
                );
                break;
            case 'openai':
            default:
                responseText = await generateOpenAIResponse(config.apiKey, model || 'gpt-3.5-turbo', messages, config.maxTokens, config.temperature);
                break;
        }

        // 2. Deduct Credit if successful
        if (responseText) {
            await User.findByIdAndUpdate(userId, { $inc: { credits: -1 } });
            // console.log(`[AI Service] Deducted 1 credit for user ${userId}.`);
        }

        return responseText;

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
            let modelToUse = config.model;
            // Fallback if model is invalid for Gemini
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('claude')) {
                modelToUse = 'gemini-2.5-flash';
            }
            content = await generateGeminiResponse(config.apiKey, modelToUse, messages, 100);
        } else if (config.provider === 'anthropic') {
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('gemini')) {
                modelToUse = 'claude-3-haiku-20240307';
            }
            content = await generateClaudeResponse(config.apiKey, modelToUse, messages, 100);
        } else if (config.provider === 'openrouter') {
            content = await generateOpenAIResponse(config.apiKey, config.model || 'openai/gpt-3.5-turbo', messages, 100, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        } else {
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gemini') || modelToUse.includes('claude')) {
                modelToUse = 'gpt-3.5-turbo';
            }
            content = await generateOpenAIResponse(config.apiKey, modelToUse, messages, 100);
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

        const { getClientModels } = await import('../utils/database.factory.js');
        const { WhatsAppSession } = await getClientModels(userId);
        const session = await WhatsAppSession.findOne({ userId });
        const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;

        const { Message } = await getClientModels(userId, hostNumber);

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
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('claude')) {
                modelToUse = 'gemini-2.5-flash';
            }
            content = await generateGeminiResponse(config.apiKey, modelToUse, messages, 150);
        } else if (config.provider === 'anthropic') {
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('gemini')) {
                modelToUse = 'claude-3-haiku-20240307';
            }
            content = await generateClaudeResponse(config.apiKey, modelToUse, messages, 150);
        } else if (config.provider === 'openrouter') {
            content = await generateOpenAIResponse(config.apiKey, config.model || 'openai/gpt-3.5-turbo', messages, 150, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        } else {
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gemini') || modelToUse.includes('claude')) {
                modelToUse = 'gpt-3.5-turbo';
            }
            content = await generateOpenAIResponse(config.apiKey, modelToUse, messages, 150);
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

export const extractData = async (userId, chatJid, schema) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) return {};

        const Message = (await import('../models/Message.js')).default;
        const rawMessages = await Message.find({ userId, chatJid })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

        // Optimized: Filter out noise to prevent AI Token exhaustion, taking only the 15 most recent valid nodes
        const relevantMessages = rawMessages.filter(m => {
            const text = m.content.text || '';
            const isMedia = !text && (m.type === 'image' || m.type === 'video' || m.type === 'document');
            return (text.length > 3) || (isMedia && m.content.caption);
        }).slice(0, 15);

        relevantMessages.reverse();

        const conversation = relevantMessages.map(m => `${m.fromMe ? 'Agent' : 'User'}: ${m.content.text || m.content.caption || '[Media]'}`).join('\n');

        const schemaDescription = schema.map(s => `${s.key}: ${s.description}`).join('\n');

        // Condensed Prompt
        const systemPrompt = `
        Extract data from the chat history based on these fields:
        ${schemaDescription}

        Rules:
        - Return strictly JSON.
        - Use stated values or infer with high confidence.
        - Use null if missing.
        - No markdown.

        Format: {"key": "value"}
        `;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: conversation }
        ];

        let content = '';
        if (config.provider === 'gemini') {
            let modelToUse = config.model;
            // Cross-provider safety check
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('claude')) {
                modelToUse = 'gemini-2.5-flash';
            }
            content = await generateGeminiResponse(config.apiKey, modelToUse, messages, 500);
        } else if (config.provider === 'anthropic') {
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('gemini')) {
                modelToUse = 'claude-3-haiku-20240307';
            }
            content = await generateClaudeResponse(config.apiKey, modelToUse, messages, 500);
        } else if (config.provider === 'openrouter') {
            content = await generateOpenAIResponse(config.apiKey, config.model || 'openai/gpt-3.5-turbo', messages, 500, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        } else {
            // OpenAI
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gemini') || modelToUse.includes('claude')) {
                modelToUse = 'gpt-3.5-turbo';
            }
            content = await generateOpenAIResponse(config.apiKey, modelToUse, messages, 500);
        }

        if (content) {
            content = content.replace(/```json\n?|\n?```/g, '').trim();
            try {
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse extraction JSON:', content);
                return {};
            }
        }
        return {};

    } catch (error) {
        console.error('Error in extractData:', error);
        throw error;
    }
};

export const analyzeMessage = async (userId, chatJid, messageText, schema = []) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) return { sentiment: 'neutral', summary: null, suggestions: [], extractedData: {} };

        // [BYOD] Get dynamic models
        const { getClientModels } = await import('../utils/database.factory.js');
        const { WhatsAppSession } = await getClientModels(userId);
        const session = await WhatsAppSession.findOne({ userId });
        // [FIX] Use phoneNumber even if disconnected to access history
        const hostNumber = session?.phoneNumber;

        const { Message, Contact } = await getClientModels(userId, hostNumber);

        // [FIX] Resolve LID to Phone JID for message lookup
        let searchJid = chatJid;
        const isLid = !chatJid.includes('@g.us') && chatJid.includes('@lid');

        if (isLid) {
            const contact = await Contact.findOne({ userId, jid: chatJid });
            if (contact && contact.phoneNumber) {
                searchJid = `${contact.phoneNumber}@s.whatsapp.net`;
            } else {
                console.log(`⚠️ [analyzeMessage] Could not resolve LID ${chatJid} to Phone JID. Contact found: ${!!contact}`);
            }
        }

        const rawMessages = await Message.find({ userId, chatJid: searchJid })
            .sort({ timestamp: -1 })
            .limit(100)
            .lean();

        // Strictly optimize token bounds: Filter noise and take only the 15 most recent text-heavy nodes
        let recentMessages = rawMessages.filter(m => {
            const text = m.content.text || '';
            const isMedia = !text && (m.type === 'image' || m.type === 'video' || m.type === 'document');
            return (text.length > 3) || (isMedia && m.content.caption) || text.includes('?'); // Keep questions even if short
        }).slice(0, 15);

        recentMessages.reverse();

        if (recentMessages.length === 0) {
            return { sentiment: 'neutral', summary: null, suggestions: [], extractedData: {} };
        }

        const conversation = recentMessages.map(m => `${m.fromMe ? 'Agent' : 'User'}: ${m.content.text || m.content.caption || '[Media]'}`).join('\n');

        // Dynamic Schema for Extraction
        let schemaDescription = "";

        // Sanitize schema keys (trim spaces)
        const sanitizedSchema = schema.map(s => ({
            ...s,
            key: s.key.trim()
        }));

        if (sanitizedSchema && sanitizedSchema.length > 0) {
            schemaDescription = sanitizedSchema.map(s => `"${s.key}": ${s.description}`).join('\n');
        } else {
            // Default Fallback Schema
            const defaultSchema = [
                { key: 'name', description: "The user's self-declared name" },
                { key: 'email', description: "User's email address" },
                { key: 'phone', description: "User's phone number" },
                { key: 'requirement', description: "Service or product requested" },
                { key: 'budget', description: "Budget/Pricing constraints" }
            ];
            schemaDescription = defaultSchema.map(s => `"${s.key}": ${s.description}`).join('\n');
        }

        // Debug: Log schema to ensure it's being passed correctly
        console.log('[AI Service] Using Schema:', JSON.stringify(sanitizedSchema, null, 2));

        const systemPrompt = `
        You are an intelligent CRM assistant. Analyze the conversation and extract lead data.
        
        ROLES:
        - 'User': The potential customer/lead. extract data about THIS person.
        - 'Agent': The AI bot or business representative.

        Task:
        1. Analyze Sentiment, Summary, and Suggestions.
        2. EXTRACT data for the following fields based on the conversation context:
        ${schemaDescription}

        CRITICAL INSTRUCTIONS: 
        - Look for these details in the ENTIRE conversation history.
        - "customer name" / "name": Look for self-introductions (e.g., "I am [Name]", "My name is [Name]") or signatures.
        - "service": Look for what the user is asking for or inquiring about.
        - If a value is found, extract it EXACTLY.
        - If not found, use null or empty string.
        - Output strictly valid JSON.

        SENTIMENT RULES (VERY IMPORTANT):
        - "positive": The user is actively inquiring about a product/service, showing interest, or wanting to buy.
        - "negative": The user is complaining, frustrated, or explicitly rejecting an offer.
        - "neutral": General questions without clear purchase intent, simple greetings, or informational exchanges.

        Output Format:
        {
            "sentiment": "positive|neutral|negative",
            "summary": "Short summary",
            "suggestions": ["msg1", "msg2"],
            "extractedData": {
                "key": "value"
            }
        }
        
        Conversation:
        ${conversation}

        Latest: "${messageText}"
        `;

        console.log('[AI Service] Prompt constructed. Sending to AI...');


        const messages = [
            { role: "system", content: config.systemPrompt },
            { role: "user", content: systemPrompt }
        ];

        let content = '';
        if (config.provider === 'gemini') {
            let modelToUse = config.model;
            // Cross-provider safety check
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('claude')) {
                modelToUse = 'gemini-1.5-flash';
            }
            content = await generateGeminiResponse(config.apiKey, modelToUse, messages, 500);
        } else if (config.provider === 'anthropic') {
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gpt') || modelToUse.includes('gemini')) {
                modelToUse = 'claude-3-haiku-20240307';
            }
            content = await generateClaudeResponse(config.apiKey, modelToUse, messages, 400);
        } else if (config.provider === 'openrouter') {
            content = await generateOpenAIResponse(config.apiKey, config.model || 'openai/gpt-3.5-turbo', messages, 500, 'https://openrouter.ai/api/v1', { "HTTP-Referer": "https://localhost" });
        } else {
            // OpenAI
            let modelToUse = config.model;
            if (!modelToUse || modelToUse.includes('gemini') || modelToUse.includes('claude')) {
                modelToUse = 'gpt-3.5-turbo';
            }
            content = await generateOpenAIResponse(config.apiKey, modelToUse, messages, 400);
        }

        if (content) {
            console.log('[AI Service] Raw Content:', content); // LOG RAW CONTENT

            // Robust JSON extraction
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? jsonMatch[0] : content.replace(/```json\n?|\n?```/g, '').trim();

            try {
                const result = JSON.parse(jsonStr);

                // Sanitize extractedData
                let sanitizedData = {};
                if (result.extractedData) {
                    Object.entries(result.extractedData).forEach(([key, value]) => {
                        // Only keep non-null, non-empty values
                        if (value !== null && value !== '' && value !== 'null') {
                            sanitizedData[key.trim()] = String(value); // Trim key and force value to string
                        }
                    });
                }

                console.log('[AI Service] Extracted Data:', JSON.stringify(sanitizedData, null, 2));

                return {
                    sentiment: result.sentiment || 'neutral',
                    summary: result.summary || null,
                    suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
                    extractedData: sanitizedData
                };
            } catch (e) {
                console.warn('Failed to parse analyzeMessage JSON:', content);
                return { sentiment: 'neutral', summary: null, suggestions: [], extractedData: {} };
            }
        }
        return { sentiment: 'neutral', summary: null, suggestions: [], extractedData: {} };


    } catch (error) {
        console.error('Error in analyzeMessage:', error);
        return { sentiment: 'neutral', summary: null, suggestions: [], extractedData: {} };
    }
};
export const analyzeEmail = async (userId, emailText) => {
    try {
        const config = await getUserAIConfig(userId);
        if (!config.apiKey) return null;

        const systemPrompt = `
        You are an intelligent email assistant. Analyze the following email content.
        
        Task:
        1. Generate a very brief Summary (1 sentence).
        2. Rate Importance (1-10) based on urgency, deal size, or support severity.
        3. Give a short Reason for the importance score.

        STRICT PRIORITY RULES:
        - 8-10 (High): Urgent, deal closings, severe support issues, direct leads, payment failures.
        - 4-7 (Medium): Ongoing conversations, internal updates, meetings, questions.
        - 1-3 (Low): Newsletters, cold outreach, automated notifications, spam, promotions.

        Output strictly JSON:
        {
            "summary": "...",
            "importanceScore": number,
            "importanceReason": "..."
        }
        `;

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: emailText.substring(0, 3000) } // Limit text to avoid token limits
        ];

        let content = '';
        if (config.provider === 'gemini') {
            content = await generateGeminiResponse(config.apiKey, 'gemini-2.5-flash', messages, 300);
        } else if (config.provider === 'anthropic') {
            content = await generateClaudeResponse(config.apiKey, 'claude-3-haiku-20240307', messages, 300);
        } else {
            content = await generateOpenAIResponse(config.apiKey, config.model || 'gpt-3.5-turbo', messages, 300);
        }

        if (content) {
            content = content.replace(/```json\n?|\n?```/g, '').trim();
            try {
                return JSON.parse(content);
            } catch (e) {
                console.error('Failed to parse analyzeEmail JSON:', content);
                return null;
            }
        }
        return null;

    } catch (error) {
        console.error('Error in analyzeEmail:', error);
        return null;
    }
};
