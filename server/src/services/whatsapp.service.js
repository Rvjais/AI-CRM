import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import User from '../models/User.js';
import { CONNECTION_STATUS } from '../config/constants.js';
import { encryptObject, decryptObject } from '../utils/encryption.util.js';
import logger from '../utils/logger.util.js';
import { loadAuthState } from '../whatsapp/auth.handler.js';
import { handleIncomingMessage } from '../whatsapp/message.handler.js';
import { getClientModels } from '../utils/database.factory.js';

/**
 * WhatsApp service - Baileys integration
 * Manages WhatsApp connections for multiple users
 */

// Store active connections: Map<userId, socket>
const connections = new Map();

/**
 * Initialize WhatsApp connection for a user
 * @param {String} userId - User ID
 * @param {Object} io - Socket.io instance
 * @returns {Object} Connection result
 */
export const connectWhatsApp = async (userId, io) => {
    try {
        // Check if already connected
        if (connections.has(userId.toString())) {
            logger.info(`User ${userId} already has an active connection`);
            return { status: 'already_connected' };
        }

        // Get latest Baileys version
        const { version } = await fetchLatestBaileysVersion();

        // Load auth state from database (now handles dynamic DB)
        const { state, saveCreds } = await loadAuthState(userId);

        // Create logger
        const socketLogger = pino({ level: 'silent' }); // Set to 'debug' for detailed logs
        console.log(`🔌 [connectWhatsApp] Initializing socket for user ${userId}...`);

        // Import contact handler dynamically
        const { handleContactsUpsert, handleContactsUpdate } = await import('../whatsapp/contact.handler.js');

        // Create socket
        const sock = makeWASocket({
            version,
            logger: socketLogger,
            printQRInTerminal: false,
            auth: state,
            browser: ['Chrome (Linux)', '', ''],
            retryRequestDelayMs: 250, // Enable retries
            getMessage: async (key) => {
                try {
                    // [FIX] Implement getMessage for retries/decryption
                    const { Message } = await getClientModels(userId);
                    const msg = await Message.findOne({ messageId: key.id }).select('+rawMessage');

                    if (msg && msg.rawMessage) {
                        return msg.rawMessage;
                    }

                    if (msg && msg.content) {
                        // Fallback reconstruction
                        console.log(`⚠️ [getMessage] rawMessage missing for ${key.id}, using fallback reconstruction.`);
                        // Reconstruct Baileys message object from our DB schema
                        // This is a simplified reconstruction, usually enough for session validation
                        const content = {};
                        if (msg.type === 'text') {
                            content.conversation = msg.content.text;
                        } else if (msg.type === 'image') {
                            content.imageMessage = {
                                url: msg.content.url,
                                caption: msg.content.caption
                            };
                        }
                        return { conversation: msg.content.text }; // Fallback minimal
                    }
                    return undefined;
                } catch (e) {
                    console.error('Error in getMessage:', e);
                    return undefined;
                }
            },
        });

        // Store connection
        connections.set(userId.toString(), sock);

        // Handle connection updates
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Update session status
            await updateSessionStatus(userId, CONNECTION_STATUS.CONNECTING);

            // QR code received
            if (qr) {
                logger.info(`QR code generated for user ${userId}`);
                const qrCodeUrl = await updateSessionQR(userId, qr);

                // Emit QR to user via socket
                io.to(userId.toString()).emit('whatsapp:qr', { qrCode: qrCodeUrl });
            }

            // Connection state changed
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;

                logger.info(`Connection closed for user ${userId}, reconnect: ${shouldReconnect}`);

                // Always remove from active connections on close to allow reconnection
                connections.delete(userId.toString());

                if (shouldReconnect) {
                    // Reconnect
                    setTimeout(() => connectWhatsApp(userId, io), 3000);
                } else {
                    // Logged out
                    logger.info(`User ${userId} logged out. Clearing auth state...`);

                    // Clear auth state from disk/DB
                    const { clearAuthState } = await import('../whatsapp/auth.handler.js');
                    await clearAuthState(userId);

                    await updateSessionStatus(userId, CONNECTION_STATUS.DISCONNECTED);
                    await updateUserWhatsAppStatus(userId, false);

                    io.to(userId.toString()).emit('whatsapp:disconnected', {
                        reason: 'Logged out'
                    });
                }
            } else if (connection === 'open') {
                logger.info(`Connection opened for user ${userId}`);
                console.log(`✅ [WhatsApp] Connection OPEN for user ${userId} - Ready to receive messages!`);

                const phoneNumber = sock.user.id.split(':')[0];

                await updateSessionStatus(userId, CONNECTION_STATUS.CONNECTED, phoneNumber);
                await updateUserWhatsAppStatus(userId, true);

                io.to(userId.toString()).emit('whatsapp:connected', {
                    phoneNumber,
                    deviceInfo: {
                        browser: 'Chrome (Linux)',
                        version: '',
                    },
                });
            }
        });

        // Handle credential updates
        sock.ev.on('creds.update', saveCreds);

        // Handle incoming messages
        console.log(`👂 [connectWhatsApp] Attaching 'messages.upsert' listener for user ${userId}`);
        sock.ev.on('messages.upsert', async ({ messages, type }) => {
            console.log(`🔔 [messages.upsert] Event triggered! Type: ${type}, Messages:`, messages.length);
            if (type === 'notify') {
                for (const msg of messages) {
                    console.log(`📨 [messages.upsert] Processing message (FULL_LOG):`, JSON.stringify(msg, null, 2));

                    const sendResponse = async (jid, text) => {
                        await sock.sendMessage(jid, { text });
                    };

                    // [FIX] Robust way to get host number
                    let hostNumber = sock.user?.id?.split(':')[0];

                    if (!hostNumber && sock.authState?.creds?.me?.id) {
                        hostNumber = sock.authState.creds.me.id.split(':')[0];
                        console.log(`⚠️ [messages.upsert] sock.user missing, recovered hostNumber ${hostNumber} from authState`);
                    }

                    if (!hostNumber) {
                        console.error('❌ [messages.upsert] CRITICAL: Could not determine hostNumber from socket state. Fetching from DB as fallback...');
                        // Fallback: Fetch from DB Session
                        try {
                            const { WhatsAppSession } = await getClientModels(userId);
                            const session = await WhatsAppSession.findOne({ userId });
                            if (session && session.phoneNumber) {
                                hostNumber = session.phoneNumber;
                                console.log(`✅ [messages.upsert] Recovered hostNumber ${hostNumber} from DB Session`);
                            }
                        } catch (err) {
                            console.error('❌ [messages.upsert] DB Fallback failed:', err);
                        }
                    }

                    if (hostNumber) {
                        // console.log(`[messages.upsert] Using hostNumber: ${hostNumber}`);
                    } else {
                        console.error('❌ [messages.upsert] FAILED to determine hostNumber. Message will save to default collection (User might not see it).');
                    }

                    await handleIncomingMessage(userId, msg, io, sendResponse, hostNumber);
                }
            } else {
                console.log(`⏭️  [messages.upsert] Skipping type: ${type}`);
            }
        });

        console.log(`✅ [WhatsApp] Event listener 'messages.upsert' attached for user ${userId}`);

        // Handle contacts updates
        sock.ev.on('contacts.upsert', async (contacts) => {
            console.log(`👤 [contacts.upsert] Syncing ${contacts.length} contacts for user ${userId}`);
            await handleContactsUpsert(userId, contacts);
        });

        sock.ev.on('contacts.update', async (updates) => {
            console.log(`👤 [contacts.update] Updating ${updates.length} contacts for user ${userId}`);
            await handleContactsUpdate(userId, updates);
        });

        // Handle message updates (read, delivered, etc.)
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update.status) {
                    io.to(userId.toString()).emit('message:update', {
                        messageId: update.key.id,
                        status: update.update.status,
                    });
                }
            }
        });

        logger.info(`WhatsApp connection initiated for user ${userId}`);

        return { status: 'connecting' };
    } catch (error) {
        logger.error(`WhatsApp connection error for user ${userId}:`, error);
        await updateSessionStatus(userId, CONNECTION_STATUS.DISCONNECTED);
        throw error;
    }
};

