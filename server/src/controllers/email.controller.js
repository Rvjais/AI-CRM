import * as gmailService from '../services/gmail.service.js';
import { successResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

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
        const EmailAnalysis = (await import('../models/EmailAnalysis.js')).default;
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

        // 2. Identify missing and analyze in parallel (Limit to top 10)
        // We map over threads, if analysis missing, we start a promise to analyze
        // ONLY valid for the first 10 threads to save resources/time as requested
        const enhancedThreads = await Promise.all(threads.map(async (thread, index) => {
            let analysis = analysisMap[thread.id];

            // Only analyze if missing AND it's within the top 10 (index < 10)
            if (!analysis && thread.snippet && index < 10) {
                // Not found in DB, try to analyze
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
                    }
                } catch (err) {
                    console.error(`Failed to analyze thread ${thread.id}:`, err.message);
                }
            }

            return {
                ...thread,
                sentiment: analysis ? analysis.sentiment : null,
                importanceScore: analysis ? analysis.importanceScore : null,
                summary: analysis ? analysis.summary : null
            };
        }));

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
