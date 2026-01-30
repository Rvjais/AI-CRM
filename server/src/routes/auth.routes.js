import express from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.middleware.js';

const router = express.Router();

/**
 * Auth routes
 * /api/auth
 */

// Public routes
router.post('/register', authLimiter, validate(schemas.register), authController.register);
router.post('/login', authLimiter, validate(schemas.login), authController.login);
router.post('/refresh-token', validate(schemas.refreshToken), authController.refreshToken);

// Protected routes
router.use(authenticate); // All routes below require authentication

router.post('/logout', authController.logout);
router.get('/me', authController.getCurrentUser);
router.put('/profile', validate(schemas.updateProfile), authController.updateProfile);
router.put('/password', validate(schemas.changePassword), authController.changePassword);

export default router;
