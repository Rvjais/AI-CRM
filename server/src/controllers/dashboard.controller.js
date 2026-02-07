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
    let sentiment = { positive: 0, neutral: 0, negative: 0 };
    let aiInteractions = 0;
    let recentActivity = [];

    if (isWhatsAppConnected) {
        // 1. WhatsApp Chat Stats
        totalChats = await Chat.countDocuments({ userId });

        // Sentiment Breakdown
        const sentimentStats = await Chat.aggregate([
            { $match: { userId: userId, sentiment: { $exists: true } } },
            {
                $group: {
                    _id: '$sentiment',
                    count: { $sum: 1 }
                }
            }
        ]);

        sentimentStats.forEach(stat => {
            if (stat._id === 'positive') sentiment.positive = stat.count;
            if (stat._id === 'neutral') sentiment.neutral = stat.count;
            if (stat._id === 'negative') sentiment.negative = stat.count;
        });

        // 2. AI Interactions (Messages sent by AI/Bot)
        aiInteractions = await Message.countDocuments({
            userId,
            fromMe: true
        });

        // 3. Recent Activity (Last 5 updated chats)
        recentActivity = await Chat.find({ userId })
            .sort({ lastMessageAt: -1 })
            .limit(5)
            .select('chatJid contactName phoneNumber lastMessageAt sentiment unreadCount aiEnabled isArchived profilePicture')
            .lean();
    }

    // 4. Email Stats
    let emailStats = {
        connected: false,
        unread: 0,
        total: 0
    };

    try {
        const user = await User.findById(userId).select('gmailConnected');
        if (user && user.gmailConnected) {
            const stats = await gmailService.getUnreadStats(userId);
            emailStats = {
                connected: true,
                unread: stats.messagesUnread,
                total: stats.threadsTotal || 0
            };
        }
    } catch (error) {
        console.error('Error fetching email stats:', error.message);
    }

    return successResponse(res, 200, 'Dashboard stats retrieved', {
        whatsapp: {
            totalChats,
            connected: isWhatsAppConnected,
            sentiment
        },
        ai: {
            interactions: aiInteractions
        },
        recentActivity,
        email: emailStats
    });
});
