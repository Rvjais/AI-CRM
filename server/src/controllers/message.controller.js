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

    // [FIX] Normalize LID for outgoing messages
    let targetJid = chatJid;
    let storageJid = chatJid;

    // Check if JID is a LID (longer than typical phone, usually ~15 digits for user part)
    // Phone numbers: 10-13 digits. IDs: 15+ digits.
    const isLid = !chatJid.includes('@g.us') && chatJid.replace('@s.whatsapp.net', '').replace('@lid', '').length > 14;

    if (isLid) {
        try {
            // Check if we have a mapping for this LID
            const Contact = (await import('../models/Contact.js')).default;
            const contact = await Contact.findOne({ userId, jid: chatJid });

            if (contact && contact.phoneNumber) {
                // We found a link! Use Phone JID for storage.
                const phoneJid = `${contact.phoneNumber}@s.whatsapp.net`;
                console.log(`🔄 [sendMessage] Resolved LID ${chatJid} -> Phone JID ${phoneJid} for storage`);
                storageJid = phoneJid;
            }
        } catch (e) {
            console.warn('Error resolving LID to Phone:', e);
        }
    }

    sentMessage = await whatsappService.sendMessage(userId, targetJid, messageContent, messageOptions);

    // Save to database with NORMALIZED JID
    const messageData = {
        userId,
        messageId: sentMessage.key.id,
        chatJid: storageJid, // Use the resolved Phone JID if available
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
 * Normalize chats (Merge LID and Phone)
 * POST /api/messages/normalize
 */
export const normalizeChats = asyncHandler(async (req, res) => {
    const userId = req.userId;
    const result = await messageService.normalizeChats(userId);

    return successResponse(res, 200, 'Chats normalized successfully', result);
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
 */
export const summarizeChat = asyncHandler(async (req, res) => {
    try {
        const { chatJid } = req.params;
        const decodedJid = decodeURIComponent(chatJid);
        const userId = req.userId; // properly use userId from middleware

        // Fetch user settings for Sheets config
        const User = (await import('../models/User.js')).default;
        const user = await User.findById(userId).select('sheetsConfig');
        const sheetsConfig = user?.sheetsConfig || {};
        const schema = sheetsConfig.columns || [];

        const aiService = (await import('../services/ai.service.js'));
        // Optimized: Use consolidated analysis
        const { sentiment, summary, suggestions, extractedData } = await aiService.analyzeMessage(userId, decodedJid, "Regenerate insights based on full history.", schema);

        if (!summary) {
            return successResponse(res, 400, 'Failed to generate summary or AI not configured');
        }

        const Chat = (await import('../models/Chat.js')).default;

        // Update chat with ALL new insights
        const updateData = {
            summary,
            sentiment,
            suggestions,
            lastSummaryAt: new Date()
        };

        if (extractedData && Object.keys(extractedData).length > 0) {
            updateData.extractedData = extractedData;
        }

        const chat = await Chat.findOneAndUpdate(
            { userId, chatJid: decodedJid },
            updateData,
            { new: true, upsert: true }
        ).lean();

        // Emit update to frontend
        const io = req.app.get('io');
        if (io) {
            io.to(userId.toString()).emit('chat:update', { chat });
        }

        // Auto-sync if data found during regeneration
        if (sheetsConfig.spreadsheetId && extractedData && Object.keys(extractedData).length > 0) {
            try {
                const sheetsService = (await import('../services/sheets.service.js'));
                await sheetsService.syncChatToSheet(userId, decodedJid, extractedData);
            } catch (syncError) {
                console.error('Auto-sync failed during regeneration:', syncError);
            }
        }

        return successResponse(res, 200, 'Summary regenerated successfully', chat);
    } catch (error) {
        console.error('Error generating summary:', error);
        return successResponse(res, 500, 'Failed to generate summary');
    }
});

/**
 * Bulk toggle AI for all chats
 * POST /api/messages/bulk-toggle-ai
 */
export const bulkToggleAI = asyncHandler(async (req, res) => {
    const { enabled } = req.body;
    const userId = req.userId;

    const Chat = (await import('../models/Chat.js')).default;

    // Update all chats
    await Chat.updateMany(
        { userId },
        { aiEnabled: enabled }
    );

    // Also update the User's default autoReply setting to match
    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(userId, {
        'aiSettings.autoReply': enabled
    });

    // Notify frontend via socket
    const io = req.app.get('io');
    if (io) {
        // Fetch all updated chats to notify frontend
        const chats = await Chat.find({ userId }).lean();
        io.to(userId.toString()).emit('chats:updated', { chats });

        // Also emit config update so settings page refreshes if open
        io.to(userId.toString()).emit('config:updated', { autoReply: enabled });
    }

    return successResponse(res, 200, `AI ${enabled ? 'enabled' : 'disabled'} for all chats`, { enabled });
});
