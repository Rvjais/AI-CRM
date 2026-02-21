import { successResponse, internalErrorResponse, badRequestResponse } from '../utils/response.util.js';
import * as bolnaService from '../services/bolna.service.js';
import logger from '../utils/logger.util.js';
import env from '../config/env.js';

export const initiateCall = async (req, res) => {
    try {
        const { agentId, recipientPhone } = req.body;

        if (!recipientPhone) {
            return badRequestResponse(res, 'Recipient phone number is required');
        }

        // Use environment variable agent ID if not provided in the request
        const finalAgentId = agentId || env.BOLNA_AGENT_ID;

        if (!finalAgentId) {
            return badRequestResponse(res, 'Bolna Agent ID is required');
        }

        const result = await bolnaService.initiateBolnaCall(finalAgentId, recipientPhone);

        return successResponse(res, 200, 'Call initiated successfully', result);
    } catch (error) {
        logger.error('Initiate Call Error:', error);
        return internalErrorResponse(res, error.message || 'Failed to initiate call');
    }
};

export const handleWebhook = async (req, res) => {
    try {
        const payload = req.body;

        // Process the webhook asynchronously or await it
        await bolnaService.processBolnaWebhook(payload);

        // Webhooks should respond quickly
        return successResponse(res, 200, 'Webhook received');
    } catch (error) {
        logger.error('Bolna Webhook Error:', error);
        // Even on error, it's often best practice to return 200 to third-party webhooks to prevent retries if our logic fails, 
        // but 500 can be used if we want Bolna to retry.
        return internalErrorResponse(res, 'Failed to process webhook');
    }
};
