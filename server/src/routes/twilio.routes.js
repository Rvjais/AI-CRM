import express from 'express';
import * as twilioController from '../controllers/twilio.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Twilio routes
 * /api/twilio
 */

// Protected routes (require authentication)
router.post('/call', authenticate, twilioController.makeCall);
router.get('/calls', authenticate, twilioController.listCalls);
router.get('/calls/:callSid', authenticate, twilioController.getCall);
router.get('/stats', authenticate, twilioController.getCallStats);

// Webhook routes (open for Twilio to post to)
router.post('/webhook/status', twilioController.handleStatusCallback);
router.post('/webhook/voice', twilioController.handleIncomingCall);

export default router;
