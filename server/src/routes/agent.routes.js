import express from 'express';
import * as agentController from '../controllers/agent.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(authenticate); // Protect all routes

router.get('/', agentController.getAgents);
router.get('/:agentId', agentController.getAgent);
router.post('/', agentController.createAgent);
router.put('/:agentId', agentController.updateAgent);
router.delete('/:agentId', agentController.deleteAgent);

export default router;
