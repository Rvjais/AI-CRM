
import cron from 'node-cron';
import User from '../models/User.js';
import Chat from '../models/Chat.js';
import * as aiService from '../services/ai.service.js';
import * as sheetsService from '../services/sheets.service.js';
import logger from '../utils/logger.util.js';

export const startAiCron = () => {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        logger.info('⏰ [Cron] Starting 30-minute AI batch processing...');

        try {
            const users = await User.find({}).select('_id sheetsConfig aiSettings');

            for (const user of users) {
                // Find chats active in the last 30 minutes
                const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);

                const activeChats = await Chat.find({
                    userId: user._id,
                    lastMessageAt: { $gte: thirtyMinsAgo }
                });

                if (activeChats.length === 0) continue;

                logger.info(`[Cron] Processing ${activeChats.length} chats for user ${user._id}`);

                for (const chat of activeChats) {
                    try {
                        // 1. Analyze / Re-analyze
                        const schema = user.sheetsConfig?.columns || [];
                        const { sentiment, summary, suggestions, extractedData } = await aiService.analyzeMessage(
                            user._id,
                            chat.chatJid,
                            "Periodic analysis: Extract all latest lead data.", // Context for AI
                            schema
                        );

                        // 2. Update Chat Model
                        const updateData = {
                            sentiment,
                            summary,
                            suggestions,
                            lastSummaryAt: new Date()
                        };

                        if (extractedData && Object.keys(extractedData).length > 0) {
                            updateData.extractedData = extractedData;
                        }

                        await Chat.findByIdAndUpdate(chat._id, updateData);

                        // 3. Sync to Sheets (Upsert)
                        if (user.sheetsConfig?.spreadsheetId && extractedData && Object.keys(extractedData).length > 0) {
                            await sheetsService.syncChatToSheet(user._id, chat.chatJid, extractedData);
                        }

                    } catch (err) {
                        logger.error(`[Cron] Failed to process chat ${chat.chatJid}:`, err);
                    }
                }
            }
        } catch (error) {
            logger.error('[Cron] Critical error in AI batch job:', error);
        }
    });

    logger.info('✅ AI Cron Job scheduled (every 30 mins)');
};
