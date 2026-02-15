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
 * Get a Model from the Client DB with Dynamic Collection Name
 * @param {Object} user 
 * @param {String} modelName - e.g., 'Message'
 * @param {Schema} schema 
 * @param {String} [phoneNumber] - Connected WhatsApp phone number
 */
export const getClientModel = async (user, modelName, schema, phoneNumber) => {
    const conn = await getClientDB(user);

    let collectionName = modelName;
    if (phoneNumber) {
        // Strict Isolation: Append phone number to model/collection name
        // e.g., Message -> Message_919876543210
        collectionName = `${modelName}_${phoneNumber}`;
    }

    return conn.model(collectionName, schema);
};

/**
 * Helper to get all core models for a user, optionally scoped to a phone number
 * @param {String} userId 
 * @param {String} [phoneNumber] - Scopes data to this phone number
 */
export const getClientModels = async (userId, phoneNumber) => {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId).select('+mongoURI'); // Need mongoURI to connect

    if (!user) throw new Error('User not found');

    // Import Schemas
    const messageSchema = (await import('../schemas/Message.schema.js')).default;
    const chatSchema = (await import('../schemas/Chat.schema.js')).default;
    const contactSchema = (await import('../schemas/Contact.schema.js')).default;
    const groupSchema = (await import('../models/Group.js')).default.schema; // Group export might be model, get schema
    const mediaSchema = (await import('../models/Media.js')).default.schema;
    const campaignSchema = (await import('../schemas/Campaign.schema.js')).default;
    const campaignJobSchema = (await import('../schemas/CampaignJob.schema.js')).default;
    const whatsappSessionSchema = (await import('../schemas/WhatsAppSession.schema.js')).default;

    // Core Data Models (Scoped by Phone Number if provided)
    const Message = await getClientModel(user, 'Message', messageSchema, phoneNumber);
    const Chat = await getClientModel(user, 'Chat', chatSchema, phoneNumber);
    const Contact = await getClientModel(user, 'Contact', contactSchema, phoneNumber);

    // Group and Media also likely need scoping
    const Group = await getClientModel(user, 'Group', groupSchema, phoneNumber);
    const Media = await getClientModel(user, 'Media', mediaSchema, phoneNumber);

    // Campaigns might be cross-number? Usually campaigns are tied to a sender. 
    // Let's scope them too for safety/strict isolation.
    const Campaign = await getClientModel(user, 'Campaign', campaignSchema, phoneNumber);
    const CampaignJob = await getClientModel(user, 'CampaignJob', campaignJobSchema, phoneNumber);

    // Platform Models (Not scoped by phone number, but stored in User DB)
    // WhatsAppSession stores the connection state. It shouldn't be suffixed because we need to find it 
    // *before* we know the phone number (e.g. to check status).
    const WhatsAppSession = await getClientModel(user, 'WhatsAppSession', whatsappSessionSchema);

    // Return everything
    return {
        user,
        Message,
        Chat,
        Contact,
        Group,
        Media,
        Campaign,
        CampaignJob,
        WhatsAppSession
    };
};
