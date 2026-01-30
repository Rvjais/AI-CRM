import express from 'express';
import * as contactController from '../controllers/contact.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate, schemas } from '../middleware/validation.middleware.js';

const router = express.Router();

/**
 * Contact routes
 * /api/contacts
 */

// All routes require authentication
router.use(authenticate);

router.get('/', contactController.getAllContacts);
router.post('/sync', contactController.syncContacts);
router.get('/:jid/check', validate(schemas.checkContact), contactController.checkContact);
router.get('/:jid', validate(schemas.jidParam), contactController.getContactDetails);
router.put('/:jid', validate({ ...schemas.jidParam, ...schemas.updateContact }), contactController.updateContact);
router.delete('/:jid', validate(schemas.jidParam), contactController.deleteContact);
router.post('/:jid/block', validate(schemas.jidParam), contactController.blockContact);
router.post('/:jid/unblock', validate(schemas.jidParam), contactController.unblockContact);

export default router;
