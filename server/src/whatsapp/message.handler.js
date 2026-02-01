import { downloadMediaMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';
import { saveMessage } from '../services/message.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { uploadToMongo } from '../services/mongo.service.js';
import logger from '../utils/logger.util.js';

/**
 * Message handler
 * Processes incoming WhatsApp messages
 */

/**
 * Handle incoming message
 * @param {String} userId - User ID
 * @param {Object} msg - Baileys message object
 * @param {Object} io - Socket.io instance
 */
import Contact from '../models/Contact.js';
import Chat from '../models/Chat.js';
import User from '../models/User.js';
import { generateAIResponse, analyzeSentiment } from '../services/ai.service.js';

/**
 * Handle incoming message
 * @param {String} userId - User ID
 * @param {Object} msg - Baileys message object
 * @param {Object} io - Socket.io instance
 * @param {Function} sendResponse - Function to send response
 */
export const handleIncomingMessage = async (userId, msg, io, sendResponse) => {
    try {
        console.log(`📩 [handleIncomingMessage] User ${userId}: Processing message`, {
            messageId: msg.key.id,
            from: msg.key.remoteJid,
            fromMe: msg.key.fromMe,
            participant: msg.key.participant,
            messageKeys: Object.keys(msg.message || {})
        });

        // --- TEMPORARY DEBUG LOGGING REMOVED ---
        // --------------------------------

        const messageType = Object.keys(msg.message || {})[0];

        // Skip if protocol message or empty
        if (!messageType || messageType === 'protocolMessage' || messageType === 'senderKeyDistributionMessage') {
            console.log(`⏭️  [handleIncomingMessage] User ${userId}: Skipping message type: ${messageType}`);
            return;
        }

        // Determine chat JID - Normalize to avoid duplicates (LID vs Phone)
        const chatJid = jidNormalizedUser(msg.key.remoteJid);
        const fromMe = msg.key.fromMe;

        // Extract message content (now needs userId for media upload)
        const content = await extractMessageContent(msg, messageType, userId);

        // Create message data
        const messageData = {
            userId,
            messageId: msg.key.id,
            chatJid,
            fromMe,
            type: mapMessageType(messageType),
            content,
            timestamp: new Date(msg.messageTimestamp * 1000),
            status: MESSAGE_STATUS.READ, // Incoming messages are auto-read
            senderName: msg.pushName,
            senderPn: msg.key.senderPn ? msg.key.senderPn.split('@')[0] : undefined,
        };

        console.log(`💾 [handleIncomingMessage] User ${userId}: Saving message`, {
            messageId: messageData.messageId,
            chatJid: messageData.chatJid,
            type: messageData.type,
            text: content.text?.substring(0, 50) || 'N/A'
        });

        // --- Update Contact Info ---
        try {
            const pushName = msg.pushName;
            let phoneNumber = chatJid.split('@')[0];

            // Extract real phone number from LID message if available
            if (msg.key.senderPn) {
                phoneNumber = msg.key.senderPn.split('@')[0];
                console.log(`📞 [handleIncomingMessage] Found real phone number for LID: ${phoneNumber}`);
            }

            const updateOps = {
                $set: { phoneNumber },
                $setOnInsert: {}
            };

            if (pushName && !fromMe) {
                updateOps.$set.name = pushName;
            } else {
                updateOps.$setOnInsert.name = phoneNumber;
            }

            // Update Contact
            await Contact.findOneAndUpdate(
                { userId, jid: chatJid },
                updateOps,
                { upsert: true, new: true }
            );

            // Also update Chat with the phone number if it's new information
            const chatUpdateOps = {
                $set: {
                    phoneNumber: phoneNumber
                }
            };

            // Only update contactName if it's from the other person
            if (!fromMe && pushName) {
                chatUpdateOps.$set.contactName = pushName;
            }

            await Chat.findOneAndUpdate(
                { userId, chatJid },
                chatUpdateOps,
                { upsert: true }
            );

        } catch (contactError) {
            console.error('Error updating contact:', contactError);
        }

        // Handle quoted message
        if (msg.message[messageType]?.contextInfo?.quotedMessage) {
            const quotedMsgId = msg.message[messageType].contextInfo.stanzaId;
        }

        // Handle mentions
        if (msg.message[messageType]?.contextInfo?.mentionedJid) {
            messageData.mentions = msg.message[messageType].contextInfo.mentionedJid;
        }

        // Save message to database
        const savedMessage = await saveMessage(messageData);

        console.log(`✅ [handleIncomingMessage] User ${userId}: Message saved successfully:`, savedMessage._id);

        // Emit message to user via socket
        io.to(userId.toString()).emit('message:new', { message: savedMessage });

        logger.info(`Message processed for user ${userId}: ${msg.key.id}`);

        // --- Sentiment Analysis & Chat Update ---
        if (!fromMe && content.text) {
            try {
                const sentiment = await analyzeSentiment(content.text);

                // Fetch user settings for default AI behavior
                const user = await User.findById(userId).select('aiSettings.autoReply');
                const defaultAiEnabled = user?.aiSettings?.autoReply || false;

                // Update Chat with last message and sentiment
                await Chat.findOneAndUpdate(
                    { userId, chatJid },
                    {
                        sentiment,
                        lastMessageAt: new Date(),
                        isGroup: chatJid.endsWith('@g.us'),
                        $setOnInsert: {
                            aiEnabled: defaultAiEnabled
                        }
                    },
                    { upsert: true } // Should already exist from message.service but safe to keep
                );

                // Emit update to refresh chat list sentiment
                // We can emit a specific event or just rely on re-fetching. 
                // Ideally, emitting a chat:update event would be best.
                const updatedChat = await Chat.findOne({ userId, chatJid }).lean();
                // Add virtual fields if needed, but for now sending raw chat update
                io.to(userId.toString()).emit('chat:update', { chat: updatedChat });

            } catch (sentimentError) {
                logger.error('Error in sentiment analysis:', sentimentError);
            }
        }

        // --- AI Auto-Response Logic ---
        if (!fromMe && content.text && sendResponse) {
            try {
                // Check if AI is enabled for this CHAT (not just contact)
                const chat = await Chat.findOne({ userId, chatJid });

                if (chat && chat.aiEnabled) {
                    logger.info(`AI enabled for chat ${chatJid}, generating response...`);

                    // Simulate reading delay based on length (optional but nice)
                    // const delay = Math.min(content.text.length * 50, 2000);
                    // await new Promise(resolve => setTimeout(resolve, delay));

                    // Fetch system prompt from User (implied in service or passed here)
                    const aiResponse = await generateAIResponse(userId, chatJid, content.text);

                    if (aiResponse) {
                        // Send response
                        await sendResponse(chatJid, aiResponse);

                        // Save bot message to database
                        const botMessageData = {
                            userId,
                            messageId: `AI-${Date.now()}`,
                            chatJid,
                            fromMe: true, // It's from "us" (the bot)
                            type: MESSAGE_TYPES.TEXT,
                            content: { text: aiResponse },
                            timestamp: new Date(),
                            status: MESSAGE_STATUS.DELIVERED,
                        };

                        const savedBotMessage = await saveMessage(botMessageData);
                        io.to(userId.toString()).emit('message:new', { message: savedBotMessage });
                        logger.info(`AI response sent to ${chatJid}`);
                    }
                }
            } catch (aiError) {
                logger.error('Error in AI processing:', aiError);
            }
        }

    } catch (error) {
        logger.error('Error handling incoming message:', error);
    }
};

/**
 * Extract message content based on type
 * @param {Object} msg - Baileys message
 * @param {String} messageType - Message type
 * @returns {Object} Content object
 */
async function extractMessageContent(msg, messageType, userId) {
    const content = {};

    try {
        switch (messageType) {
            case 'conversation':
                content.text = msg.message.conversation;
                break;

            case 'extendedTextMessage':
                content.text = msg.message.extendedTextMessage.text;
                break;

            case 'imageMessage':
                content.caption = msg.message.imageMessage.caption || '';
                content.mimeType = msg.message.imageMessage.mimetype;
                try {
                    content.url = await downloadAndUploadMedia(msg, userId);
                } catch (e) {
                    logger.error('Failed to process image:', e);
                }
                break;

            case 'videoMessage':
                content.caption = msg.message.videoMessage.caption || '';
                content.mimeType = msg.message.videoMessage.mimetype;
                try {
                    content.url = await downloadAndUploadMedia(msg, userId);
                } catch (e) {
                    logger.error('Failed to process video:', e);
                }
                break;

            case 'audioMessage':
                content.mimeType = msg.message.audioMessage.mimetype;
                try {
                    content.url = await downloadAndUploadMedia(msg, userId);
                } catch (e) {
                    logger.error('Failed to process audio:', e);
                }
                break;

            case 'documentMessage':
                content.fileName = msg.message.documentMessage.fileName;
                content.mimeType = msg.message.documentMessage.mimetype;
                try {
                    content.url = await downloadAndUploadMedia(msg, userId);
                } catch (e) {
                    logger.error('Failed to process document:', e);
                }
                break;

            case 'stickerMessage':
                content.mimeType = msg.message.stickerMessage.mimetype;
                try {
                    content.url = await downloadAndUploadMedia(msg, userId);
                } catch (e) {
                    logger.error('Failed to process sticker:', e);
                }
                break;

            case 'locationMessage':
                content.latitude = msg.message.locationMessage.degreesLatitude;
                content.longitude = msg.message.locationMessage.degreesLongitude;
                break;

            case 'contactMessage':
                content.contactName = msg.message.contactMessage.displayName;
                content.contactNumber = msg.message.contactMessage.vcard;
                break;

            default:
                content.text = JSON.stringify(msg.message[messageType]);
        }
    } catch (error) {
        logger.error('Error extracting message content:', error);
    }

    return content;
}

/**
 * Map Baileys message type to our message types
 * @param {String} baileysType - Baileys message type
 * @returns {String} Our message type
 */
function mapMessageType(baileysType) {
    const typeMap = {
        'conversation': MESSAGE_TYPES.TEXT,
        'extendedTextMessage': MESSAGE_TYPES.TEXT,
        'imageMessage': MESSAGE_TYPES.IMAGE,
        'videoMessage': MESSAGE_TYPES.VIDEO,
        'audioMessage': MESSAGE_TYPES.AUDIO,
        'documentMessage': MESSAGE_TYPES.DOCUMENT,
        'stickerMessage': MESSAGE_TYPES.STICKER,
        'locationMessage': MESSAGE_TYPES.LOCATION,
        'contactMessage': MESSAGE_TYPES.CONTACT,
    };

    return typeMap[baileysType] || MESSAGE_TYPES.TEXT;
}

/**
 * Download and upload media from message
 * @param {Object} msg - Baileys message
 * @param {String} userId - User ID
 * @returns {String} Cloudinary URL
 */
export const downloadAndUploadMedia = async (msg, userId) => {
    try {
        // Download media buffer
        const buffer = await downloadMediaMessage(msg, 'buffer', {});

        // Determine filename and mime type
        const messageType = Object.keys(msg.message)[0];
        const mimeType = msg.message[messageType].mimetype;
        const fileName = msg.message[messageType].fileName || `media_${Date.now()}`;

        // Check MIME type to decide storage
        if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
            // Upload to Cloudinary
            const media = await uploadToCloudinary(buffer, fileName, mimeType, userId);
            return media.secureUrl;
        } else {
            // Upload to MongoDB GridFS
            const result = await uploadToMongo(buffer, fileName, mimeType);

            // If using relative URL, ensure full path for frontend if needed, 
            // but usually /api/files/ID is fine if frontend prepends host or uses relative
            // For now, return the relative API path
            return result.url;
        }
    } catch (error) {
        logger.error('Error downloading/uploading media:', error);
        throw error;
    }
};
