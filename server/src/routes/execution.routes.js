import express from 'express';
import * as executionController from '../controllers/execution.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Protect all routes

router.get('/stats', executionController.getExecutionStats);
router.post('/sync-history', executionController.syncHistory);
router.get('/', executionController.getExecutions);
router.get('/:executionId', executionController.getExecution);

export default router;
