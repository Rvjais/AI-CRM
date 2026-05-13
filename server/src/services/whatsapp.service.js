import makeWASocket, {
    DisconnectReason,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    getAggregateVotesInPollMessage,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import NodeCache from 'node-cache';
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

        // Group metadata cache (recommended by Baileys for group chats)
        const groupCache = new NodeCache({ stdTTL: 5 * 60, useClones: false });

        // Create socket
        const sock = makeWASocket({
            version,
            logger: socketLogger,
            printQRInTerminal: false,
            auth: state,
            browser: ['Ubuntu', 'Chrome', '20.0.04'],
            retryRequestDelayMs: 250,
            // [FIX] Receive phone notifications when app is open
            markOnlineOnConnect: false,
            // [FIX] Cache group metadata to avoid repeated fetches
            cachedGroupMetadata: async (jid) => groupCache.get(jid),
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

                    // Send Email Alert for Fatal Disconnect
                    try {
                        const { default: UserModel } = await import('../models/User.js');
                        const userRec = await UserModel.findById(userId);
                        if (userRec && userRec.gmailConnected && userRec.googleEmail) {
                            const { sendEmail } = await import('./gmail.service.js');
                            await sendEmail(userId, {
                                to: userRec.googleEmail,
                                subject: '⚠️ Action Required: RainCRM WhatsApp Disconnected',
                                body: `
                                    <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                                        <h2 style="color: #e74c3c;">WhatsApp Connection Lost</h2>
                                        <p>Hello,</p>
                                        <p>Your WhatsApp Bot on <strong>RainCRM</strong> has been forcibly disconnected due to a manual logout from your phone or linked device expiration.</p>
                                        <p style="background: #fff3f3; padding: 10px; border-left: 4px solid #e74c3c;">Your AI Bot, Lead Extraction, and Campaigns will <strong>not</strong> work until you reconnect.</p>
                                        <p>Please log in to your dashboard immediately to re-scan the QR code and restore service.</p>
                                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                                        <p style="font-size: 12px; color: #888;">This is an automated system alert from RainCRM.</p>
                                    </div>
                                `
                            });
                            logger.info(`Fatal disconnect alert email sent to ${userRec.googleEmail}`);
                        }
                    } catch (emailErr) {
                        logger.error('Failed to send disconnect email alert:', emailErr);
                    }

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
                        browser: 'RainCRM (Chrome)',
                        version: '1.0.0',
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
            } else if (type === 'append') {
                // 'append' type = messages appended (e.g. synced messages from phone history)
                for (const msg of messages) {
                    await handleIncomingMessage(userId, msg, io, null, hostNumber);
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

        // Handle message updates (read receipts, delivered, poll votes, edits)
        sock.ev.on('messages.update', async (updates) => {
            for (const update of updates) {
                if (update.update.status !== undefined) {
                    io.to(userId.toString()).emit('message:update', {
                        messageId: update.key.id,
                        status: update.update.status,
                    });
                }
                // Decrypt poll votes
                if (update.update.pollUpdates) {
                    try {
                        const { Message } = await getClientModels(userId);
                        const pollCreation = await Message.findOne({ messageId: update.key.id, userId });
                        if (pollCreation && pollCreation.rawMessage) {
                            const aggregated = getAggregateVotesInPollMessage({
                                message: pollCreation.rawMessage,
                                pollUpdates: update.update.pollUpdates,
                            });
                            io.to(userId.toString()).emit('poll:update', {
                                messageId: update.key.id,
                                votes: aggregated,
                            });
                        }
                    } catch (pollErr) {
                        logger.error('Poll vote decryption error:', pollErr);
                    }
                }
            }
        });

        // ── Group metadata events — keep cache fresh ─────────────────────────
        sock.ev.on('groups.update', async ([event]) => {
            try {
                const metadata = await sock.groupMetadata(event.id);
                groupCache.set(event.id, metadata);
                io.to(userId.toString()).emit('group:update', { groupJid: event.id, metadata });
                // Update DB
                const Group = (await import('../models/Group.js')).default;
                await Group.findOneAndUpdate(
                    { userId, groupJid: event.id },
                    {
                        name: metadata.subject,
                        description: metadata.desc,
                        participants: metadata.participants
                    },
                    { upsert: false }
                );
            } catch (e) { logger.error('groups.update error:', e); }
        });

        sock.ev.on('group-participants.update', async (event) => {
            try {
                const metadata = await sock.groupMetadata(event.id);
                groupCache.set(event.id, metadata);
                io.to(userId.toString()).emit('group:participant_update', {
                    groupJid: event.id,
                    action: event.action,
                    participants: event.participants
                });
            } catch (e) { logger.error('group-participants.update error:', e); }
        });

        // ── Presence updates (typing/online indicators) ──────────────────────
        sock.ev.on('presence.update', ({ id, presences }) => {
            io.to(userId.toString()).emit('presence:update', { jid: id, presences });
        });

        // ── Incoming call event — notify frontend ─────────────────────────────
        sock.ev.on('call', async (calls) => {
            for (const call of calls) {
                if (call.status === 'offer') {
                    console.log(`📞 [call] Incoming call from ${call.from} (id: ${call.id}) for user ${userId}`);
                    io.to(userId.toString()).emit('call:incoming', {
                        callId: call.id,
                        callFrom: call.from,
                        isVideo: call.isVideo
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
    const sock = connections.get(userId.toString());
    return !!(sock && sock.user && sock.authState?.creds?.me);
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

/**
 * Request pairing code for phone-number based login
 * @param {String} userId
 * @param {String} phoneNumber - digits only, with country code, no +
 */
export const requestPairingCode = async (userId, phoneNumber) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp socket not initialized. Call connect first.');
    // Make sure creds are NOT yet registered
    if (sock.authState?.creds?.registered) {
        throw new Error('Already registered/connected. Disconnect first.');
    }
    const code = await sock.requestPairingCode(phoneNumber);
    return code;
};

/**
 * Reject an incoming call
 * @param {String} userId
 * @param {String} callId
 * @param {String} callFrom
 */
export const rejectCall = async (userId, callId, callFrom) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.rejectCall(callId, callFrom);
};

/**
 * Subscribe to presence updates for a JID (enables typing indicators)
 */
export const presenceSubscribe = async (userId, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.presenceSubscribe(jid);
};

/**
 * Send presence update (available, composing, paused, unavailable)
 */
export const sendPresenceUpdate = async (userId, presence, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.sendPresenceUpdate(presence, jid);
};

/**
 * Mark WhatsApp messages as read (sends blue ticks)
 */
export const readMessages = async (userId, keys) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.readMessages(keys);
};

/**
 * Check if phone number exists on WhatsApp
 */
export const checkOnWhatsApp = async (userId, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    const [result] = await sock.onWhatsApp(jid);
    return result;
};

/**
 * Fetch profile picture URL
 */
export const fetchProfilePicture = async (userId, jid, type = 'image') => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    try {
        return await sock.profilePictureUrl(jid, type);
    } catch (e) {
        return null; // Profile pic may be private
    }
};

/**
 * Fetch status text
 */
export const fetchStatus = async (userId, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.fetchStatus(jid);
};

/**
 * Fetch business profile
 */
export const getBusinessProfile = async (userId, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.getBusinessProfile(jid);
};

/**
 * Update own profile status
 */
export const updateProfileStatus = async (userId, status) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateProfileStatus(status);
};

/**
 * Update own profile name
 */
export const updateProfileName = async (userId, name) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateProfileName(name);
};

/**
 * Update profile picture
 */
export const updateProfilePicture = async (userId, jid, imageBuffer) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateProfilePicture(jid, imageBuffer);
};

/**
 * Remove profile picture
 */
export const removeProfilePicture = async (userId, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.removeProfilePicture(jid);
};

/**
 * Block or unblock a user
 */
export const updateBlockStatus = async (userId, jid, action) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateBlockStatus(jid, action); // 'block' | 'unblock'
};

/**
 * Fetch privacy settings
 */
export const fetchPrivacySettings = async (userId) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.fetchPrivacySettings(true);
};

/**
 * Fetch block list
 */
export const fetchBlocklist = async (userId) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.fetchBlocklist();
};

