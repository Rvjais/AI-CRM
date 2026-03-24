import twilio from 'twilio';
import logger from '../utils/logger.util.js';
import User from '../models/User.js';

/**
 * Get a Twilio client for a specific user
 */
const getTwilioClient = async (userId) => {
    const user = await User.findById(userId).select('+twilioConfig.accountSid +twilioConfig.authToken');
    if (!user?.twilioConfig?.accountSid || !user?.twilioConfig?.authToken) {
        throw new Error('Twilio credentials not configured. Please add them in Infrastructure settings.');
    }
    return {
        client: twilio(user.twilioConfig.accountSid, user.twilioConfig.authToken),
        phoneNumber: user.twilioConfig.phoneNumber,
        accountSid: user.twilioConfig.accountSid
    };
};

/**
 * Make an outbound call
 */
export const makeCall = async (userId, to, statusCallbackUrl) => {
    const { client, phoneNumber } = await getTwilioClient(userId);
    if (!phoneNumber) {
        throw new Error('Twilio phone number not configured.');
    }

    const callParams = {
        to,
        from: phoneNumber,
        twiml: '<Response><Say>Hello, you have a call from Rain CRM. Please hold while we connect you.</Say><Dial>' + phoneNumber + '</Dial></Response>',
    };

    if (statusCallbackUrl) {
        callParams.statusCallback = statusCallbackUrl;
        callParams.statusCallbackEvent = ['initiated', 'ringing', 'answered', 'completed'];
        callParams.statusCallbackMethod = 'POST';
    }

    const call = await client.calls.create(callParams);
    logger.info(`Twilio call initiated: ${call.sid} to ${to}`);
    return call;
};

/**
 * List call history from Twilio
 */
export const listCalls = async (userId, { limit = 50, status, startTimeAfter, startTimeBefore } = {}) => {
    const { client } = await getTwilioClient(userId);

    const filters = { limit };
    if (status) filters.status = status;
    if (startTimeAfter) filters.startTimeAfter = new Date(startTimeAfter);
    if (startTimeBefore) filters.startTimeBefore = new Date(startTimeBefore);

    const calls = await client.calls.list(filters);
    return calls.map(call => ({
        sid: call.sid,
        to: call.to,
        toFormatted: call.toFormatted,
        from: call.from,
        fromFormatted: call.fromFormatted,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit,
        startTime: call.startTime,
        endTime: call.endTime,
        dateCreated: call.dateCreated,
        answeredBy: call.answeredBy,
    }));
};

/**
 * Get a single call by SID
 */
export const getCall = async (userId, callSid) => {
    const { client } = await getTwilioClient(userId);
    const call = await client.calls(callSid).fetch();
    return {
        sid: call.sid,
        to: call.to,
        toFormatted: call.toFormatted,
        from: call.from,
        fromFormatted: call.fromFormatted,
        status: call.status,
        direction: call.direction,
        duration: call.duration,
        price: call.price,
        priceUnit: call.priceUnit,
        startTime: call.startTime,
        endTime: call.endTime,
        dateCreated: call.dateCreated,
        answeredBy: call.answeredBy,
        queueTime: call.queueTime,
    };
};

/**
 * Get call stats summary
 */
export const getCallStats = async (userId) => {
    const { client } = await getTwilioClient(userId);

    // Fetch recent calls for stats
    const calls = await client.calls.list({ limit: 200 });

    let totalCalls = calls.length;
    let completedCalls = 0;
    let totalDuration = 0;
    let totalCost = 0;
    let inboundCalls = 0;
    let outboundCalls = 0;

    for (const call of calls) {
        if (call.status === 'completed') {
            completedCalls++;
            totalDuration += parseInt(call.duration || '0', 10);
        }
        if (call.price) {
            totalCost += Math.abs(parseFloat(call.price));
        }
        if (call.direction === 'inbound') inboundCalls++;
        else outboundCalls++;
    }

    return {
        totalCalls,
        completedCalls,
        totalDuration,
        avgDuration: completedCalls > 0 ? Math.round(totalDuration / completedCalls) : 0,
        totalCost: totalCost.toFixed(4),
        priceUnit: calls[0]?.priceUnit || 'USD',
        inboundCalls,
        outboundCalls,
    };
};

/**
 * Verify Twilio credentials
 */
export const verifyCredentials = async (accountSid, authToken) => {
    const client = twilio(accountSid, authToken);
    const account = await client.api.accounts(accountSid).fetch();
    return {
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
    };
};
