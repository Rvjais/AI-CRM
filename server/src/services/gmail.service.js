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
                snippet: thread.snippet, // Pass snippet from list response (it's in the initial thread object)
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

/**
 * Get unread email stats
 */
export const getUnreadStats = async (userId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.labels.get({
        userId: 'me',
        id: 'UNREAD'
    });

    return {
        messagesUnread: response.data.messagesUnread,
        threadsUnread: response.data.threadsUnread
    };
};

/**
 * Untrash a thread
 */
export const untrashThread = async (userId, threadId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.threads.untrash({
        userId: 'me',
        id: threadId
    });
    return response.data;
};

/**
 * Modify thread labels (add/remove)
 */
export const modifyThreadLabels = async (userId, threadId, addLabelIds = [], removeLabelIds = []) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.threads.modify({
        userId: 'me',
        id: threadId,
        requestBody: {
            addLabelIds,
            removeLabelIds
        }
    });
    return response.data;
};

/**
 * Star a thread (add STARRED label)
 */
export const starThread = async (userId, threadId) => {
    return modifyThreadLabels(userId, threadId, ['STARRED'], []);
};

/**
 * Unstar a thread (remove STARRED label)
 */
export const unstarThread = async (userId, threadId) => {
    return modifyThreadLabels(userId, threadId, [], ['STARRED']);
};

/**
 * Archive a thread (remove INBOX label)
 */
export const archiveThread = async (userId, threadId) => {
    return modifyThreadLabels(userId, threadId, [], ['INBOX']);
};

/**
 * Unarchive / move to inbox
 */
export const unarchiveThread = async (userId, threadId) => {
    return modifyThreadLabels(userId, threadId, ['INBOX'], []);
};

/**
 * Mark thread as read (remove UNREAD label)
 */
export const markThreadRead = async (userId, threadId) => {
    return modifyThreadLabels(userId, threadId, [], ['UNREAD']);
};

/**
 * Mark thread as unread (add UNREAD label)
 */
export const markThreadUnread = async (userId, threadId) => {
    return modifyThreadLabels(userId, threadId, ['UNREAD'], []);
};

/**
 * Modify message labels (for single message operations)
 */
export const modifyMessageLabels = async (userId, messageId, addLabelIds = [], removeLabelIds = []) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
            addLabelIds,
            removeLabelIds
        }
    });
    return response.data;
};

/**
 * Trash a single message
 */
export const trashMessage = async (userId, messageId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.messages.trash({
        userId: 'me',
        id: messageId
    });
    return response.data;
};

/**
 * Untrash a single message
 */
export const untrashMessage = async (userId, messageId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.messages.untrash({
        userId: 'me',
        id: messageId
    });
    return response.data;
};

/**
 * Get a single message
 */
export const getMessage = async (userId, messageId, format = 'full') => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format
    });
    return response.data;
};

/**
 * Get message attachment
 */
export const getAttachment = async (userId, messageId, attachmentId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.messages.attachments.get({
        userId: 'me',
        messageId,
        id: attachmentId
    });
    return response.data;
};

/**
 * List drafts
 */
export const listDrafts = async (userId, options = {}) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.drafts.list({
        userId: 'me',
        maxResults: options.maxResults || 20,
        pageToken: options.pageToken
    });
    return response.data;
};

/**
 * Delete a draft permanently
 */
export const deleteDraft = async (userId, draftId) => {
    const gmail = await getClientForUser(userId);
    await gmail.users.drafts.delete({
        userId: 'me',
        id: draftId
    });
    return { deleted: true };
};

/**
 * Get a specific draft
 */
export const getDraft = async (userId, draftId) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.drafts.get({
        userId: 'me',
        id: draftId,
        format: 'full'
    });
    return response.data;
};

/**
 * Batch modify messages (add/remove labels on multiple messages)
 */
export const batchModifyMessages = async (userId, messageIds, addLabelIds = [], removeLabelIds = []) => {
    const gmail = await getClientForUser(userId);
    await gmail.users.messages.batchModify({
        userId: 'me',
        requestBody: {
            ids: messageIds,
            addLabelIds,
            removeLabelIds
        }
    });
    return { modified: true };
};

/**
 * Batch delete messages permanently
 */
export const batchDeleteMessages = async (userId, messageIds) => {
    const gmail = await getClientForUser(userId);
    await gmail.users.messages.batchDelete({
        userId: 'me',
        requestBody: {
            ids: messageIds
        }
    });
    return { deleted: true };
};

/**
 * List message history
 */
export const listHistory = async (userId, startHistoryId, options = {}) => {
    const gmail = await getClientForUser(userId);
    const response = await gmail.users.history.list({
        userId: 'me',
        startHistoryId,
        maxResults: options.maxResults || 100,
        pageToken: options.pageToken
    });
    return response.data;
};
