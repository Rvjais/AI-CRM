import { getGmailClient } from '../config/google.config.js';
import User from '../models/User.js';
import logger from '../utils/logger.util.js';

/**
 * Gmail Service
 * Handles integration with Gmail API for listing, reading, and sending emails
 */

/**
 * Get an authenticated Gmail client for a user
 * @param {string} userId 
 */
export const getClientForUser = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.gmailConnected) {
        throw new Error('Gmail not connected for this user');
    }

    // google-auth-library handles token refreshing automatically if we provide the refresh token
    // and correctly configure the client. 
    return getGmailClient(user.gmailAccessToken, user.gmailRefreshToken);
};

/**
 * List email threads
 * @param {string} userId 
 * @param {object} options - query options (maxResults, q, pageToken)
 */
export const listThreads = async (userId, options = {}) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.threads.list({
        userId: 'me',
        maxResults: options.maxResults || 20,
        q: options.q || '', // Gmail search query
        pageToken: options.pageToken
    });

    const threads = response.data.threads || [];
    const nextPageToken = response.data.nextPageToken;

    // Fetch basic metadata for each thread to avoid placeholders in the list
    const enhancedThreads = await Promise.all(threads.map(async (thread) => {
        try {
            const detail = await gmail.users.threads.get({
                userId: 'me',
                id: thread.id,
                format: 'metadata',
                metadataHeaders: ['Subject', 'From', 'Date']
            });

            const messages = detail.data.messages || [];
            if (messages.length === 0) return { ...thread };

            const lastMessage = messages[messages.length - 1];
            const headers = lastMessage.payload.headers;

            return {
                ...thread,
                subject: headers.find(h => h.name === 'Subject')?.value || '(No Subject)',
                from: headers.find(h => h.name === 'From')?.value || '(Unknown Sender)',
                date: headers.find(h => h.name === 'Date')?.value || '',
                timestamp: lastMessage.internalDate
            };
        } catch (error) {
            logger.error(`Error fetching metadata for thread ${thread.id}:`, error);
            return { ...thread };
        }
    }));

    return {
        threads: enhancedThreads,
        nextPageToken
    };
};

/**
 * Get thread details with messages
 * @param {string} userId 
 * @param {string} threadId 
 */
export const getThread = async (userId, threadId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full'
    });

    return response.data;
};

/**
 * Send an email
 * @param {string} userId 
 * @param {object} emailData - { to, subject, body, threadId }
 */
export const sendEmail = async (userId, emailData) => {
    const gmail = await getClientForUser(userId);

    // Construct the email in MIME format
    const str = [
        `To: ${emailData.to}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${emailData.subject}`,
        '',
        emailData.body,
    ].join('\n');

    const encodedMail = Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const message = {
        raw: encodedMail
    };

    if (emailData.threadId) {
        message.threadId = emailData.threadId;
    }

    const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: message
    });

    return response.data;
};

/**
 * Create a draft
 * @param {string} userId 
 * @param {object} emailData 
 */
export const createDraft = async (userId, emailData) => {
    const gmail = await getClientForUser(userId);

    const str = [
        `To: ${emailData.to || ''}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${emailData.subject || ''}`,
        '',
        emailData.body || '',
    ].join('\n');

    const encodedMail = Buffer.from(str)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    const response = await gmail.users.drafts.create({
        userId: 'me',
        requestBody: {
            message: {
                raw: encodedMail
            }
        }
    });

    return response.data;
};

/**
 * Trash a thread
 * @param {string} userId 
 * @param {string} threadId 
 */
export const trashThread = async (userId, threadId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.threads.trash({
        userId: 'me',
        id: threadId
    });

    return response.data;
};

/**
 * Get user profile
 * @param {string} userId 
 */
export const getProfile = async (userId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.getProfile({
        userId: 'me'
    });

    return response.data;
};

/**
 * List Gmail labels
 * @param {string} userId 
 */
export const listLabels = async (userId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.labels.list({
        userId: 'me'
    });

    return response.data;
};
