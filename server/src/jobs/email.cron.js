
import cron from 'node-cron';
import User from '../models/User.js';
import * as gmailService from '../services/gmail.service.js';
import * as aiService from '../services/ai.service.js';
import * as whatsappService from '../services/whatsapp.service.js';
import logger from '../utils/logger.util.js';

/**
 * Start the Email Monitoring Cron Job
 * Runs every 5 minutes
 */
export const startEmailCron = () => {
    cron.schedule('*/5 * * * *', async () => {
        logger.info('📧 [Email Cron] Starting 5-minute email check...');

        try {
            // Find users with both Gmail and WhatsApp connected
            const users = await User.find({
                gmailConnected: true,
                whatsappConnected: true
            });

            logger.info(`[Email Cron] Checking emails for ${users.length} users`);

            for (const user of users) {
                try {
                    await checkUserEmails(user);
                } catch (err) {
                    logger.error(`[Email Cron] Failed to check emails for user ${user._id}:`, err);
                }
            }

        } catch (error) {
            logger.error('[Email Cron] Critical error:', error);
        }
    });

    logger.info('✅ Email Monitoring Job scheduled (every 5 mins)');
};

/**
 * Check recent emails for a specific user
 * @param {Object} user 
 */
const checkUserEmails = async (user) => {
    try {
        // 1. Fetch recent threads (last 10 messages to be safe, we rely on duplicate check)
        // We can't easily filter by time in 'q' without complex logic, so we just fetch latest 5
        const result = await gmailService.listThreads(user._id, { maxResults: 5 });
        const threads = result.threads || [];

        if (threads.length === 0) return;

        // Dynamic Import for EmailAnalysis model
        const EmailAnalysis = (await import('../models/EmailAnalysis.js')).default;

        for (const thread of threads) {
            // 2. Check if already analyzed
            const existingAnalysis = await EmailAnalysis.findOne({ userId: user._id, threadId: thread.id });

            if (existingAnalysis) {
                // Already processed, skip
                continue;
            }

            // 3. Analyze with AI
            if (thread.snippet) {
                // console.log(`[Email Cron] Analyzing new thread: ${thread.subject}`);
                const aiResult = await aiService.analyzeEmail(user._id, thread.snippet);

                if (aiResult) {
                    // 4. Save Analysis
                    const analysis = await EmailAnalysis.create({
                        userId: user._id,
                        threadId: thread.id,
                        sentiment: aiResult.sentiment || 'neutral',
                        summary: aiResult.summary,
                        importanceScore: aiResult.importanceScore || 5,
                        importanceReason: aiResult.importanceReason
                    });

                    // 5. Check Priority & Notify
                    const score = Number(aiResult.importanceScore) || 0;

                    if (score > 7) {
                        const selfJid = whatsappService.getSelfJid(user._id);

                        if (selfJid) {
                            console.log(`📱 [Email Cron] Notifying User ${user._id} of High Priority Email: "${thread.subject}"`);
                            const msg = `🚨 *High Priority Email Detected*\n\n*Subject:* ${thread.subject}\n*Sender:* ${thread.from}\n*Score:* ${score}/10\n*Reason:* ${aiResult.importanceReason}\n\n_Auto-forwarded by AI_`;

                            await whatsappService.sendMessage(user._id, selfJid, { text: msg });
                        }
                    }
                }
            }
        }

    } catch (error) {
        throw error;
    }
};
