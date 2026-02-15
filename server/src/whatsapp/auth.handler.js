import { proto, initAuthCreds } from '@whiskeysockets/baileys';
import { encryptObject, decryptObject } from '../utils/encryption.util.js';
import logger from '../utils/logger.util.js';
import { getClientModels } from '../utils/database.factory.js';

/**
 * Auth state handler
 * Manages encrypted storage of WhatsApp authentication state in MongoDB
 */

/**
 * Load auth state from database
 * @param {String} userId - User ID
 * @returns {Object} Auth state and save function
 */
export const loadAuthState = async (userId) => {
    let creds;
    let keys = {};
    let WhatsAppSession;

    try {
        // Load session from database
        const models = await getClientModels(userId);
        WhatsAppSession = models.WhatsAppSession;

        const session = await WhatsAppSession.findOne({ userId }).select('+sessionData');

        if (session && session.sessionData) {
            // Decrypt session data
            const decrypted = decryptObject(session.sessionData);
            creds = decrypted.creds;
            keys = decrypted.keys || {};
            logger.info(`✅ [Auth] Auth state loaded for user ${userId}. Keys present: ${Object.keys(keys).length}`);
        } else {
            // Initialize with fresh credentials using Baileys function
            if (session) {
                logger.warn(`⚠️ [Auth] Session exists for ${userId} but has NO sessionData. Creating fresh.`);
            } else {
                logger.info(`ℹ️ [Auth] No WhatsAppSession document found for user ${userId}. Creating new session.`);
            }
            creds = initAuthCreds();
        }
    } catch (error) {
        logger.error(`Error loading auth state for user ${userId}:`, error);
        // Initialize with fresh credentials on error
        creds = initAuthCreds();
    }

    /**
     * Save credentials to database
     */
    const saveCreds = async () => {
        console.log(`[Auth] saveCreds called for user ${userId}`);
        try {
            if (!WhatsAppSession) {
                // Try to get model again if it wasn't available during load
                // (e.g. if DB connection failed earlier but is now fine? Unlikely but safe)
                const models = await getClientModels(userId);
                WhatsAppSession = models.WhatsAppSession;
            }

            const sessionData = {
                creds,
                keys,
            };

            // Encrypt session data
            const encrypted = encryptObject(sessionData);

            logger.info(`💾 [Auth] Saving auth state for user ${userId}. Data size: ${JSON.stringify(encrypted).length} bytes`);

            // Save to database
            await WhatsAppSession.findOneAndUpdate(
                { userId },
                { sessionData: encrypted },
                { upsert: true }
            );

            logger.info(`✅ [Auth] Auth state saved successfully for user ${userId}`);
        } catch (error) {
            logger.error(`❌ [Auth] Error saving auth state for user ${userId}:`, error);
        }
    };

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const key = `${type}:${id}`;
                        if (keys[key]) {
                            data[id] = keys[key];
                        }
                    }
                    return data;
                },
                set: async (data) => {
                    for (const category in data) {
                        for (const id in data[category]) {
                            const key = `${category}:${id}`;
                            const value = data[category][id];
                            if (value) {
                                keys[key] = value;
                            } else {
                                delete keys[key];
                            }
                        }
                    }
                    // Update creds from the set data if it contains creds
                    if (data.creds) {
                        creds = data.creds;
                    }
                    await saveCreds();
                },
            },
        },
        saveCreds,
    };
};

/**
 * Clear auth state from database
 * @param {String} userId - User ID
 */
export const clearAuthState = async (userId) => {
    try {
        const { WhatsAppSession } = await getClientModels(userId);

        await WhatsAppSession.findOneAndUpdate(
            { userId },
            { sessionData: null, qrCode: null, pairingCode: null }
        );
        logger.info(`Auth state cleared for user ${userId}`);
    } catch (error) {
        logger.error(`Error clearing auth state for user ${userId}:`, error);
    }
};

