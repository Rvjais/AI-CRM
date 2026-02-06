import express from 'express';
import authRoutes from './auth.routes.js';
import whatsappRoutes from './whatsapp.routes.js';
import messageRoutes from './message.routes.js';
import contactRoutes from './contact.routes.js';
import groupRoutes from './group.routes.js';
import mediaRoutes from './media.routes.js';
import aiRoutes from './ai.routes.js';
import emailRoutes from './email.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import sheetsRoutes from './sheets.routes.js';

const router = express.Router();

/**
 * API Routes aggregator
 * All routes are prefixed with /api
 */

router.use('/auth', authRoutes);
router.use('/whatsapp', whatsappRoutes);
router.use('/messages', messageRoutes);
router.use('/contacts', contactRoutes);
router.use('/groups', groupRoutes);
router.use('/media', mediaRoutes);
router.use('/ai', aiRoutes);
router.use('/emails', emailRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/sheets', sheetsRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API is running',
        timestamp: new Date().toISOString(),
    });
});

export default router;
