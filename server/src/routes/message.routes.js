import express from 'express';
import * as messageController from '../controllers/message.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import { messageLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * Message routes
 * /api/messages
 */

// All routes require authentication
router.use(authenticate);

router.post('/send', messageLimiter, validate(schemas.sendMessage), messageController.sendMessage);
router.get('/', validate(schemas.pagination), messageController.getAllChats);
router.get('/unread', messageController.getUnreadCount);
router.post('/mark-read', messageController.markAsRead);
router.get('/:chatJid', validate(schemas.getMessages), messageController.getChatMessages);
router.delete('/:messageId', validate(schemas.idParam), messageController.deleteMessage);
router.put('/:messageId/edit', validate(schemas.editMessage), messageController.editMessage);
router.post('/:messageId/react', validate(schemas.reactToMessage), messageController.reactToMessage);
router.post('/:messageId/forward', validate(schemas.forwardMessage), messageController.forwardMessage);
router.post('/:chatJid/summarize', messageController.summarizeChat);
router.post('/bulk-toggle-ai', messageController.bulkToggleAI);
router.post('/:chatJid/toggle-ai', messageController.toggleAI);
router.post('/normalize', messageController.normalizeChats);
router.post('/:chatJid/archive', messageController.toggleArchive);

export default router;