/**
 * Update last-seen privacy
 */
export const updateLastSeenPrivacy = async (userId, value) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateLastSeenPrivacy(value);
};

/**
 * Update online privacy
 */
export const updateOnlinePrivacy = async (userId, value) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateOnlinePrivacy(value);
};

/**
 * Update profile picture privacy
 */
export const updateProfilePicturePrivacy = async (userId, value) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateProfilePicturePrivacy(value);
};

/**
 * Update status privacy
 */
export const updateStatusPrivacy = async (userId, value) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateStatusPrivacy(value);
};

/**
 * Update read receipts privacy
 */
export const updateReadReceiptsPrivacy = async (userId, value) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateReadReceiptsPrivacy(value);
};

/**
 * Update groups-add privacy
 */
export const updateGroupsAddPrivacy = async (userId, value) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateGroupsAddPrivacy(value);
};

/**
 * Update default disappearing mode
 */
export const updateDefaultDisappearingMode = async (userId, ephemeral) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.updateDefaultDisappearingMode(ephemeral);
};

/**
 * chatModify helper — archive, mute, pin, star, delete, markRead
 */
export const chatModify = async (userId, modification, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.chatModify(modification, jid);
};

/**
 * Re-upload expired media message
 */
export const updateMediaMessage = async (userId, msg) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.updateMediaMessage(msg);
};

