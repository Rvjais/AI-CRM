import * as messageService from '../services/message.service.js';
import * as whatsappService from '../services/whatsapp.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { getClientModels } from '../utils/database.factory.js';
import { successResponse, createdResponse, noContentResponse, badRequestResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';
import logger from '../utils/logger.util.js';

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
            mimetype: content.mimetype || (type === 'image' ? 'image/jpeg' : type === 'video' ? 'video/mp4' : 'application/octet-stream')
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
        const hostNumber = sock.user.id.split(':')[0];
        const { Message } = await getClientModels(userId, hostNumber);

        // Search by stanza ID (messageId) if available, or _id
        const qId = quotedData.messageId || quotedMessageId;

        if (qId) {
            // Select rawMessage specifically since it's hidden by default
            quotedMsgDoc = await Message.findOne({ messageId: qId, userId }).select('+rawMessage');
        }

        const qMsg = quotedMsgDoc || quotedData;

        if (qMsg) {
            // If we have the full Baileys rawMessage, use it directly (best fidelity)
            if (qMsg.rawMessage) {
                messageOptions.quoted = qMsg.rawMessage;
            } else if (qMsg.messageId || qMsg.id) {
                // Fallback: Manual construction
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
            }
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
            const hostNumber = sock.user.id.split(':')[0];
            const { Contact } = await getClientModels(userId, hostNumber);
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
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 100);

    const result = await messageService.getChatMessages(
        req.userId,
        chatJid,
        parseInt(page),
        safeLimit
    );

    return successResponse(res, 200, 'Messages retrieved successfully', result);
});

/**
 * Delete message — removes from DB AND sends WA delete for everyone
 * DELETE /api/messages/:messageId
 */
export const deleteMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    const hostNumber = sock?.user?.id?.split(':')[0];
    const { Message } = await getClientModels(userId, hostNumber);

    // Fetch message to get its WhatsApp key
    const message = await Message.findOne({ _id: messageId, userId });
    if (!message) throw new Error('Message not found');

    // Only delete for everyone if it's our own message (fromMe)
    if (sock && message.fromMe && message.messageId) {
        try {
            await whatsappService.sendMessage(userId, message.chatJid, {
                delete: {
                    remoteJid: message.chatJid,
                    fromMe: message.fromMe,
                    id: message.messageId,
                    participant: message.participant
                }
            });
        } catch (waErr) {
            logger.warn('WA delete failed (continuing with DB delete):', waErr.message);
        }
    }

    // Mark as deleted in DB
    await messageService.deleteMessage(messageId, userId);

    return successResponse(res, 200, 'Message deleted successfully');
});

/**
 * Edit message — updates DB AND sends WA edit command
 * PUT /api/messages/:messageId/edit
 */
export const editMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { text } = req.body;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    const hostNumber = sock?.user?.id?.split(':')[0];
    const { Message } = await getClientModels(userId, hostNumber);

    const message = await Message.findOne({ _id: messageId, userId, fromMe: true, type: 'text' });
    if (!message) throw new Error('Message not found or cannot be edited');

    // Send edit to WhatsApp
    if (sock && message.messageId) {
        try {
            await whatsappService.sendMessage(userId, message.chatJid, {
                text,
                edit: {
                    remoteJid: message.chatJid,
                    fromMe: true,
                    id: message.messageId
                }
            });
        } catch (waErr) {
            logger.warn('WA edit failed (continuing with DB edit):', waErr.message);
        }
    }

    // Update DB
    const updated = await messageService.editMessage(messageId, userId, text);
    return successResponse(res, 200, 'Message edited successfully', updated);
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
    const hostNumber = sock.user.id.split(':')[0];
    const { Message } = await getClientModels(req.userId, hostNumber);
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

    // 3. Update DB — toggle like real WhatsApp
    const fromJid = sock.user.id;
    let message;

    if (!emoji) {
        // Remove reaction
        message = await messageService.removeReaction(messageId, req.userId, fromJid);
    } else {
        // Replace any existing reaction from this user with the new one
        message = await messageService.toggleReaction(messageId, req.userId, emoji, fromJid, true);
    }

    return successResponse(res, 200, emoji ? 'Reaction added' : 'Reaction removed', message);
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
    const hostNumber = sock.user.id.split(':')[0];
    const { Message } = await getClientModels(req.userId, hostNumber);
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
 * Mark messages as read — DB + sends blue ticks to WhatsApp
 * POST /api/messages/mark-read
 */
