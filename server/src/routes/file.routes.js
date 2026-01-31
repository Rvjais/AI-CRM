import express from 'express';
import * as fileController from '../controllers/file.controller.js';

const router = express.Router();

router.get('/:fileId', fileController.getFile);

export default router;
