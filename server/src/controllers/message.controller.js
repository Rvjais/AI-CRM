import * as messageService from '../services/message.service.js';
import * as whatsappService from '../services/whatsapp.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { successResponse, createdResponse, noContentResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';

/**
 * Message controller
 * Handles message endpoints
 */

/**
 * Send message
 * POST /api/messages/send
 */
export const sendMessage = asyncHandler(async (req, res) => {
    const { chatJid, type, content, quoted, quotedMessageId, mentions } = req.body;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    let sentMessage;

    // Construct content object based on type
    let messageContent = {};
    let messageOptions = {};

    if (type === MESSAGE_TYPES.TEXT) {
        messageContent = { text: content.text };
        if (mentions) {
            messageContent.mentions = mentions;
        }
    } else if ([MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.VIDEO, MESSAGE_TYPES.AUDIO, MESSAGE_TYPES.DOCUMENT, 'gif'].includes(type) || type === 'sticker') {
        const mediaType = type === 'gif' ? 'video' : type; // GIFs are videos

        messageContent = {
            [mediaType]: { url: content.mediaUrl || content.url },
            caption: content.caption,
            mimetype: content.mimetype
        };

        if (type === 'gif') {
            messageContent.gifPlayback = true;
        }

        if (content.isViewOnce) {
            messageContent.viewOnce = true;
        }

        if (type === 'document' && content.fileName) {
            messageContent.fileName = content.fileName;
        }
    } else if (type === 'location') {
        messageContent = {
            location: {
                degreesLatitude: content.latitude,
                degreesLongitude: content.longitude
            }
        };
    }

    // Handle options
    let quotedMsgDoc = null;

    if (quoted || quotedMessageId) {
        const quotedData = quoted || {};
        const Message = (await import('../models/Message.js')).default;

        // Search by stanza ID (messageId) if available, or _id
        const qId = quotedData.messageId || quotedMessageId;

        if (qId) {
            quotedMsgDoc = await Message.findOne({ messageId: qId, userId });
        }

        const qMsg = quotedMsgDoc || quotedData;

        if (qMsg && (qMsg.messageId || qMsg.id)) { // Support both id formats just in case
            const stanzaId = qMsg.messageId || qMsg.id;

            let quotedContent = {};
            if (qMsg.type === MESSAGE_TYPES.TEXT) {
                quotedContent = { conversation: qMsg.content?.text || '' };
            } else if (qMsg.type === MESSAGE_TYPES.IMAGE) {
                quotedContent = { imageMessage: { caption: qMsg.content?.caption || '' } };
            } else if (qMsg.type === MESSAGE_TYPES.VIDEO) {
                quotedContent = { videoMessage: { caption: qMsg.content?.caption || '' } };
            } else {
                quotedContent = { conversation: '[Media]' };
            }

            messageOptions.quoted = {
                key: {
                    remoteJid: qMsg.chatJid,
                    fromMe: qMsg.fromMe,
                    id: stanzaId,
                    participant: qMsg.participant
                },
                message: quotedContent
            };
        } else {
            // Could not verify quoted message structure.
        }
    }

    sentMessage = await whatsappService.sendMessage(userId, chatJid, messageContent, messageOptions);

    // Save to database
    const messageData = {
        userId,
        messageId: sentMessage.key.id,
        chatJid,
        fromMe: true,
        type,
        content,
        status: MESSAGE_STATUS.SENT,
        timestamp: new Date(),
        mentions,
        quotedMessage: quotedMsgDoc ? quotedMsgDoc._id : undefined // Save reference
    };

    const savedMessage = await messageService.saveMessage(messageData);

    return createdResponse(res, 'Message sent successfully', savedMessage);
});

/**
 * Get all chats
 * GET /api/messages/
 */
export const getAllChats = asyncHandler(async (req, res) => {
    const { includeArchived } = req.query;

    const chats = await messageService.getUserChats(
        req.userId,
        includeArchived === 'true'
    );

    // Return chats directly - successResponse wraps it in { success: true, data: chats }
    return successResponse(res, 200, 'Chats retrieved successfully', chats);
});

/**
 * Get chat messages
 * GET /api/messages/:chatJid
 */
export const getChatMessages = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await messageService.getChatMessages(
        req.userId,
        chatJid,
        parseInt(page),
        parseInt(limit)
    );

    return successResponse(res, 200, 'Messages retrieved successfully', result);
});

/**
 * Delete message
 * DELETE /api/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    await messageService.deleteMessage(messageId, req.userId);

    return successResponse(res, 200, 'Message deleted successfully');
});

/**
 * Edit message
 * PUT /api/messages/:messageId/edit
 */
export const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { text } = req.body;

    const message = await messageService.editMessage(messageId, req.userId, text);

    return successResponse(res, 200, 'Message edited successfully', message);
});

/**
 * React to message
 * POST /api/messages/:messageId/react
 */
export const reactToMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;

    const sock = whatsappService.getConnection(req.userId);
    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    // 1. Fetch original message to get key
    const Message = (await import('../models/Message.js')).default;
    const originalMessage = await Message.findOne({ _id: messageId, userId: req.userId });

    if (!originalMessage) {
        throw new Error('Message not found');
    }

    // 2. Send reaction via WhatsApp
    const reactionMessage = {
        react: {
            text: emoji, // use empty string to remove
            key: {
                remoteJid: originalMessage.chatJid,
                fromMe: originalMessage.fromMe,
                id: originalMessage.messageId
            }
        }
    };

    await whatsappService.sendMessage(req.userId, originalMessage.chatJid, reactionMessage);

    // 3. Update DB
    const message = await messageService.addReaction(
        messageId,
        req.userId,
        emoji,
        sock.user.id
    );

    return successResponse(res, 200, 'Reaction added successfully', message);
});

