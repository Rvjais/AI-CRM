import express from 'express';
import * as bolnaController from '../controllers/bolna.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Bolna AI routes
 * /api/bolna
 */

// Protected routes
router.post('/call', authenticate, bolnaController.initiateCall);

// Webhook route (open for Bolna to post to)
router.post('/webhook', bolnaController.handleWebhook);

export default router;
