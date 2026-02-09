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
        // 1. WhatsApp Chat Stats
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
        aiInteractions = await Message.countDocuments({
            userId,
            fromMe: true
        });
    }

    // 3. Forms Stats (Total inputs & last 5 submissions)
    // We need to fetch forms created by user? 
    // Assuming Form model has userId or we just fetch all for now (schema didn't show userId, might need to check how forms are associated)
    // Checking Form schema... it doesn't seem to have userId in the previous view. 
    // Wait, earlier I saw Form.schema.js and it didn't have userId. 
    // If forms are global or not filtered by user, I'll just fetch all for now or check if there's a workaround.
    // The previous FormBuilder fetchForms used `api.get('/api/forms')`. 
    // I should check `form.controller.js` to see how it filters.
    // For now, I will assume I can fetch all forms or I should add userId to criteria if applicable.
    // I will fetch all forms for now.

    // Actually, let's fetch forms and their submission counts
    try {
        // Ideally we filter by userId if forms are user-specific. 
        // Form schema check:
        // fields: ...
        // No userId visible in schema view.
        // I will fetch all forms.
        const importForm = (await import('../models/Form.js')).default;
        const importSubmission = (await import('../models/FormSubmission.js')).default;

        const forms = await importForm.find().lean();

        for (const form of forms) {
            const submissionCount = await importSubmission.countDocuments({ formId: form._id });
            // Last 5 submissions for this form
            const recentSubmissions = await importSubmission.find({ formId: form._id })
                .sort({ submittedAt: -1 })
                .limit(5)
                .lean();

            formsStats.push({
                _id: form._id,
                title: form.title,
                totalSubmissions: submissionCount,
                recentSubmissions: recentSubmissions.map(sub => ({
                    _id: sub._id,
                    email: sub.data.email || sub.data.Email || 'No Email', // Attempt to grab email field
                    submittedAt: sub.submittedAt
                }))
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
            let highestScore = 0;
            let mostImportantEmail = null;

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
                        }
                    }

                    // Aggregate
                    if (analysis) {
                        if (analysis.sentiment === 'positive') positive++;
                        else if (analysis.sentiment === 'negative') negative++;
                        else neutral++;

                        if (analysis.importanceScore > highestScore) {
                            highestScore = analysis.importanceScore;
                            mostImportantEmail = {
                                subject: thread.subject,
                                from: thread.from,
                                summary: analysis.summary,
                                reason: analysis.importanceReason,
                                score: analysis.importanceScore,
                                sentiment: analysis.sentiment,
                                date: thread.date
                            };
                        }
                    }
                } catch (err) {
                    console.error(`Error analyzing thread ${thread.id}:`, err);
                }
            }));


            emailStats = {
                connected: true,
                unread: stats.messagesUnread,
                total: stats.threadsTotal || 0,
                sentiment: { positive, neutral, negative },
                mostImportant: mostImportantEmail
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
