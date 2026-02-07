import express from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { USER_ROLES } from '../config/constants.js';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

// Protect all admin routes
router.use(authenticate);
router.use(authorize(USER_ROLES.ADMIN));

router.get('/users', adminController.getAllUsers);
router.put('/users/:userId', adminController.updateUser);
router.delete('/users/:userId', adminController.deleteUser);
router.patch('/users/:userId/suspend', adminController.toggleUserSuspension);
router.get('/stats', adminController.getAdminStats);

export default router;
