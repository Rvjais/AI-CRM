import { asyncHandler } from '../middleware/error.middleware.js';
import { successResponse } from '../utils/response.util.js';
import * as sheetsService from '../services/sheets.service.js';
import * as aiService from '../services/ai.service.js';
import User from '../models/User.js';

/**
 * Save Sheets Configuration
 * POST /api/sheets/config
 */
export const saveConfig = asyncHandler(async (req, res) => {
    const { spreadsheetId, sheetName, columns } = req.body;
    const userId = req.userId;

    // Sanitize columns to remove trailing spaces
    const sanitizedColumns = columns.map(col => ({
        ...col,
        key: col.key.trim(),
        header: col.header.trim()
    }));

    const user = await User.findByIdAndUpdate(
        userId,
        {
            $set: {
                'sheetsConfig.spreadsheetId': spreadsheetId,
                'sheetsConfig.sheetName': sheetName,
                'sheetsConfig.columns': sanitizedColumns
            }
        },
        { new: true }
    );

    // Optionally update headers immediately (or leave it to a separate "Sync Headers" action)
    // await sheetsService.updateSheetHeaders(userId);

    return successResponse(res, 200, 'Sheets configuration saved', user.sheetsConfig);
});

/**
 * Get Sheets Configuration
 * GET /api/sheets/config
 */
export const getConfig = asyncHandler(async (req, res) => {
    const user = await User.findById(req.userId).select('sheetsConfig');
    return successResponse(res, 200, 'Sheets configuration retrieved', user.sheetsConfig);
});

/**
 * Sync Headers
 * POST /api/sheets/sync-headers
 */
export const syncHeaders = asyncHandler(async (req, res) => {
    try {
        console.log('Syncing headers for user:', req.userId);
        const result = await sheetsService.updateSheetHeaders(req.userId);
        console.log('Headers synced:', result);
        return successResponse(res, 200, 'Headers updated in Google Sheet', result);
    } catch (error) {
        console.error('Error in syncHeaders:', error);
        throw error;
    }
});

/**
 * Extract and Sync Chat Data
 * POST /api/sheets/sync-chat
 */
export const syncChat = asyncHandler(async (req, res) => {
    const { chatJid } = req.body;
    const userId = req.userId;

    const user = await User.findById(userId);
    if (!user.sheetsConfig || !user.sheetsConfig.spreadsheetId) {
        throw new Error('Sheets not configured');
    }

    // 1. Extract Data using AI
    const extractedData = await aiService.extractData(userId, chatJid, user.sheetsConfig.columns);

    // 2. Append to Sheet
    const appendResult = await sheetsService.appendRow(userId, extractedData);

    return successResponse(res, 200, 'Data extracted and synced successfully', {
        extractedData,
        sheetUpdate: appendResult
    });
});
