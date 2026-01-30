import express from 'express';
import * as whatsappController from '../controllers/whatsapp.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import { connectionLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * WhatsApp routes
 * /api/whatsapp
 */

// All routes require authentication
router.use(authenticate);

router.post('/connect', connectionLimiter, whatsappController.connect);
router.get('/qr', whatsappController.getQRCode);
router.post('/pairing-code', validate(schemas.pairingCode), whatsappController.requestPairingCode);
router.post('/disconnect', whatsappController.disconnect);
router.get('/status', whatsappController.getStatus);
router.get('/phone-info', whatsappController.getPhoneInfo);
router.post('/logout-devices', whatsappController.logoutDevices);

export default router;
