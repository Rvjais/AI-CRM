import express from 'express';
import authRoutes from './auth.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import messageRoutes from './message.routes.js';
import contactRoutes from './contact.routes.js';
import aiRoutes from './ai.routes.js';
import groupRoutes from './group.routes.js';
import mediaRoutes from './media.routes.js';
import fileRoutes from './file.routes.js';
import emailRoutes from './email.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import sheetsRoutes from './sheets.routes.js';
import adminRoutes from './admin.routes.js';
import userRoutes from './user.routes.js';
import webhookRoutes from './webhook.routes.js';
import importRoutes from './import.routes.js';
import campaignRoutes from './campaign.routes.js';
import formRoutes from './form.routes.js';
import bolnaRoutes from './bolna.routes.js';
import agentRoutes from './agent.routes.js';
import executionRoutes from './execution.routes.js';

const router = express.Router();

/**
 * API Routes aggregator
 * All routes are prefixed with /api
 */

router.use('/auth', authRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/messages', messageRoutes);
router.use('/contacts', contactRoutes);
router.use('/imports', importRoutes);
router.use('/campaigns', campaignRoutes);
router.use('/ai', aiRoutes);
router.use('/groups', groupRoutes);
router.use('/media', mediaRoutes);
router.use('/files', fileRoutes);
router.use('/emails', emailRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/sheets', sheetsRoutes);
router.use('/admin', adminRoutes);
router.use('/user', userRoutes);
router.use('/webhooks', webhookRoutes);
router.use('/forms', formRoutes);
router.use('/bolna', bolnaRoutes);
router.use('/agents', agentRoutes);
router.use('/executions', executionRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