export const markAsRead = asyncHandler(async (req, res) => {
    const { chatJid } = req.body;
    const userId = req.userId;

    // Mark read in DB
    await messageService.markMessagesAsRead(userId, chatJid);

    // Send blue ticks via Baileys
    const sock = whatsappService.getConnection(userId);
    if (sock) {
        try {
            const hostNumber = sock.user?.id?.split(':')[0];
            const { Message } = await getClientModels(userId, hostNumber);
            // Get unread messages with their keys
            const unreadMsgs = await Message.find({
                userId,
                chatJid,
                fromMe: false,
                status: { $ne: 'read' }
            }).select('messageId chatJid participant').lean();

            if (unreadMsgs.length > 0) {
                const keys = unreadMsgs.map(m => ({
                    remoteJid: m.chatJid,
                    id: m.messageId,
                    fromMe: false,
                    participant: m.participant
                }));
                await whatsappService.readMessages(userId, keys);
            }
        } catch (readErr) {
            logger.warn('WA readMessages failed (DB already updated):', readErr.message);
        }
    }

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
    // Use Chat model directly or via service
    const { WhatsAppSession } = await getClientModels(req.userId);
    const session = await WhatsAppSession.findOne({ userId: req.userId });
    const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;
    const { Chat } = await getClientModels(req.userId, hostNumber);

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
    // Use Chat model directly or via service
    const { WhatsAppSession } = await getClientModels(req.userId);
    const session = await WhatsAppSession.findOne({ userId: req.userId });
    const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;
    const { Chat } = await getClientModels(req.userId, hostNumber);

    const chat = await Chat.findOneAndUpdate(
        { userId: req.userId, chatJid },
        { isArchived: archived },
        { new: true, upsert: true }
    );

    return successResponse(res, 200, `Chat ${archived ? 'archived' : 'unarchived'}`, chat);
});

/**
 * Move chat to a different category
 * POST /api/messages/:chatJid/move
 */
export const moveChat = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { category } = req.body; // 'normal', 'campaign', 'archived', 'group'

    if (!['normal', 'campaign', 'archived', 'group'].includes(category)) {
        throw new Error('Invalid category');
    }

    const Chat = (await import('../models/Chat.js')).default;

    const chat = await Chat.findOneAndUpdate(
        { userId: req.userId, chatJid },
        { category: category },
        { new: true, upsert: true }
    );

    return successResponse(res, 200, `Chat moved to ${category}`, chat);
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
            console.error(`❌ [summarizeChat] AI Analysis failed. Result:`, { sentiment, summary, suggestions });
            return badRequestResponse(res, 'Failed to generate summary or AI not configured');
        }

        const { WhatsAppSession } = await getClientModels(userId);
        const session = await WhatsAppSession.findOne({ userId });
        // [FIX] Use phoneNumber even if disconnected to access history
        const hostNumber = session?.phoneNumber;
        const { Chat } = await getClientModels(userId, hostNumber);

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

    const { WhatsAppSession } = await getClientModels(userId);
    const session = await WhatsAppSession.findOne({ userId });
    const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;
    const { Chat } = await getClientModels(userId, hostNumber);

    await Chat.updateMany({ userId }, { aiEnabled: enabled });

    const User = (await import('../models/User.js')).default;
    await User.findByIdAndUpdate(userId, { 'aiSettings.autoReply': enabled });

    const io = req.app.get('io');
    if (io) {
        const chats = await Chat.find({ userId }).lean();
        io.to(userId.toString()).emit('chats:updated', { chats });
        io.to(userId.toString()).emit('config:updated', { autoReply: enabled });
    }

    return successResponse(res, 200, `AI ${enabled ? 'enabled' : 'disabled'} for all chats`, { enabled });
});

/**
 * Mute or unmute a chat
 * POST /api/messages/:chatJid/mute
 */
export const muteChat = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { mute, duration } = req.body; // mute: boolean, duration: milliseconds (null = unmute)
    const userId = req.userId;

    const { WhatsAppSession } = await getClientModels(userId);
    const session = await WhatsAppSession.findOne({ userId });
    const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;
    const { Chat } = await getClientModels(userId, hostNumber);

    // Update DB
    await Chat.findOneAndUpdate(
        { userId, chatJid },
        { isMuted: mute, mutedUntil: mute ? new Date(Date.now() + (duration || 8 * 3600 * 1000)) : null },
        { upsert: true }
    );

    // Sync to WhatsApp
    const sock = whatsappService.getConnection(userId);
    if (sock) {
        try {
            await whatsappService.chatModify(userId, { mute: mute ? (duration || 8 * 60 * 60 * 1000) : null }, chatJid);
        } catch (e) {
            logger.warn('WA mute sync failed:', e.message);
        }
    }

    return successResponse(res, 200, `Chat ${mute ? 'muted' : 'unmuted'}`);
});

/**
 * Pin or unpin a chat
 * POST /api/messages/:chatJid/pin
 */
