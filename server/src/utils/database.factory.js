import mongoose from 'mongoose';
import logger from './logger.util.js';

import User from '../models/User.js';
import messageSchema from '../schemas/Message.schema.js';
import chatSchema from '../schemas/Chat.schema.js';
import contactSchema from '../schemas/Contact.schema.js';
import whatsappSessionSchema from '../schemas/WhatsAppSession.schema.js';

// Cache for active connections: Map<userId, mongoose.Connection>
const connectionCache = new Map();

/**
 * Get or create a database connection for a specific user
 * @param {Object} user - User document
 * @returns {Promise<mongoose.Connection>}
 */
export const getClientDB = async (user) => {
    try {
        if (!user || (!user._id && !user.id)) throw new Error('Invalid user object');

        const userId = (user._id || user.id).toString();

        // 1. Check Cache
        if (connectionCache.has(userId)) {
            const conn = connectionCache.get(userId);
            if (conn.readyState === 1 || conn.readyState === 2) {
                return conn;
            }
            connectionCache.delete(userId);
        }

        // 2. Validate Infrastructure
        // Ensure mongoURI is present.
        if (!user.mongoURI) {
            throw new Error('User has no Database URI configured');
        }

        // 3. Create New Connection
        // logger.info(`Opening new DB connection for user ${userId}`);

        const conn = mongoose.createConnection(user.mongoURI, {
            serverSelectionTimeoutMS: 5000,
            maxPoolSize: 10
        });

        // 4. Handle Connection Events
        conn.on('connected', () => { /* logger.info(`DB Connected for user ${userId}`) */ });
        conn.on('error', (err) => logger.error(`DB Error for user ${userId}:`, err));
        conn.on('disconnected', () => {
            connectionCache.delete(userId);
        });

        // 5. Store in Cache
        connectionCache.set(userId, conn);

        return conn;

    } catch (error) {
        logger.error('Database Factory Error:', error);
        throw error;
    }
};

/**
 * Get a Model from the Client DB
 * @param {Object} user 
 * @param {String} modelName 
 * @param {Schema} schema 
 */
export const getClientModel = async (user, modelName, schema) => {
    const conn = await getClientDB(user);
    return conn.model(modelName, schema);
};

/**
 * Helper to get all core models for a user
 * @param {String} userId 
 */
export const getClientModels = async (userId) => {
    // In Single-DB Architecture, we reuse the static models.
    // We keep this function signature for backward compatibility with controllers
    // that expect { Message, Chat, ... } to be returned.

    const Message = (await import('../models/Message.js')).default;
    const Chat = (await import('../models/Chat.js')).default;
    const Contact = (await import('../models/Contact.js')).default;
    const WhatsAppSession = (await import('../models/WhatsAppSession.js')).default;
    const User = (await import('../models/User.js')).default;

    const user = await User.findById(userId);

    return { Message, Chat, Contact, WhatsAppSession, user };
};