/**
 * Disconnect WhatsApp for a user
 * @param {String} userId - User ID
 */
export const disconnectWhatsApp = async (userId) => {
    try {
        const sock = connections.get(userId.toString());

        if (sock) {
            try {
                await sock.logout();
            } catch (logoutError) {
                logger.warn(`Logout failed for user ${userId} (ignoring):`, logoutError.message);
            }

            // Clean up connection map regardless of logout success
            connections.delete(userId.toString());
        }

        // Always ensure DB state is cleared
        // Import dynamically to avoid circular dependency if needed, or better, ensure clean imports
        // For now, we use the method from auth.handler
        const { clearAuthState } = await import('../whatsapp/auth.handler.js');
        await clearAuthState(userId);

        await updateSessionStatus(userId, CONNECTION_STATUS.DISCONNECTED);
        await updateUserWhatsAppStatus(userId, false);

        logger.info(`WhatsApp disconnected/cleaned up for user ${userId}`);
    } catch (error) {
        logger.error(`Disconnect cleanup error for user ${userId}:`, error);
        // Even if DB update fails, we tried our best. 
        // Throwing here might be okay if DB is down, but generally we want to allow retry.
        throw error;
    }
};

/**
 * Get connection for user
 * @param {String} userId - User ID
 * @returns {Object} Socket connection
 */
