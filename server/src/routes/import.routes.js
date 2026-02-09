import express from 'express';
import multer from 'multer';
import * as importController from '../controllers/import.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

router.post('/upload', upload.single('file'), importController.uploadCsv);
router.get('/', importController.getBatches);
router.get('/:id/sample', importController.getBatchSample);
router.delete('/:id', importController.deleteBatch);

export default router;
