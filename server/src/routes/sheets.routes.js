import express from 'express';
import * as sheetsController from '../controllers/sheets.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate);

router.get('/config', sheetsController.getConfig);
router.post('/config', sheetsController.saveConfig);
router.post('/sync-headers', sheetsController.syncHeaders);
router.post('/sync-chat', sheetsController.syncChat);

export default router;
