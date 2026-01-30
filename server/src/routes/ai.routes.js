import express from 'express';
import * as aiController from '../controllers/ai.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * AI routes
 * /api/ai
 */

// All routes require authentication
router.use(authenticate);

router.get('/config', aiController.getAIConfig);
router.put('/config', validate(schemas.updateAIConfig), aiController.updateAIConfig);

export default router;
