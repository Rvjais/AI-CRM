import express from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Infrastructure Settings
router.put('/infrastructure', userController.updateInfrastructure);
router.get('/infrastructure', userController.getInfrastructure);

export default router;
