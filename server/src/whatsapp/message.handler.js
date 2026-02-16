import { downloadMediaMessage, jidNormalizedUser } from '@whiskeysockets/baileys';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';
import { saveMessage } from '../services/message.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { uploadToMongo } from '../services/mongo.service.js';
import logger from '../utils/logger.util.js';
import { getClientModels } from '../utils/database.factory.js';

/**
 * Message handler
 * Process incoming WhatsApp messages
 */

/**
 * Handle incoming message
 * @param {String} userId - User ID
 * @param {Object} msg - Baileys message object
 * @param {Object} io - Socket.io instance
 */
import { generateAIResponse, analyzeMessage } from '../services/ai.service.js';

/**
 * Handle incoming message
 * @param {String} userId - User ID
 * @param {Object} msg - Baileys message object
 * @param {Object} io - Socket.io instance
 * @param {Function} sendResponse - Function to send response
 * @param {String} hostNumber - [FIX] Connected WhatsApp number
 */
export const handleIncomingMessage = async (userId, msg, io, sendResponse, hostNumber) => {
    try {
        // Fetch dynamic models for this user's database, scoped to the connected host number
        const { Contact, Chat, Message } = await getClientModels(userId, hostNumber);


        // --- IDEMPOTENCY CHECK ---
        const existingMessage = await Message.findOne({ messageId: msg.key.id, userId });
        if (existingMessage) {
            console.log(`🔁 [handleIncomingMessage] Duplicate message detected (ID: ${msg.key.id}). Skipping processing.`);
            return;
        }

        // [FIX] Ignore status/broadcast messages
        if (msg.key.remoteJid === 'status@broadcast' || (msg.key.remoteJid && msg.key.remoteJid.includes('broadcast'))) {
            return;
        }

        // Prioritize message types by filtering out metadata keys
        const messageKeys = Object.keys(msg.message || {});
        let messageType = messageKeys.find(key =>
            key !== 'messageContextInfo' &&
            key !== 'deviceListMetadata' &&
            key !== 'senderKeyDistributionMessage'
        );

        // Fallback to first key if everything was filtered (unlikely, but safe)
        if (!messageType) messageType = messageKeys[0];

        // Skip if protocol message or empty or still just metadata
        if (!messageType || messageType === 'protocolMessage') {
            console.log(`⏭️  [handleIncomingMessage] User ${userId}: Skipping message type: ${messageType}`);
            return;
        }

        // Handle Reaction Message specifically
        if (messageType === 'reactionMessage') {
            const reaction = msg.message.reactionMessage;
            const targetKey = reaction.key;
            const emoji = reaction.text;

            console.log(`👍 [handleIncomingMessage] Processing reaction: ${emoji} on message ${targetKey.id}`);

            // Find and update the original message
            // We use findOneAndUpdate to push the reaction

            // Normalize sender JID
            const reactorJid = jidNormalizedUser(msg.key.remoteJid || msg.key.participant);

            // Update the message
            // Note: This logic assumes we append reactions. 
            // Real WhatsApp replaces the user's previous reaction. 
            // For simplicity, we'll try to pull existing reaction from this user first, then push new one.

            if (emoji) {
                // Remove existing reaction from this user if exists
                await Message.updateOne(
                    { messageId: targetKey.id, userId },
                    { $pull: { reactions: { fromJid: reactorJid } } }
                );

                // Add new reaction
                const updatedMsg = await Message.findOneAndUpdate(
                    { messageId: targetKey.id, userId },
                    {
                        $push: {
                            reactions: {
                                emoji,
                                fromJid: reactorJid,
                                timestamp: new Date()
                            }
                        }
                    },
                    { new: true }
                );

                if (updatedMsg) {
                    io.to(userId.toString()).emit('message:update', {
                        messageId: targetKey.id,
                        reactions: updatedMsg.reactions
                    });
                }
            } else {
                // If emoji is empty string, it means "remove reaction"
                const updatedMsg = await Message.findOneAndUpdate(
                    { messageId: targetKey.id, userId },
                    { $pull: { reactions: { fromJid: reactorJid } } },
                    { new: true }
                );
                if (updatedMsg) {
                    io.to(userId.toString()).emit('message:update', {
                        messageId: targetKey.id,
                        reactions: updatedMsg.reactions
                    });
                }
            }

            return; // STOP here, do not save as a new message
        }

        // Determine chat JID - Normalize to avoid duplicates (LID vs Phone)
        let chatJid = jidNormalizedUser(msg.key.remoteJid);
        const fromMe = msg.key.fromMe;

        // NEW: If message is from a LID/Privacy Number, try to resolve to real phone JID
        // This prevents duplicate chats (one for LID, one for Phone)
        if (msg.key.senderPn) {
            const phoneNumber = msg.key.senderPn.split('@')[0];
            const phoneJid = `${phoneNumber}@s.whatsapp.net`;
            console.log(`🔄 [handleIncomingMessage] Normalizing LID ${chatJid} -> Phone JID ${phoneJid}`);
            chatJid = phoneJid;
        } else if (chatJid.includes('@lid')) {
            // Fallback: If no senderPn, check if we already have this LID linked to a phone number in DB
            try {
                const contact = await Contact.findOne({ userId, jid: chatJid });
                if (contact && contact.phoneNumber) {
                    const phoneJid = `${contact.phoneNumber}@s.whatsapp.net`;
                    console.log(`🔄 [handleIncomingMessage] Resolved LID ${chatJid} -> Phone JID ${phoneJid} via DB`);
                    chatJid = phoneJid;
                }
            } catch (e) {
                console.error('Error resolving LID via DB:', e);
            }
        }

        // Extract message content (now needs userId for media upload)
        const content = await extractMessageContent(msg, messageType, userId);

        // Create message data
        const messageData = {
            userId,
            messageId: msg.key.id,
            chatJid, // Now consistently uses phone JID if available
            fromMe,
            type: mapMessageType(messageType),
            content,
            timestamp: new Date(msg.messageTimestamp * 1000),
            status: MESSAGE_STATUS.READ, // Incoming messages are auto-read
            senderName: msg.pushName,
            senderPn: msg.key.senderPn ? msg.key.senderPn.split('@')[0] : undefined,
            participant: msg.key.participant, // Save participant JID for generic quoting support
            hostNumber: hostNumber, // [FIX] Save host number
            rawMessage: msg.message // Save raw message for getMessage/retries
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

            // Update Contact using dynamic model
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

            // [FIX] Link LID to Phone Number in Contact DB
            // If the incoming message has a senderPn, it means the source was a LID.
            // We should update the Contact record for the *original* LID JID with this phone number.
            if (msg.key.senderPn) {
                const lidJid = jidNormalizedUser(msg.key.remoteJid); // The LID
                if (lidJid !== chatJid) { // explicit check, though specific logic above ensures they are diff
                    console.log(`🔗 [handleIncomingMessage] Linking LID ${lidJid} to Phone ${phoneNumber}`);
                    await Contact.findOneAndUpdate(
                        { userId, jid: lidJid },
                        { $set: { phoneNumber: phoneNumber } },
                        { upsert: true, new: true }
                    );
                }
            }

        } catch (contactError) {
            console.error('Error updating contact:', contactError);
        }

        // Handle quoted message
        const contextInfo = msg.message[messageType]?.contextInfo;
        if (contextInfo?.quotedMessage) {
            const quotedStanzaId = contextInfo.stanzaId;

            if (quotedStanzaId) {
                // Determine Original Message using dynamic Message model
                const originalMsg = await Message.findOne({ messageId: quotedStanzaId, userId });

                if (originalMsg) {
                    messageData.quotedMessage = originalMsg._id;
                }
            }
        }

        // Handle mentions
        if (msg.message[messageType]?.contextInfo?.mentionedJid) {
            messageData.mentions = msg.message[messageType].contextInfo.mentionedJid;
        }

        // Save message to database (Service handles dynamic save if updated)
        // Wait, saveMessage service also needs to be dynamic. We updated it.
        const savedMessage = await saveMessage(messageData);

        console.log(`✅ [handleIncomingMessage] User ${userId}: Message saved successfully:`, savedMessage._id);

        // Emit message to user via socket
        io.to(userId.toString()).emit('message:new', { message: savedMessage });

        logger.info(`Message processed for user ${userId}: ${msg.key.id}`);

        // --- AI Analysis (Sentiment, Summary, etc.) ---
        // Verify we have text to analyze or it's a media message
        if (!fromMe && (content.text || messageData.type !== MESSAGE_TYPES.TEXT)) {
            try {
                const analysisText = content.text || (content.caption ? `${content.caption} [Media]` : '[Media Message]');
                const analysisResult = await analyzeMessage(userId, chatJid, analysisText);

                if (analysisResult) {
                    console.log(`🧠 [handleIncomingMessage] AI Analysis: Sentiment=${analysisResult.sentiment}`);

                    // Update Chat with analysis results
                    await Chat.findOneAndUpdate(
                        { userId, chatJid },
                        {
                            sentiment: analysisResult.sentiment,
                            summary: analysisResult.summary || undefined,
                            suggestions: analysisResult.suggestions || [],
                            extractedData: analysisResult.extractedData || {},
                            lastSummaryAt: new Date()
                        }
                    );
                }
            } catch (analysisError) {
                logger.error('Error in AI analysis:', analysisError);
            }
        }

        // --- AI Auto-Response Logic ---
        if (!fromMe && content.text && sendResponse) {
            try {
                // Check if AI is enabled for this CHAT (not just contact)
                const chat = await Chat.findOne({ userId, chatJid });

                if (chat && chat.aiEnabled) {
                    // [FEATURE FLAG CHECK]
                    const user = await ((await import('../models/User.js')).default).findById(userId);
                    if (user && user.featureFlags && user.featureFlags.aiBot === false) {
                        logger.info(`AI Bot disabled globally for user ${userId}. Skipping response.`);
                        return;
                    }

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
                            hostNumber: hostNumber // [FIX] Start saving to correct collection
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
        // [FIX] Handle View Once messages - Do not display, show placeholder
        if (messageType === 'viewOnceMessage' || messageType === 'viewOnceMessageV2') {
            content.text = "Can't view this message here because of safety reason please view it in your mobile phone";
            content.isViewOnce = true;
            return content;
        }

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

            case 'reactionMessage':
                const reaction = msg.message.reactionMessage;
                // We'll handle this in the main handler logic before saving
                content.reaction = {
                    key: reaction.key,
                    text: reaction.text, // emoji
                    senderTimestampMs: reaction.senderTimestampMs
                };
                break;

            // Handle Interactive/Button Messages nicely
            case 'buttonsMessage':
                content.text = msg.message.buttonsMessage.contentText ||
                    msg.message.buttonsMessage.caption ||
                    '[Buttons Message]';
                break;

            case 'templateMessage':
                content.text = msg.message.templateMessage.hydratedTemplate?.hydratedContentText ||
                    msg.message.templateMessage.hydratedTemplate?.hydratedTitleText ||
                    '[Template Message]';
                break;

            case 'interactiveMessage':
                const interactive = msg.message.interactiveMessage;
                content.text = interactive.body?.text || '[Interactive Message]';
                // You could also extract footer/header if needed
                break;

            case 'listMessage':
                content.text = msg.message.listMessage.description ||
                    msg.message.listMessage.title ||
                    '[List Message]';
                break;

            default:
                // Better fallback: Check for common text fields before stringifying
                if (msg.message[messageType]?.caption) {
                    content.text = msg.message[messageType].caption;
                } else if (msg.message[messageType]?.text) {
                    content.text = msg.message[messageType].text;
                } else {
                    content.text = JSON.stringify(msg.message[messageType]);
                }
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
        // Baileys downloadMediaMessage expects the full message object. 
        // If we unwrapped a ViewOnce message, we modified msg.message.
        // This is fine as long as msg structure is valid.
        const buffer = await downloadMediaMessage(msg, 'buffer', {});

        // Determine filename and mime type
        // Use the current messageType from the (potentially modified) msg object
        const messageType = Object.keys(msg.message)[0];
        const mediaMsg = msg.message[messageType];

        const mimeType = mediaMsg.mimetype;
        const fileName = mediaMsg.fileName || `media_${Date.now()}`;

        // Check MIME type to decide storage
        if (mimeType.startsWith('image/') || mimeType.startsWith('video/')) {
            // Upload to Cloudinary
            const media = await uploadToCloudinary(buffer, fileName, mimeType, userId);
            return media.secureUrl;
        } else {
            // Upload to MongoDB GridFS
            const result = await uploadToMongo(buffer, fileName, mimeType);
            return result.url;
        }
    } catch (error) {
        logger.error('Error downloading/uploading media:', error);
        throw error;
    }
};
