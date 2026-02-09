import * as importService from '../services/import.service.js';
import { successResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const uploadCsv = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new Error('Please upload a CSV file');
    }

    // Type from body (WHATSAPP or EMAIL)
    const type = req.body.type || 'WHATSAPP';
    const mapping = req.body.mapping || '{}';

    const result = await importService.processImport(req.userId, req.file, type, mapping);

    return successResponse(res, 201, 'Import processed successfully', result);
});

export const getBatches = asyncHandler(async (req, res) => {
    const result = await importService.listBatches(req.userId);
    return successResponse(res, 200, 'Imports retrieved successfully', result);
});

export const deleteBatch = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await importService.deleteBatch(req.userId, id);
    return successResponse(res, 200, 'Import batch deleted');
});

export const getBatchSample = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await importService.getBatchSample(req.userId, id);
    return successResponse(res, 200, 'Sample retrieved', result);
});
