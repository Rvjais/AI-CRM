import * as mongoService from '../services/mongo.service.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const getFile = asyncHandler(async (req, res) => {
    const { fileId } = req.params;

    try {
        const { stream, contentType, length, filename } = await mongoService.getFileStream(fileId);

        res.set('Content-Type', contentType);
        res.set('Content-Length', length);
        res.set('Content-Disposition', `inline; filename="${filename}"`);

        stream.pipe(res);
    } catch (error) {
        if (error.message === 'File not found') {
            return res.status(404).json({ success: false, message: 'File not found' });
        }
        throw error;
    }
});
