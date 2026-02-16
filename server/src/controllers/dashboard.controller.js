import { asyncHandler } from '../middleware/error.middleware.js';
import { successResponse } from '../utils/response.util.js';
import Chat from '../models/Chat.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import * as gmailService from '../services/gmail.service.js';

import * as whatsappService from '../services/whatsapp.service.js';

/**
 * Get dashboard statistics
 * GET /api/dashboard/stats
 */
export const getDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.userId;

    // Check WhatsApp Connection Status
    const isWhatsAppConnected = whatsappService.isConnected(userId);

    let totalChats = 0;
    let leads = { positive: 0, negative: 0 }; // New: Leads stats
    let aiInteractions = 0;

    // Forms Stats
    let formsStats = [];

    // Dummy Voice Bot Stats
    const voiceBotStats = {
        totalCalls: 124,
        avgDuration: '2m 15s',
        sentiment: 'Positive',
        cost: '$12.50'
    };

    if (isWhatsAppConnected) {
        // [FIX] Use dynamic models to fetch data from the correct isolated collection
        // 1. Get Host Number from Session
        const { getClientModels } = await import('../utils/database.factory.js');
        const { WhatsAppSession } = await getClientModels(userId);
        const session = await WhatsAppSession.findOne({ userId });
        const hostNumber = session?.phoneNumber;

        // 2. Get Scoped Chat/Message Models
        const { Chat, Message } = await getClientModels(userId, hostNumber);

        // 3. WhatsApp Chat Stats
        totalChats = await Chat.countDocuments({ userId });

        // Sentiment Breakdown for Leads (Positive/Negative)
        const sentimentStats = await Chat.aggregate([
            { $match: { userId: userId, sentiment: { $in: ['positive', 'negative'] } } },
            {
                $group: {
                    _id: '$sentiment',
                    count: { $sum: 1 }
                }
            }
        ]);

        sentimentStats.forEach(stat => {
            if (stat._id === 'positive') leads.positive = stat.count;
            if (stat._id === 'negative') leads.negative = stat.count;
        });

        // Fetch recent chats for lists
        leads.positiveList = await Chat.find({ userId, sentiment: 'positive' })
            .sort({ lastMessageAt: -1 })
            .limit(5)
            .lean();

        leads.negativeList = await Chat.find({ userId, sentiment: 'negative' })
            .sort({ lastMessageAt: -1 })
            .limit(5)
            .lean();

        // 2. AI Interactions (Messages sent by AI/Bot)
        // Use the same dynamic Message model fetched above
        aiInteractions = await Message.countDocuments({
            userId,
            fromMe: true
        });
    }

    // 3. Forms Stats (Total inputs & last 5 submissions)
    try {
        // Fetch all forms (or filter by user if specific logic applies)
        const forms = await import('../models/Form.js').then(m => m.default.find().lean());
        const FormSubmission = (await import('../models/FormSubmission.js')).default;

        for (const form of forms) {
            const submissionCount = await FormSubmission.countDocuments({ formId: form._id });

            // Last 5 submissions for this form
            const recentSubmissions = await FormSubmission.find({ formId: form._id })
                .sort({ submittedAt: -1 })
                .limit(5)
                .lean();

            formsStats.push({
                _id: form._id,
                title: form.title,
                totalSubmissions: submissionCount,
                recentSubmissions: recentSubmissions.map(sub => {
                    // Smart extraction of identifier
                    const data = sub.data || {};
                    // Case insensitive search for keys
                    const getVal = (key) => {
                        const k = Object.keys(data).find(k => k.toLowerCase() === key.toLowerCase());
                        return k ? data[k] : null;
                    };

                    const email = getVal('email');
                    const name = getVal('name') || getVal('fullname') || getVal('first name');
                    const phone = getVal('phone') || getVal('number') || getVal('mobile');

                    const displayValue = email || name || phone || 'Submission';

                    return {
                        _id: sub._id,
                        email: displayValue, // Keep for fallback/compatibility
                        data: sub.data, // Return full data object
                        submittedAt: sub.submittedAt
                    };
                })
            });
        }
    } catch (error) {
        console.error("Error fetching form stats:", error);
    }


    // 4. Email Stats & AI Analysis
    let emailStats = {
        connected: false,
        unread: 0,
        total: 0,
        sentiment: { positive: 0, neutral: 0, negative: 0 },
        mostImportant: null
    };

    try {
        const user = await User.findById(userId).select('gmailConnected');
        if (user && user.gmailConnected) {
            const stats = await gmailService.getUnreadStats(userId);

            // Email AI Analysis
            // Fetch last 10 threads
            const threadData = await gmailService.listThreads(userId, { maxResults: 10 });
            const recentThreads = threadData.threads || [];

            // Import Models/Services dynamically if needed or assume imports
            const EmailAnalysis = (await import('../models/EmailAnalysis.js')).default;
            const { analyzeEmail } = await import('../services/ai.service.js');

            let positive = 0, neutral = 0, negative = 0;
            let processedEmails = []; // Array to hold all analyzed emails for sorting

            // Analyze/Retrieve Analysis
            // Use Promise.all for parallelism
            await Promise.all(recentThreads.map(async (thread) => {
                try {
                    // Check Cache
                    let analysis = await EmailAnalysis.findOne({ userId, threadId: thread.id });

                    // If not analyzed, analyze now
                    if (!analysis && thread.snippet) {
                        const aiResult = await analyzeEmail(userId, thread.snippet);
                        if (aiResult) {
                            analysis = await EmailAnalysis.create({
                                userId,
                                threadId: thread.id,
                                sentiment: aiResult.sentiment || 'neutral',
                                summary: aiResult.summary,
                                importanceScore: aiResult.importanceScore || 5, // Default mid
                                importanceReason: aiResult.importanceReason
                            });

                            // Notification for High Priority
                            const score = Number(aiResult.importanceScore) || 0;
                            console.log(`📧 [Email Analysis] Subject: "${thread.subject}", Score: ${score}`);

                            if (score > 7) {
                                try {
                                    const selfJid = whatsappService.getSelfJid(userId);
                                    console.log(`📱 [Notify] High Priority! Self JID: ${selfJid}`);

                                    if (selfJid) {
                                        // [FEATURE FLAG CHECK]
                                        if (user && user.featureFlags && user.featureFlags.emailNotifications === false) {
                                            console.log(`📧 [Notify] Email notifications disabled for user ${userId}. Skipping.`);
                                        } else {
                                            const msg = `🚨 *High Priority Email Detected*\n\n*Subject:* ${thread.subject}\n*Score:* ${score}/10\n*Reason:* ${aiResult.importanceReason}\n\nCheck your dashboard for details.`;
                                            await whatsappService.sendMessage(userId, selfJid, { text: msg });
                                            console.log(`✅ [Notify] Message sent to ${selfJid}`);
                                        }
                                    } else {
                                        console.warn(`⚠️ [Notify] Skipped - No Self JID found for user ${userId}`);
                                    }
                                } catch (notifyErr) {
                                    console.error('❌ [Notify] Failed to send email priority notification:', notifyErr);
                                }
                            }
                        }
                    }

                    // Aggregate
                    if (analysis) {
                        if (analysis.sentiment === 'positive') positive++;
                        else if (analysis.sentiment === 'negative') negative++;
                        else neutral++;

                        // Add to processed list for sorting later
                        processedEmails.push({
                            id: thread.id,
                            subject: thread.subject,
                            from: thread.from,
                            snippet: thread.snippet,
                            summary: analysis.summary,
                            reason: analysis.importanceReason,
                            score: analysis.importanceScore,
                            sentiment: analysis.sentiment,
                            date: thread.date
                        });
                    }
                } catch (err) {
                    console.error(`Error analyzing thread ${thread.id}:`, err);
                }
            }));

            // Sort by Importance Score (Desc)
            const priorityList = processedEmails
                .sort((a, b) => b.score - a.score)
                .slice(0, 5); // Return top 5

            // Count high priority unread (score > 7)
            const highPriorityCount = processedEmails.filter(e => e.score > 7).length;

            emailStats = {
                connected: true,
                unread: highPriorityCount, // [USER REQUEST] Show High Priority count instead of total unread
                total: stats.messagesUnread, // Show total unread as secondary info if needed, or just total threads
                sentiment: { positive, neutral, negative },
                priorityList // New list
            };
        }
    } catch (error) {
        console.error('Error fetching email stats:', error.message);
    }

    return successResponse(res, 200, 'Dashboard stats retrieved', {
        whatsapp: {
            totalChats,
            connected: isWhatsAppConnected,
            leads // New leads object
        },
        ai: {
            interactions: aiInteractions
        },
        voiceBot: voiceBotStats, // Dummy data
        forms: formsStats, // New forms stats
        email: emailStats
    });
});