export const getConnection = (userId) => {
    return connections.get(userId.toString());
};

/**
 * Check if user is connected
 * @param {String} userId - User ID
 * @returns {Boolean} Is connected
 */
export const isConnected = (userId) => {
    return connections.has(userId.toString());
};

/**
 * Send text message
 * @param {String} userId - User ID
 * @param {String} jid - Recipient JID
 * @param {String} text - Message text
 * @returns {Object} Sent message
 */
/**
 * Send generic message (mimics Baileys sendMessage)
 * @param {String} userId - User ID
 * @param {String} jid - Recipient JID
 * @param {Object} content - Baileys content object
 * @param {Object} options - Baileys options object
 * @returns {Object} Sent message
 */
export const sendMessage = async (userId, jid, content, options = {}) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');

    const result = await sock.sendMessage(jid, content, options);

    // Persist to Database
    try {
        // [FIX] Robust way to get host number
        let senderPn = sock.user?.id?.split(':')[0];

        if (!senderPn && sock.authState?.creds?.me?.id) {
            senderPn = sock.authState.creds.me.id.split(':')[0];
            console.log(`⚠️ [sendMessage] sock.user missing, recovered senderPn ${senderPn} from authState`);
        }

        if (!senderPn) {
            // Fallback: Fetch from DB Session
            try {
                const { WhatsAppSession } = await getClientModels(userId);
                const session = await WhatsAppSession.findOne({ userId });
                if (session && session.phoneNumber) {
                    senderPn = session.phoneNumber;
                    console.log(`✅ [sendMessage] Recovered senderPn ${senderPn} from DB Session`);
                }
            } catch (err) {
                console.error('❌ [sendMessage] DB Fallback failed:', err);
            }
        }

        if (!senderPn) {
            console.error('❌ [sendMessage] FAILED to determine senderPn. Message saving might fail or save to wrong collection.');
        }

        const { Message, Chat } = await getClientModels(userId, senderPn);

        const messageType = Object.keys(content)[0]; // e.g., 'text' or 'image'
        const textContent = content.text || content.caption || '';

        // Map content to schema format
        const msgData = {
            userId,
            messageId: result.key.id,
            chatJid: jid,
            fromMe: true,
            type: messageType === 'text' ? 'text' : (messageType === 'image' ? 'image' : 'unknown'), // Simplified mapping
            content: {
                text: textContent
            },
            status: 'sent',
            timestamp: new Date(),
            senderPn: senderPn,
            hostNumber: senderPn // [FIX] Add hostNumber
        };

        if (content.image) {
            msgData.type = 'image';
            msgData.content.url = content.image.url;
            msgData.content.caption = content.caption;
        }

        console.log('💾 [sendMessage] Saving Message:', JSON.stringify(msgData, null, 2));

        await Message.create(msgData);

        // Update Chat
        const updateOps = {
            $set: {
                lastMessage: {
                    content: textContent,
                    timestamp: new Date(),
                    type: msgData.type,
                    fromMe: true
                },
                timestamp: new Date()
            },
            $setOnInsert: {
                category: options.isCampaign ? 'campaign' : 'normal'
            }
        };

        if (options.isCampaign) {
            // Logic handled by $setOnInsert above.
        } else {
            // Normal message. If chat doesn't exist, it defaults to normal.
        }

        await Chat.findOneAndUpdate(
            { userId, chatJid: jid },
            updateOps,
            { upsert: true }
        );

    } catch (saveError) {
        logger.error(`Failed to save sent message for user ${userId}:`, saveError);
        // Don't throw, as the message was actually sent
    }

    return result;
};

