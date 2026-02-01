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