export const pinChat = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { pinned } = req.body;
    const userId = req.userId;

    const { WhatsAppSession } = await getClientModels(userId);
    const session = await WhatsAppSession.findOne({ userId });
    const hostNumber = session?.status === 'connected' ? session.phoneNumber : null;
    const { Chat } = await getClientModels(userId, hostNumber);

    await Chat.findOneAndUpdate(
        { userId, chatJid },
        { isPinned: pinned },
        { upsert: true }
    );

    // Sync to WhatsApp
    const sock = whatsappService.getConnection(userId);
    if (sock) {
        try {
            await whatsappService.chatModify(userId, { pin: pinned }, chatJid);
        } catch (e) {
            logger.warn('WA pin chat sync failed:', e.message);
        }
    }

    return successResponse(res, 200, `Chat ${pinned ? 'pinned' : 'unpinned'}`);
});

/**
 * Pin or unpin a message
 * POST /api/messages/:messageId/pin
 */
export const pinMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { pin, time } = req.body; // pin: boolean, time: seconds (86400 | 604800 | 2592000)
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    const hostNumber = sock?.user?.id?.split(':')[0];
    const { Message } = await getClientModels(userId, hostNumber);

    const message = await Message.findOne({ _id: messageId, userId });
    if (!message) throw new Error('Message not found');

    // Send pin to WhatsApp
    if (sock) {
        await whatsappService.sendMessage(userId, message.chatJid, {
            pin: {
                type: pin ? 1 : 0,
                time: time || 86400,
                key: {
                    remoteJid: message.chatJid,
                    fromMe: message.fromMe,
                    id: message.messageId,
                    participant: message.participant
                }
            }
        });
    }

    // Update DB
    await Message.findOneAndUpdate({ _id: messageId, userId }, { isPinned: pin });

    return successResponse(res, 200, `Message ${pin ? 'pinned' : 'unpinned'}`);
});

/**
 * Star or unstar a message
 * POST /api/messages/:messageId/star
 */
export const starMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;
    const { star } = req.body;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    const hostNumber = sock?.user?.id?.split(':')[0];
    const { Message } = await getClientModels(userId, hostNumber);

    const message = await Message.findOne({ _id: messageId, userId });
    if (!message) throw new Error('Message not found');

    // Sync to WhatsApp via chatModify
    if (sock) {
        try {
            await whatsappService.chatModify(userId, {
                star: {
                    messages: [{ id: message.messageId, fromMe: message.fromMe }],
                    star
                }
            }, message.chatJid);
        } catch (e) {
            logger.warn('WA star sync failed:', e.message);
        }
    }

    // Update DB
    const updated = await Message.findOneAndUpdate({ _id: messageId, userId }, { isStarred: star }, { new: true });

    return successResponse(res, 200, `Message ${star ? 'starred' : 'unstarred'}`, updated);
});

/**
 * Send a poll message
 * POST /api/messages/send-poll
 */
export const sendPoll = asyncHandler(async (req, res) => {
    const { chatJid, name, values, selectableCount } = req.body;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');

    const sentMessage = await whatsappService.sendMessage(userId, chatJid, {
        poll: {
            name,
            values,
            selectableCount: selectableCount || 1
        }
    });

    return successResponse(res, 200, 'Poll sent', { messageId: sentMessage.key.id });
});

/**
 * Toggle disappearing messages for a chat
 * POST /api/messages/:chatJid/disappearing
 */
export const setDisappearingMessages = asyncHandler(async (req, res) => {
    const { chatJid } = req.params;
    const { ephemeral } = req.body; // seconds: 0 (off), 86400, 604800, 7776000
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');

    await whatsappService.sendMessage(userId, chatJid, {
        disappearingMessagesInChat: ephemeral === 0 ? false : ephemeral
    });

    return successResponse(res, 200, `Disappearing messages ${ephemeral ? 'enabled' : 'disabled'}`);
});

/**
 * Send a WhatsApp Story / Status
 * POST /api/messages/send-story
 */
export const sendStory = asyncHandler(async (req, res) => {
    const { type, mediaUrl, caption, text, statusJidList, backgroundColor, font } = req.body;
    const userId = req.userId;

    const sock = whatsappService.getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');

    let content = {};
    if (type === 'text') {
        content = { text: text || caption || '' };
    } else if (type === 'image') {
        content = { image: { url: mediaUrl }, caption: caption || '' };
    } else if (type === 'video') {
        content = { video: { url: mediaUrl }, caption: caption || '' };
    } else {
        throw new Error('Unsupported story type. Use text, image, or video.');
    }

    await whatsappService.sendMessage(userId, 'status@broadcast', content, {
        backgroundColor: backgroundColor || '#000000',
        font: font || 0,
        statusJidList: statusJidList || [],
        broadcast: true
    });

    return successResponse(res, 200, 'Story/Status sent');
});
