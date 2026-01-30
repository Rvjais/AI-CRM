import express from 'express';
import * as mediaController from '../controllers/media.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { uploadSingle, validateFileSize } from '../middleware/upload.middleware.js';
import { uploadLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * Media routes
 * /api/media
 */

// All routes require authentication
router.use(authenticate);

router.post('/upload', uploadLimiter, uploadSingle('file'), validateFileSize, mediaController.uploadMedia);
router.get('/:messageId', mediaController.getMediaByMessage);
router.delete('/:mediaId', mediaController.deleteMedia);
router.post('/download', mediaController.downloadMedia);

export default router;
