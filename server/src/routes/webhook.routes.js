import express from 'express';
import * as webhookController from '../controllers/webhook.controller.js';

const router = express.Router();

// Public route for Pabbly (Pabbly accesses this without JWT)
// You might want to add a verification middleware (check Pabbly signature or custom secret)
// For now, it's open but we can add query param check ?secret=YOUR_SECRET
router.post('/pabbly', webhookController.handlePabblyWebhook);

export default router;
