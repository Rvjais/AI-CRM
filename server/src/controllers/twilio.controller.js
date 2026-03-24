import { asyncHandler } from '../middleware/error.middleware.js';
import { successResponse, badRequestResponse, internalErrorResponse } from '../utils/response.util.js';
import * as twilioService from '../services/twilio.service.js';
import logger from '../utils/logger.util.js';

/**
 * Make an outbound call
 * POST /api/twilio/call
 */
export const makeCall = asyncHandler(async (req, res) => {
    const { to } = req.body;
    if (!to) {
        return badRequestResponse(res, 'Recipient phone number is required');
    }

    const result = await twilioService.makeCall(req.userId, to);
    return successResponse(res, 200, 'Call initiated successfully', result);
});

/**
 * List call history
 * GET /api/twilio/calls
 */
export const listCalls = asyncHandler(async (req, res) => {
    const { limit, status, startTimeAfter, startTimeBefore } = req.query;
    const calls = await twilioService.listCalls(req.userId, {
        limit: limit ? parseInt(limit, 10) : 50,
        status,
        startTimeAfter,
        startTimeBefore,
    });
    return successResponse(res, 200, 'Call history retrieved', calls);
});

/**
 * Get a single call
 * GET /api/twilio/calls/:callSid
 */
export const getCall = asyncHandler(async (req, res) => {
    const { callSid } = req.params;
    if (!callSid) {
        return badRequestResponse(res, 'Call SID is required');
    }
    const call = await twilioService.getCall(req.userId, callSid);
    return successResponse(res, 200, 'Call retrieved', call);
});

/**
 * Get call stats
 * GET /api/twilio/stats
 */
export const getCallStats = asyncHandler(async (req, res) => {
    const stats = await twilioService.getCallStats(req.userId);
    return successResponse(res, 200, 'Call stats retrieved', stats);
});

/**
 * Twilio status callback webhook
 * POST /api/twilio/webhook/status
 */
export const handleStatusCallback = async (req, res) => {
    try {
        const payload = req.body;
        logger.info('Twilio Status Callback:', JSON.stringify(payload));
        // Just acknowledge - Twilio expects a quick 200
        return res.status(200).send('<Response></Response>');
    } catch (error) {
        logger.error('Twilio webhook error:', error);
        return res.status(200).send('<Response></Response>');
    }
};

/**
 * Twilio incoming call webhook (TwiML)
 * POST /api/twilio/webhook/voice
 */
export const handleIncomingCall = async (req, res) => {
    try {
        const { From, To, CallSid } = req.body;
        logger.info(`Incoming call from ${From} to ${To} (SID: ${CallSid})`);

        // Respond with TwiML to handle the incoming call
        res.type('text/xml');
        return res.status(200).send(
            `<Response>
                <Say>Thank you for calling. This call is being handled by Rain CRM.</Say>
                <Pause length="1"/>
                <Say>Goodbye.</Say>
            </Response>`
        );
    } catch (error) {
        logger.error('Incoming call webhook error:', error);
        res.type('text/xml');
        return res.status(200).send('<Response><Say>An error occurred.</Say></Response>');
    }
};