/**
 * Send text message (Wrapper for backward compatibility)
 * @param {String} userId - User ID
 * @param {String} jid - Recipient JID
 * @param {String} text - Message text
 * @param {Object} options - Extra options (isCampaign, etc.)
 * @returns {Object} Sent message
 */
export const sendTextMessage = async (userId, jid, text, options = {}) => {
    return sendMessage(userId, jid, { text }, options);
};

/**
 * Send media message (Wrapper for backward compatibility)
 * @param {String} userId - User ID
 * @param {String} jid - Recipient JID
 * @param {Object} mediaData - Media data
 * @returns {Object} Sent message
 */
export const sendMediaMessage = async (userId, jid, mediaData) => {
    const { url, caption, type } = mediaData;
    const message = {
        [type]: { url },
        caption,
    };
    return sendMessage(userId, jid, message);
};

/**
 * Get the JID of the connected user (the bot itself)
 * @param {String} userId 
 * @returns {String|null} jid or null if not connected
 */
export const getSelfJid = (userId) => {
    const sock = getConnection(userId);
    if (!sock || !sock.user) return null;
    return sock.user.id;
};

// Helper functions

async function updateSessionStatus(userId, status, phoneNumber = null) {
    try {
        const { WhatsAppSession } = await getClientModels(userId);

        // If we are setting status to CONNECTING, check if it's already QR_READY
        // We don't want to overwrite QR_READY with CONNECTING as it hides the QR code from frontend
        if (status === CONNECTION_STATUS.CONNECTING) {
            const currentSession = await WhatsAppSession.findOne({ userId });
            if (currentSession?.status === CONNECTION_STATUS.QR_READY) {
                return; // Skip update to preserve QR_READY state
            }
        }

        const update = { status };
        if (status === CONNECTION_STATUS.CONNECTED) {
            update.lastConnected = new Date();
            if (phoneNumber) update.phoneNumber = phoneNumber;

            // Clear QR code when connected
            update.qrCode = null;
        }

        await WhatsAppSession.findOneAndUpdate(
            { userId },
            update,
            { upsert: true }
        );
    } catch (error) {
        logger.error(`Error updating session status for user ${userId}:`, error);
    }
}

async function updateSessionQR(userId, qrText) {
    try {
        const { WhatsAppSession } = await getClientModels(userId);

        // Import QR handler dynamically to avoid circular dependency
        const { generateQRCode } = await import('../whatsapp/qr.handler.js');

        // Convert QR text to data URL
        const qrCodeDataURL = await generateQRCode(qrText);

        await WhatsAppSession.findOneAndUpdate(
            { userId },
            { qrCode: qrCodeDataURL, status: CONNECTION_STATUS.QR_READY },
            { upsert: true }
        );

        return qrCodeDataURL;
    } catch (error) {
        logger.error(`Error updating session QR for user ${userId}:`, error);
        return null;
    }
}


async function updateUserWhatsAppStatus(userId, connected) {
    await User.findByIdAndUpdate(userId, { whatsappConnected: connected });
}

export default {
    connectWhatsApp,
    disconnectWhatsApp,
    getConnection,
    isConnected,
    sendMessage,
    sendTextMessage,
    sendMediaMessage,
    getSelfJid,
};
