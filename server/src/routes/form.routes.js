import express from 'express';
import cors from 'cors';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.middleware.js';
import * as formController from '../controllers/form.controller.js';

const router = express.Router();

// Validation rules
const formValidation = [
    body('title').notEmpty().withMessage('Title is required')
];

// Protected routes (require valid token)
router.post('/', authenticate, formValidation, formController.createForm);
router.get('/', authenticate, formController.getForms);
router.get('/:id', authenticate, formController.getForm);
router.put('/:id', authenticate, formController.updateForm);
router.delete('/:id', authenticate, formController.deleteForm);
router.get('/:id/submissions', authenticate, formController.getSubmissions);

// Public route for submission (no auth required)
// Handled by global custom CORS in app.js to work embedded anywhere
router.post('/:formId/submit', formController.submitForm);

export default router;
