import express from 'express';
import * as groupController from '../controllers/group.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * Group routes
 * /api/groups
 */

// All routes require authentication
router.use(authenticate);

router.post('/create', validate(schemas.createGroup), groupController.createGroup);
router.get('/', groupController.getAllGroups);
router.post('/join/:code', groupController.joinGroup);
router.get('/:groupJid', groupController.getGroupDetails);
router.put('/:groupJid', validate(schemas.updateGroup), groupController.updateGroupSettings);
router.delete('/:groupJid/leave', groupController.leaveGroup);
router.post('/:groupJid/participants', validate(schemas.manageParticipants), groupController.manageParticipants);
router.put('/:groupJid/participants/:jid/promote', groupController.promoteToAdmin);
router.put('/:groupJid/participants/:jid/demote', groupController.demoteFromAdmin);
router.get('/:groupJid/invite-code', groupController.getInviteCode);
router.post('/:groupJid/revoke-code', groupController.revokeInviteCode);

export default router;
