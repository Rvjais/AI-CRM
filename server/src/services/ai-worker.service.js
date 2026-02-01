import Chat from '../models/Chat.js';
import { generateSummary } from './ai.service.js';
import logger from '../utils/logger.util.js';

/**
 * AI Worker Service
 * Handles background tasks like periodic summary regeneration
 */

let workerInterval = null;

/**
 * Start the AI background worker
 * @param {Object} io - Socket.io instance to notify clients of updates
 */
export const startAIWorker = (io) => {
    if (workerInterval) return;

    logger.info('🤖 AI Background Worker started (checking every 5 minutes)');

    // Run check every 5 minutes
    workerInterval = setInterval(async () => {
        try {
            await processPeriodicSummaries(io);
        } catch (error) {
            logger.error('Error in AI Worker periodic check:', error);
        }
    }, 5 * 60 * 1000);

    // Trigger an immediate check on startup
    processPeriodicSummaries(io).catch(err => logger.error('Initial AI Worker check failed:', err));
};

/**
 * Find and regenerate summaries for stale chats
 */
const processPeriodicSummaries = async (io) => {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

    // Find chats that were summarized more than 30 minutes ago
    // OR have never been summarized but exist.
    // We only process chats that have at least one message (lastMessageAt exists)
    const staleChats = await Chat.find({
        $and: [
            { lastMessageAt: { $exists: true } },
            {
                $or: [
                    { lastSummaryAt: { $lt: thirtyMinutesAgo } },
                    { lastSummaryAt: null }
                ]
            }
        ]
    }).limit(20); // Limit per batch to avoid overwhelming OpenAI

    if (staleChats.length === 0) return;

    logger.info(`🔄 AI Worker: Found ${staleChats.length} chats for summary refresh`);

    for (const chat of staleChats) {
        try {
            const newSummary = await generateSummary(chat.userId.toString(), chat.chatJid);

            if (newSummary) {
                const updatedChat = await Chat.findOneAndUpdate(
                    { _id: chat._id },
                    {
                        summary: newSummary,
                        lastSummaryAt: new Date()
                    },
                    { new: true }
                ).lean();

                // Notify client via socket
                if (io) {
                    io.to(chat.userId.toString()).emit('chat:update', { chat: updatedChat });
                }
            } else {
                // If summary failed (e.g. no API key), update timestamp anyway 
                // to prevent hitting it again immediately in next 5 min window
                await Chat.updateOne({ _id: chat._id }, { lastSummaryAt: new Date() });
            }
        } catch (error) {
            logger.error(`AI Worker failed to summarize chat ${chat.chatJid}:`, error);
        }
    }
};

/**
 * Stop the worker
 */
export const stopAIWorker = () => {
    if (workerInterval) {
        clearInterval(workerInterval);
        workerInterval = null;
        logger.info('🤖 AI Background Worker stopped');
    }
};
