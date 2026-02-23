import env from '../config/env.js';
import logger from '../utils/logger.util.js';

/**
 * Initiates an outbound call using Bolna AI
 * @param {string} agentId - The Bolna Agent ID
 * @param {string} recipientPhone - The recipient's phone number
 * @param {string} bolnaApiKey - Optional override for Bolna API Key
 * @returns {Promise<Object>} - Response from Bolna API
 */
export const initiateBolnaCall = async (agentId, recipientPhone, bolnaApiKey = null) => {
    try {
        const apiKey = bolnaApiKey || env.BOLNA_API_KEY;
        if (!apiKey) {
            throw new Error('Bolna API key is not configured');
        }

        const response = await fetch('https://api.bolna.dev/call', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                agent_id: agentId,
                recipient_phone_number: recipientPhone
            })
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Bolna API Error: ${response.status} - ${errorData}`);
        }

        return await response.json();
    } catch (error) {
        logger.error('Error initiating Bolna call:', error);
        throw error;
    }
};

/**
 * Handles incoming Bolna webhooks
 * @param {Object} payload - The webhook payload from Bolna
 */
export const processBolnaWebhook = async (payload) => {
    try {
        logger.info('Processing Bolna Webhook:', JSON.stringify(payload, null, 2));

        // Example payload fields based on standard voice agent webhooks:
        // { event: "call.completed", call_id: "...", duration: 120, transcript: "...", parameters: {} }

        // For now, we simply log the event. 
        if (payload.event === 'call.completed') {
            logger.info(`Bolna Call ${payload.call_id} completed. Transcript length: ${payload.transcript?.length || 0}`);
        }

        // To handle generic webhooks without a user id in the URL, 
        // we must iterate through users to find who owns this agent.
        const { default: User } = await import('../models/User.js');
        const { getClientModels } = await import('../utils/database.factory.js');

        // Fast O(1) query using the mapped array in the Master schema
        const checkAgentId = payload.agent_id || (payload.agent && payload.agent.id);

        if (checkAgentId) {
            const user = await User.findOne({ bolnaAgentIds: checkAgentId });
            if (user) {
                logger.info(`Received Bolna webhook event for agent ${checkAgentId} (User: ${user.email}). No action taken as data is fetched live.`);
                // If we needed to save something to the User's dynamic DB:
                // const { VoiceAgent } = await getClientModels(user.id);
                // await VoiceAgent.updateOne({ bolna_agent_id: checkAgentId }, ...);
            } else {
                logger.warn(`Received Bolna webhook event for agent ${checkAgentId}, but no matching User was found in the CRM master index.`);
            }
        }

        return true;
    } catch (error) {
        logger.error('Error processing Bolna webhook:', error);
        throw error;
    }
};

/**
 * Fetches call executions for a specific Bolna Agent
 * @param {string} agentId - The Bolna Agent ID
 * @param {string} bolnaApiKey - Optional override for Bolna API Key
 * @param {number} pageNumber - Page number to fetch (default: 1)
 * @returns {Promise<Object>} - Response from Bolna API
 */
export const fetchAgentExecutions = async (agentId, bolnaApiKey = null, pageNumber = 1) => {
    try {
        const apiKey = bolnaApiKey || env.BOLNA_API_KEY;
        if (!apiKey) {
            throw new Error('Bolna API key is not configured');
        }

        const response = await fetch(`https://api.bolna.dev/v2/agent/${agentId}/executions?page_number=${pageNumber}&page_size=50`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorData = await response.text();
            throw new Error(`Bolna API Error: ${response.status} - ${errorData}`);
        }

        return await response.json();
    } catch (error) {
        logger.error(`Error fetching executions for Bolna agent ${agentId}:`, error);
        throw error;
    }
};
