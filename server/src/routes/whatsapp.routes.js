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
router.use(authenticate);

// Connection
router.post('/connect', connectionLimiter, whatsappController.connect);
router.get('/qr', whatsappController.getQRCode);
router.post('/pairing-code', validate(schemas.pairingCode), whatsappController.requestPairingCode);
router.post('/disconnect', whatsappController.disconnect);
router.get('/status', whatsappController.getStatus);
router.get('/phone-info', whatsappController.getPhoneInfo);
router.post('/logout-devices', whatsappController.logoutDevices);

// Calls
router.post('/reject-call', whatsappController.rejectCall);

// Presence
router.post('/presence/subscribe', whatsappController.subscribePresence);
router.post('/presence/update', whatsappController.updatePresence);

// Read messages (sends blue ticks to WA)
router.post('/read-messages', whatsappController.readMessages);

// User queries
router.get('/check/:phoneNumber', whatsappController.checkOnWhatsApp);
router.get('/profile-picture/:jid', whatsappController.getProfilePicture);
router.get('/status-text/:jid', whatsappController.getStatusText);
router.get('/business-profile/:jid', whatsappController.getBusinessProfile);

// Profile management (own account)
router.put('/profile/status', whatsappController.updateProfileStatus);
router.put('/profile/name', whatsappController.updateProfileName);
router.post('/profile/picture', whatsappController.updateProfilePicture);
router.delete('/profile/picture', whatsappController.removeProfilePicture);

// Block/Unblock
router.post('/block', whatsappController.blockUser);
router.post('/unblock', whatsappController.unblockUser);
router.get('/blocklist', whatsappController.getBlocklist);

// Privacy settings
router.get('/privacy', whatsappController.getPrivacySettings);
router.put('/privacy', whatsappController.updatePrivacySettings);
router.put('/privacy/disappearing', whatsappController.updateDefaultDisappearing);

// Chat modifications (mute, pin, star, archive sync etc.)
router.post('/chat-modify', whatsappController.chatModify);

// Broadcast lists
router.get('/broadcast/:broadcastJid', whatsappController.getBroadcastInfo);

export default router;
