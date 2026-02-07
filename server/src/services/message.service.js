import { MESSAGE_STATUS } from '../config/constants.js';
import logger from '../utils/logger.util.js';
import { getClientModels } from '../utils/database.factory.js';

/**
 * Message service
 * Handles message storage, retrieval, and processing
 */

/**
 * Save message to database
 * @param {Object} messageData - Message data
 * @returns {Object} Saved message
 */
export const saveMessage = async (messageData) => {
    try {
        const { Message, Chat } = await getClientModels(messageData.userId);

        // Use findOneAndUpdate with upsert to prevent duplicate key errors
        // Ensure chatJid is consistent if this is a LID but we have a phone number
        let finalChatJid = messageData.chatJid;
        if (messageData.senderPn && finalChatJid.length > 15 && !finalChatJid.includes('@g.us')) {
            // Basic heuristic: if we have a senderPn and the JID looks like a LID (long ID) and not a group
            // We normalize to phone number JID
            const phoneJid = `${messageData.senderPn}@s.whatsapp.net`;
            if (finalChatJid !== phoneJid) {
                logger.info(`[saveMessage] Normalizing LID ${finalChatJid} -> ${phoneJid}`);
                finalChatJid = phoneJid;
            }
        }

        const message = await Message.findOneAndUpdate(
            { messageId: messageData.messageId, userId: messageData.userId },
            { ...messageData, chatJid: finalChatJid },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        // Update chat last message timestamp
        await Chat.findOneAndUpdate(
            { userId: messageData.userId, chatJid: messageData.chatJid },
            {
                lastMessageAt: message.timestamp,
                $inc: { unreadCount: messageData.fromMe ? 0 : 1 },
            },
            { upsert: true }
        );

        logger.info(`Message saved: ${message.messageId}`);
        return message;
    } catch (error) {
        logger.error('Save message error:', error);
        throw error;
    }
};

/**
 * Get chat messages with pagination
 * @param {String} userId - User ID
 * @param {String} chatJid - Chat JID
 * @param {Number} page - Page number
 * @param {Number} limit - Limit per page
 * @returns {Object} Messages and pagination info
 */
export const getChatMessages = async (userId, chatJid, page = 1, limit = 50) => {
    try {
        const { Message } = await getClientModels(userId);
        const skip = (page - 1) * limit;

        const [messages, total] = await Promise.all([
            Message.find({ userId, chatJid, isDeleted: false })
                .sort({ timestamp: -1 })
                .skip(skip)
                .limit(limit)
                .populate('quotedMessage', 'content type senderName senderPn participant messageId') // Populate sender info too
                .lean(),
            Message.countDocuments({ userId, chatJid, isDeleted: false }),
        ]);

        return {
            messages: messages.reverse(), // Return in chronological order
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    } catch (error) {
        logger.error('Get chat messages error:', error);
        throw error;
    }
};

/**
 * Get all chats for user with last message
 * @param {String} userId - User ID
 * @param {Boolean} includeArchived - Include archived chats
 * @returns {Array} Chats with last message
 */
export const getUserChats = async (userId, includeArchived = false) => {
    try {
        const { Message, Chat, Contact } = await getClientModels(userId);

        // Get all unique chat JIDs from messages
        const chatJids = await Message.distinct('chatJid', { userId });
        // logger.info(`getUserChats: Found ${chatJids.length} unique chatJids for user ${userId}`);

        // OPTIMIZATION: Fetch ALL contacts for this user to resolve names efficiently
        // This helps when the 'Phone' contact has no name, but a 'LID' contact for the same phone DOES.
        const allContacts = await Contact.find({ userId }).lean();
        const phoneToNameMap = {};

        allContacts.forEach(c => {
            if (c.phoneNumber && c.name && c.name !== c.phoneNumber) {
                // Priority to names that are NOT just the phone number
                phoneToNameMap[c.phoneNumber] = c.name;
            }
        });

        // Get chat details and last message for each
        const chats = await Promise.all(
            chatJids.map(async (chatJid) => {
                const [lastMessage, chatInfo, unreadCount, contactInfo] = await Promise.all([
                    Message.findOne({ userId, chatJid, isDeleted: false })
                        .sort({ timestamp: -1 })
                        .lean(),
                    Chat.findOne({ userId, chatJid }).lean(),
                    Message.countDocuments({
                        userId,
                        chatJid,
                        fromMe: false,
                        status: { $ne: MESSAGE_STATUS.READ },
                        isDeleted: false
                    }),
                    // We already fetched all contacts, but finding specific one here is still okay for direct match
                    // But we can just use our map mostly. 
                    // Let's keep specific find for direct JID match in case it has specific metadata? 
                    // Actually, let's just find from our in-memory array to save DB calls.
                    Promise.resolve(allContacts.find(c => c.jid === chatJid))
                ]);

                if (!includeArchived && chatInfo?.isArchived) {
                    return null;
                }

                // Initial resolution
                let contactName = contactInfo?.name || chatInfo?.contactName;
                let phoneNumber = contactInfo?.phoneNumber || chatInfo?.phoneNumber;

                // Try to find the last incoming message to grab details from
                let lastIncomingMsg = null;

                if (lastMessage && !lastMessage.fromMe) {
                    lastIncomingMsg = lastMessage;
                } else if (!contactName) {
                    lastIncomingMsg = await Message.findOne({
                        userId,
                        chatJid,
                        fromMe: false,
                        isDeleted: false
                    }).sort({ timestamp: -1 });
                }

                if (lastIncomingMsg) {
                    if (lastIncomingMsg.senderName && !contactName) {
                        // Only use senderName if we don't have a better contact name
                        contactName = lastIncomingMsg.senderName;
                    }
                    if (lastIncomingMsg.senderPn && !phoneNumber) {
                        phoneNumber = lastIncomingMsg.senderPn;
                    }
                }

                // FINAL FALLBACK: Check our map
                // If we have a phone number but no name (or name is same as phone), look for ANY contact with this phone
                // containing a real name (e.g. from LID)
                if (phoneNumber && (!contactName || contactName === phoneNumber)) {
                    if (phoneToNameMap[phoneNumber]) {
                        contactName = phoneToNameMap[phoneNumber];
                    }
                }

                // If we still don't have a phone number but the JID itself is a phone JID
                if (!phoneNumber && chatJid.includes('@s.whatsapp.net')) {
                    phoneNumber = chatJid.split('@')[0];
                    // Try map again
                    if ((!contactName || contactName === phoneNumber) && phoneToNameMap[phoneNumber]) {
                        contactName = phoneToNameMap[phoneNumber];
                    }
                }

                return {
                    _id: chatInfo?._id || chatJid, // Fallback to JID if no ID
                    chatJid,
                    lastMessage,
                    unreadCount,
                    isArchived: chatInfo?.isArchived || false,
                    isMuted: chatInfo?.isMuted || false,
                    isPinned: chatInfo?.isPinned || false,
                    aiEnabled: chatInfo?.aiEnabled || false,
                    isGroup: chatInfo?.isGroup || false,
                    phoneNumber: phoneNumber,
                    contactName: contactName
                };
            })
        );

        return chats.filter(chat => chat !== null).sort((a, b) => {
            // Sort by last message timestamp (newest first)
            const timeA = a.lastMessage?.timestamp || 0;
            const timeB = b.lastMessage?.timestamp || 0;
            return timeB - timeA;
        });
    } catch (error) {
        logger.error('Get user chats error:', error);
        throw error;
    }
};

/**
 * Update message status
 * @param {String} messageId - WhatsApp message ID
 * @param {String} userId - User ID
 * @param {String} status - New status
 * @returns {Object} Updated message
 */
export const updateMessageStatus = async (messageId, userId, status) => {
    try {
        const { Message } = await getClientModels(userId);
        const message = await Message.findOneAndUpdate(
            { messageId, userId },
            { status },
            { new: true }
        );

        if (message) {
            logger.info(`Message status updated: ${messageId} -> ${status}`);
        }

        return message;
    } catch (error) {
        logger.error('Update message status error:', error);
        throw error;
    }
};

/**
 * Delete message
 * @param {String} messageId - Message ID (MongoDB)
 * @param {String} userId - User ID
 * @returns {Object} Deleted message
 */
export const deleteMessage = async (messageId, userId) => {
    try {
        const { Message } = await getClientModels(userId);
        const message = await Message.findOneAndUpdate(
            { _id: messageId, userId },
            { isDeleted: true },
            { new: true }
        );

        if (message) {
            logger.info(`Message deleted: ${messageId}`);
        }

        return message;
    } catch (error) {
        logger.error('Delete message error:', error);
        throw error;
    }
};

/**
 * Edit message
 * @param {String} messageId - Message ID (MongoDB)
 * @param {String} userId - User ID
 * @param {String} newText - New text content
 * @returns {Object} Updated message
 */
export const editMessage = async (messageId, userId, newText) => {
    try {
        const { Message } = await getClientModels(userId);
        const message = await Message.findOneAndUpdate(
            { _id: messageId, userId, fromMe: true, type: 'text' },
            { 'content.text': newText },
            { new: true }
        );

        if (message) {
            logger.info(`Message edited: ${messageId}`);
        }

        return message;
    } catch (error) {
        logger.error('Edit message error:', error);
        throw error;
    }
};

/**
 * Add reaction to message
 * @param {String} messageId - Message ID (MongoDB)
 * @param {String} userId - User ID
 * @param {String} emoji - Reaction emoji
 * @param {String} fromJid - User JID who reacted
 * @returns {Object} Updated message
 */
export const addReaction = async (messageId, userId, emoji, fromJid) => {
    try {
        const { Message } = await getClientModels(userId);
        const message = await Message.findOneAndUpdate(
            { _id: messageId, userId },
            {
                $push: {
                    reactions: {
                        emoji,
                        fromJid,
                        timestamp: new Date(),
                    },
                },
            },
            { new: true }
        );

        if (message) {
            logger.info(`Reaction added to message: ${messageId}`);
        }

        return message;
    } catch (error) {
        logger.error('Add reaction error:', error);
        throw error;
    }
};

/**
 * Mark messages as read
 * @param {String} userId - User ID
 * @param {String} chatJid - Chat JID
 */
export const markMessagesAsRead = async (userId, chatJid) => {
    try {
        const { Message, Chat } = await getClientModels(userId);
        await Message.updateMany(
            { userId, chatJid, fromMe: false, status: { $ne: MESSAGE_STATUS.READ } },
            { status: MESSAGE_STATUS.READ }
        );

        // Reset unread count
        await Chat.findOneAndUpdate(
            { userId, chatJid },
            { unreadCount: 0 }
        );

        logger.info(`Messages marked as read for chat: ${chatJid}`);
    } catch (error) {
        logger.error('Mark messages as read error:', error);
        throw error;
    }
};

/**
 * Get unread message count
 * @param {String} userId - User ID
 * @returns {Number} Unread count
 */
export const getUnreadCount = async (userId) => {
    try {
        const { Message } = await getClientModels(userId);
        return await Message.countDocuments({
            userId,
            fromMe: false,
            status: { $ne: MESSAGE_STATUS.READ },
            isDeleted: false,
        });
    } catch (error) {
        logger.error('Get unread count error:', error);
        throw error;
    }
};