/**
 * Fetch message history from WhatsApp servers
 */
export const fetchMessageHistory = async (userId, count, oldestMsgKey, oldestMsgTs) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.fetchMessageHistory(count, oldestMsgKey, oldestMsgTs);
};

/**
 * Get broadcast list info
 */
export const getBroadcastListInfo = async (userId, broadcastJid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.getBroadcastListInfo(broadcastJid);
};

/**
 * Update group settings (announce/locked)
 */
export const groupSettingUpdate = async (userId, jid, setting) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.groupSettingUpdate(jid, setting);
};

/**
 * Toggle ephemeral messages in group
 */
export const groupToggleEphemeral = async (userId, jid, ephemeral) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.groupToggleEphemeral(jid, ephemeral);
};

/**
 * Change who can add members to group
 */
export const groupMemberAddMode = async (userId, jid, mode) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.groupMemberAddMode(jid, mode);
};

/**
 * Get list of pending join requests
 */
export const groupRequestParticipantsList = async (userId, jid) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.groupRequestParticipantsList(jid);
};

/**
 * Approve or reject join requests
 */
export const groupRequestParticipantsUpdate = async (userId, jid, participants, action) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.groupRequestParticipantsUpdate(jid, participants, action);
};

/**
 * Get group info by invite code (without joining)
 */
export const groupGetInviteInfo = async (userId, code) => {
    const sock = getConnection(userId);
    if (!sock) throw new Error('WhatsApp not connected');
    return await sock.groupGetInviteInfo(code);
};

export default {
    connectWhatsApp,
    disconnectWhatsApp,
    getConnection,
    isConnected,
    sendMessage,
    sendTextMessage,
    sendMediaMessage,
    getSelfJid,
    requestPairingCode,
    rejectCall,
    presenceSubscribe,
    sendPresenceUpdate,
    readMessages,
    checkOnWhatsApp,
    fetchProfilePicture,
    fetchStatus,
    getBusinessProfile,
    updateProfileStatus,
    updateProfileName,
    updateProfilePicture,
    removeProfilePicture,
    updateBlockStatus,
    fetchPrivacySettings,
    fetchBlocklist,
    updateLastSeenPrivacy,
    updateOnlinePrivacy,
    updateProfilePicturePrivacy,
    updateStatusPrivacy,
    updateReadReceiptsPrivacy,
    updateGroupsAddPrivacy,
    updateDefaultDisappearingMode,
    chatModify,
    updateMediaMessage,
    fetchMessageHistory,
    getBroadcastListInfo,
    groupSettingUpdate,
    groupToggleEphemeral,
    groupMemberAddMode,
    groupRequestParticipantsList,
    groupRequestParticipantsUpdate,
    groupGetInviteInfo,
};
