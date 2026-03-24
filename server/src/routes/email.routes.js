import express from 'express';
import * as emailController from '../controllers/email.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Email routes
 * /api/emails
 */

// All routes require authentication
router.use(authenticate);

// Profile
router.get('/profile', emailController.getProfile);

// Labels
router.get('/labels', emailController.listLabels);

// Threads
router.get('/threads', emailController.listThreads);
router.get('/threads/:threadId', emailController.getThread);
router.delete('/threads/:threadId', emailController.trashThread);
router.post('/threads/:threadId/star', emailController.starThread);
router.delete('/threads/:threadId/star', emailController.unstarThread);
router.post('/threads/:threadId/archive', emailController.archiveThread);
router.post('/threads/:threadId/unarchive', emailController.unarchiveThread);
router.post('/threads/:threadId/untrash', emailController.untrashThread);
router.post('/threads/:threadId/read', emailController.markRead);
router.post('/threads/:threadId/unread', emailController.markUnread);
router.post('/threads/:threadId/modify', emailController.modifyThread);

// Messages
router.get('/messages/:messageId', emailController.getMessage);
router.get('/messages/:messageId/attachments/:attachmentId', emailController.getAttachment);
router.post('/messages/batch-modify', emailController.batchModify);
router.post('/messages/batch-delete', emailController.batchDelete);

// Drafts
router.get('/drafts', emailController.listDrafts);
router.get('/drafts/:draftId', emailController.getDraft);
router.post('/drafts', emailController.createDraft);
router.delete('/drafts/:draftId', emailController.deleteDraft);

// Send
router.post('/send', emailController.sendEmail);

export default router;
