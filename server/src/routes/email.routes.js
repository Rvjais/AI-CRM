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

router.get('/threads', emailController.listThreads);
router.get('/threads/:threadId', emailController.getThread);
router.delete('/threads/:threadId', emailController.trashThread);
router.post('/send', emailController.sendEmail);
router.post('/drafts', emailController.createDraft);
router.get('/labels', emailController.listLabels);
router.get('/profile', emailController.getProfile);

export default router;
