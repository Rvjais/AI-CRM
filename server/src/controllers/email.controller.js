import * as gmailService from '../services/gmail.service.js';
import { successResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import * as whatsappService from '../services/whatsapp.service.js';

/**
 * Email Controller
 * Handles Gmail integration endpoints
 */

/**
 * List email threads
 * GET /api/emails/threads
 */
export const listThreads = asyncHandler(async (req, res) => {
    const { maxResults, q, pageToken } = req.query;
    const result = await gmailService.listThreads(req.userId, { maxResults, q, pageToken });

    // Enhance with AI Analysis
    try {
        const { getClientModels } = await import('../utils/database.factory.js');
        const { EmailAnalysis } = await getClientModels(req.userId);

        const { analyzeEmail } = await import('../services/ai.service.js');
        const threads = result.threads || [];

        // 1. Fetch existing analyses
        const existingAnalyses = await EmailAnalysis.find({
            userId: req.userId,
            threadId: { $in: threads.map(t => t.id) }
        });

        const analysisMap = existingAnalyses.reduce((acc, curr) => {
            acc[curr.threadId] = curr;
            return acc;
        }, {});

        // 2. Identify missing and analyze SEQUENTIALLY (to avoid overloading Ollama/CPU)
        const enhancedThreads = [];
        for (let i = 0; i < threads.length; i++) {
            const thread = threads[i];
            let analysis = analysisMap[thread.id];

            // Only analyze if missing AND it's within the top 10
            if (!analysis && thread.snippet && i < 10) {
                try {
                    const aiResult = await analyzeEmail(req.userId, thread.snippet);
                    if (aiResult) {
                        analysis = await EmailAnalysis.create({
                            userId: req.userId,
                            threadId: thread.id,
                            sentiment: aiResult.sentiment || 'neutral',
                            summary: aiResult.summary,
                            importanceScore: aiResult.importanceScore || 5,
                            importanceReason: aiResult.importanceReason
                        });

                        // [RETENTION POLICY] Keep only last 10
                        const count = await EmailAnalysis.countDocuments({ userId: req.userId });
                        if (count > 10) {
                            const oldestToKeep = await EmailAnalysis.find({ userId: req.userId })
                                .sort({ analyzedAt: -1 })
                                .skip(9)
                                .limit(1)
                                .select('_id');

                            if (oldestToKeep.length > 0) {
                                await EmailAnalysis.deleteMany({
                                    userId: req.userId,
                                    analyzedAt: { $lt: oldestToKeep[0].analyzedAt }
                                });
                            }
                        }

                        const score = Number(aiResult.importanceScore) || 0;

                        if (score > 7) {
                            try {
                                const selfJid = whatsappService.getSelfJid(req.userId);
                                if (selfJid) {
                                    const msg = `🚨 *High Priority Email Detected*\n\n*Subject:* ${thread.subject}\n*Score:* ${score}/10\n*Reason:* ${aiResult.importanceReason}\n\nCheck your dashboard for details.`;
                                    await whatsappService.sendMessage(req.userId, selfJid, { text: msg });
                                }
                            } catch (notifyErr) {
                                console.error('❌ [Notify] Failed to send email priority notification:', notifyErr);
                            }
                        }
                    }
                } catch (err) {
                    console.error(`Failed to analyze thread ${thread.id}:`, err.message);
                }
            }

            enhancedThreads.push({
                ...thread,
                sentiment: analysis ? analysis.sentiment : null,
                importanceScore: analysis ? analysis.importanceScore : null,
                summary: analysis ? analysis.summary : null
            });
        }

        result.threads = enhancedThreads;

    } catch (error) {
        console.error('Error enhancing threads with AI data:', error);
        // Continue without enhancement on error
    }

    return successResponse(res, 200, 'Threads retrieved successfully', result);
});

/**
 * Get thread details
 * GET /api/emails/threads/:threadId
 */
export const getThread = asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const result = await gmailService.getThread(req.userId, threadId);
    return successResponse(res, 200, 'Thread retrieved successfully', result);
});

/**
 * Send email
 * POST /api/emails/send
 */
export const sendEmail = asyncHandler(async (req, res) => {
    const { to, subject, body, threadId } = req.body;
    const result = await gmailService.sendEmail(req.userId, { to, subject, body, threadId });
    return successResponse(res, 200, 'Email sent successfully', result);
});

/**
 * Create draft
 * POST /api/emails/drafts
 */
export const createDraft = asyncHandler(async (req, res) => {
    const { to, subject, body } = req.body;
    const result = await gmailService.createDraft(req.userId, { to, subject, body });
    return successResponse(res, 200, 'Draft created successfully', result);
});

/**
 * Trash thread
 * DELETE /api/emails/threads/:threadId
 */
export const trashThread = asyncHandler(async (req, res) => {
    const { threadId } = req.params;
    const result = await gmailService.trashThread(req.userId, threadId);
    return successResponse(res, 200, 'Thread moved to trash', result);
});

/**
 * Get labels
 * GET /api/emails/labels
 */
export const listLabels = asyncHandler(async (req, res) => {
    const result = await gmailService.listLabels(req.userId);
    return successResponse(res, 200, 'Labels retrieved successfully', result);
});

/**
 * Get profile
 * GET /api/emails/profile
 */
export const getProfile = asyncHandler(async (req, res) => {
    const result = await gmailService.getProfile(req.userId);
    return successResponse(res, 200, 'Profile retrieved successfully', result);
});
