import express from 'express';
import { updateInfrastructure, getInfrastructure, updateSettings, getSettings } from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Feature Settings
router.route('/settings')
    .put(updateSettings)
    .get(getSettings);

// Infrastructure Settings
router.route('/infrastructure')
    .put(updateInfrastructure)
    .get(getInfrastructure);

export default router;