/**
 * Forward message
 * POST /api/messages/:messageId/forward
 */
export const forwardMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { toJid } = req.body; // Target chat to forward to

    const sock = whatsappService.getConnection(req.userId);
    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    // 1. Fetch original message
    const Message = (await import('../models/Message.js')).default;
    const originalMessage = await Message.findOne({ _id: messageId, userId: req.userId });

    if (!originalMessage) {
        throw new Error('Message not found');
    }

    // 2. Prepare content for forwarding
    // For simplicity, we resend the content. Baileys also allows forwarding context.
    // We will just send the same content type to the new JID.

    // Check if it's text or media
    const type = originalMessage.type;
    const content = originalMessage.content;

    let forwardContent = {};
    if (type === 'text') {
        forwardContent = { text: content.text };
    } else if (['image', 'video', 'audio', 'document'].includes(type) || (type === 'gif')) {
        // Construct media message
        const mediaType = type === 'gif' ? 'video' : type;
        const mediaUrl = content[mediaType]?.url || content.url || content.mediaUrl;

        if (mediaUrl) {
            forwardContent = {
                [mediaType]: { url: mediaUrl },
                caption: content.caption,
                mimetype: content.mimetype
            };

            if (type === 'gif') forwardContent.gifPlayback = true;
            if (content.isViewOnce) forwardContent.viewOnce = true;
        } else {
            throw new Error('Cannot forward media: URL missing');
        }
    } else {
        // Fallback for others
        throw new Error('Message type not supported for forwarding');
    }

    // Add context info to show "Forwarded" label
    const options = {
        contextInfo: {
            isForwarded: true,
            forwardingScore: 1
        }
    };

    // 3. Send via WhatsApp
    const sentMessage = await whatsappService.sendMessage(req.userId, toJid, forwardContent, options);

    // 4. Save new message record
    const newMessageData = {
        userId: req.userId,
        messageId: sentMessage.key.id,
        chatJid: toJid,
        fromMe: true,
        type: type,
        content: content, // Save same content
        status: 'sent',
        timestamp: new Date(),
        isForwarded: true
    };

    const savedMessage = await messageService.saveMessage(newMessageData);

    return successResponse(res, 200, 'Message forwarded successfully', savedMessage);
});

/**
 * Get unread message count
 * GET /api/messages/unread
 */
export const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await messageService.getUnreadCount(req.userId);

    return successResponse(res, 200, 'Unread count retrieved', { count });
});

/**
 * Mark messages as read
 * POST /api/messages/mark-read
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { chatJid } = req.body;

    await messageService.markMessagesAsRead(req.userId, chatJid);

    return successResponse(res, 200, 'Messages marked as read');
});

/**
 * Toggle AI for chat
 * POST /api/messages/:chatJid/toggle-ai
 */
export const toggleAI = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { enabled } = req.body;

    // Use Chat model directly or via service
    const Chat = (await import('../models/Chat.js')).default;

    const chat = await Chat.findOneAndUpdate(
        { userId: req.userId, chatJid },
        { aiEnabled: enabled },
        { new: true, upsert: true } // Create if not exists
    );

    return successResponse(res, 200, `AI ${enabled ? 'enabled' : 'disabled'} for chat`, chat);
});

/**
 * Toggle Archive status for chat
 * POST /api/messages/:chatJid/archive
 */
export const toggleArchive = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { archived } = req.body;

    // Use Chat model directly or via service
    const Chat = (await import('../models/Chat.js')).default;

    const chat = await Chat.findOneAndUpdate(
        { userId: req.userId, chatJid },
        { isArchived: archived },
        { new: true, upsert: true }
    );

    return successResponse(res, 200, `Chat ${archived ? 'archived' : 'unarchived'}`, chat);
});

/**
 * Force regenerate AI summary for a chat
 * POST /api/messages/:chatJid/summarize
 */
export const summarizeChat = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const userId = req.userId;

    const { generateSummary } = await import('../services/ai.service.js');
    const summary = await generateSummary(userId, chatJid);

    if (!summary) {
        return successResponse(res, 400, 'Failed to generate summary or AI not configured');
    }

    const Chat = (await import('../models/Chat.js')).default;
    const updatedChat = await Chat.findOneAndUpdate(
        { userId, chatJid },
        {
            summary,
            lastSummaryAt: new Date()
        },
        { new: true, upsert: true }
    ).lean();

    // Notify frontend via socket
    const io = req.app.get('io');
    if (io) {
        io.to(userId.toString()).emit('chat:update', { chat: updatedChat });
    }

    return successResponse(res, 200, 'Summary regenerated successfully', updatedChat);
});

/**
 * Bulk toggle AI for all chats
 * POST /api/messages/bulk-toggle-ai
 */
export const bulkToggleAI = asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const userId = req.userId;

    const Chat = (await import('../models/Chat.js')).default;

    await Chat.updateMany(
        { userId },
        { aiEnabled: enabled }
    );

    // Fetch all updated chats to notify frontend (optional, but good for sync)
    // Actually, it's better to just tell frontend to refresh or return a status
    const chats = await Chat.find({ userId }).lean();

    // Notify frontend via socket
    const io = req.app.get('io');
    if (io) {
        io.to(userId.toString()).emit('chats:updated', { chats });
    }

    return successResponse(res, 200, `AI ${enabled ? 'enabled' : 'disabled'} for all chats`, { enabled });
});
