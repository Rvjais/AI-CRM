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
    const { chatJid, type, content, quotedMessageId, mentions } = req.body;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    let sentMessage;

    // Send based on type
    if (type === MESSAGE_TYPES.TEXT) {
        sentMessage = await sock.sendMessage(chatJid, { text: content.text });
    } else if ([MESSAGE_TYPES.IMAGE, MESSAGE_TYPES.VIDEO, MESSAGE_TYPES.AUDIO, MESSAGE_TYPES.DOCUMENT].includes(type)) {
        sentMessage = await sock.sendMessage(chatJid, {
            [type]: { url: content.mediaUrl },
            caption: content.caption,
        });
    }

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
    const { toJid } = req.body;

    // Implementation would involve fetching the message and resending
    return successResponse(res, 501, 'Forward not yet implemented');
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
