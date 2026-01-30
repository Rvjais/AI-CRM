import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';
import { saveMessage } from '../services/message.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
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
import { generateAIResponse } from '../services/ai.service.js';

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
            messageKeys: Object.keys(msg.message || {})
        });

        const messageType = Object.keys(msg.message || {})[0];

        // Skip if protocol message or empty
        if (!messageType || messageType === 'protocolMessage' || messageType === 'senderKeyDistributionMessage') {
            console.log(`⏭️  [handleIncomingMessage] User ${userId}: Skipping message type: ${messageType}`);
            return;
        }

        // Extract message content
        const content = await extractMessageContent(msg, messageType);

        // Determine chat JID
        const chatJid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;

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
            const phoneNumber = chatJid.split('@')[0];

            // Only update name if it's not from me (or if it is from me and I'm chatting with myself/unknown)
            // But typically pushName on a message is the SENDER's name.
            // If !fromMe, sender is the contact. pushName is contact's name.
            if (!fromMe && pushName) {
                await Contact.findOneAndUpdate(
                    { userId, jid: chatJid },
                    {
                        name: pushName,
                        phoneNumber: phoneNumber
                    },
                    { upsert: true, new: true }
                );
                console.log(`👤 [handleIncomingMessage] Updated contact info for ${chatJid}: ${pushName}`);
            }
            // Ensure Contact exists even if no pushName (init with number)
            else {
                await Contact.findOneAndUpdate(
                    { userId, jid: chatJid },
                    {
                        $setOnInsert: { name: phoneNumber }, // Default name to number if new
                        phoneNumber: phoneNumber
                    },
                    { upsert: true, new: true }
                );
            }
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

        // --- AI Auto-Response Logic ---
        if (!fromMe && content.text && sendResponse) {
            try {
                // Check if AI is enabled for this contact
                const contact = await Contact.findOne({ userId, jid: chatJid });

                if (contact && contact.aiEnabled) {
                    logger.info(`AI enabled for contact ${chatJid}, generating response...`);

                    // Fetch system prompt from User (implied in service or passed here)
                    // We'll let the service fetch the config using userId
                    const aiResponse = await generateAIResponse(userId, content.text);

                    if (aiResponse) {
                        // Send response
                        await sendResponse(chatJid, aiResponse);

                        // Save bot message to database
                        const botMessageData = {
                            userId,
                            messageId: `AI-${Date.now()}`, // Generate proper ID or let Baileys handle it if we used sock.sendMessage result
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
async function extractMessageContent(msg, messageType) {
    const content = {};

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
            // Media will be downloaded when requested
            break;

        case 'videoMessage':
            content.caption = msg.message.videoMessage.caption || '';
            content.mimeType = msg.message.videoMessage.mimetype;
            break;

        case 'audioMessage':
            content.mimeType = msg.message.audioMessage.mimetype;
            break;

        case 'documentMessage':
            content.fileName = msg.message.documentMessage.fileName;
            content.mimeType = msg.message.documentMessage.mimetype;
            break;

        case 'stickerMessage':
            content.mimeType = msg.message.stickerMessage.mimetype;
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

        // Upload to Cloudinary
        const media = await uploadToCloudinary(buffer, fileName, mimeType, userId);

        return media.secureUrl;
    } catch (error) {
        logger.error('Error downloading/uploading media:', error);
        throw error;
    }
};
