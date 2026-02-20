import { google } from 'googleapis';
import User from '../models/User.js';
import logger from '../utils/logger.util.js';
import { getGmailClient } from '../config/google.config.js'; // Reusing the client generator

/**
 * Get authenticated Sheets client
 */
const getSheetsClient = async (userId) => {
    const user = await User.findById(userId);
    if (!user || !user.gmailRefreshToken) { // Assuming we use same auth flow
        throw new Error('Google account not connected');
    }

    // Use the top-level google import
    const env = (await import('../config/env.js')).default;
    const oAuth2Client = new google.auth.OAuth2(
        env.GOOGLE_CLIENT_ID,
        env.GOOGLE_CLIENT_SECRET,
        env.GOOGLE_REDIRECT_URI
    );
    oAuth2Client.setCredentials({
        access_token: user.gmailAccessToken,
        refresh_token: user.gmailRefreshToken
    });

    return google.sheets({ version: 'v4', auth: oAuth2Client });
};

/**
 * Sync extracted chat data to sheet
 * @param {string} userId
 * @param {string} chatJid
 * @param {object} extractedData
 */
export const syncChatToSheet = async (userId, chatJid, extractedData) => {
    try {
        const user = await User.findById(userId);
        if (!user.sheetsConfig || !user.sheetsConfig.spreadsheetId) {
            console.warn(`[Sync] Sheets not configured for user ${userId}`);
            return;
        }

        // AUTOMATICALLY ADD 'PHONE' COLUMN IF MISSING
        let columns = user.sheetsConfig.columns || [];
        const phoneColExists = columns.some(c => c.key.toLowerCase().includes('phone') || c.key.toLowerCase() === 'number');

        if (!phoneColExists) {
            console.log(`[Sync] 'Phone' column missing for user ${userId}. Auto-adding...`);

            // Add new column definition
            user.sheetsConfig.columns.push({
                key: 'phone',
                header: 'Phone Number',
                description: 'Sender Phone Number (Auto-Added)'
            });

            // Save user config
            await user.save();

            // Update local columns variable
            columns = user.sheetsConfig.columns;

            // Sync headers to Sheet immediately
            await updateSheetHeaders(userId);
            console.log(`[Sync] Added 'Phone Number' column and updated Sheet headers.`);
        }

        // Prepare row data
        const enrichedData = {
            ...extractedData,
            'chat_id': chatJid,
            'timestamp': new Date().toISOString(),
            'phone': chatJid.split('@')[0] // Always ensure phone is populated from JID
        };

        // IDENTIFY UNIQUE KEY COLUMN (prefer 'phone' or 'number')
        const phoneColIndex = columns.findIndex(c =>
            c.key.toLowerCase().includes('phone') ||
            c.key.toLowerCase().includes('number')
        );

        if (phoneColIndex === -1) {
            // No unique identifier column? Fallback to append, but warn
            console.warn('[Sync] No phone/number column found to dedup. Appending.');
        } else {
            // We found a phone column. We no longer deduplicate here as per user request
            // We just append a new row for every new extraction.
            console.log(`[Sync] Appending new row for ${enrichedData.phone}`);
        }

        // Always append new row based on user request instead of updating the existing one
        await appendRow(userId, enrichedData);

        return true;

    } catch (error) {
        console.error('Error syncing chat to sheet:', error);
        throw error;
    }
};

/**
 * Get data for a specific row
 */
const getRow = async (userId, rowIndex) => {
    const user = await User.findById(userId);
    const sheets = await getSheetsClient(userId);
    const { spreadsheetId, sheetName } = user.sheetsConfig;

    // rowIndex is 0-indexed (array index), Sheet is 1-indexed.
    const rowNum = rowIndex + 1;

    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!A${rowNum}:${rowNum}`, // Get entire row (unbounded end column, or reasonably large)
    });

    return result.data.values ? result.data.values[0] : [];
};

/**
 * Find the row index of a specific value in a column
 */
const findRowIndex = async (userId, colIndex, valueToFind) => {
    if (!valueToFind) return -1;

    const sheets = await getSheetsClient(userId);
    const user = await User.findById(userId);
    const { spreadsheetId, sheetName } = user.sheetsConfig;

    // Fetch the specific column data
    // Converting colIndex 0 -> A, 1 -> B, etc.
    // Note: This simple conversion works for A-Z. For AA+, it needs better logic.
    // Assuming columns < 26 for now.
    const colLetter = String.fromCharCode(65 + colIndex);

    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!${colLetter}:${colLetter}`,
    });

    const rows = result.data.values;
    if (!rows || rows.length === 0) return -1;

    // Search for value (fuzzy match for phone numbers)
    return rows.findIndex(row => {
        const cellVal = row[0] ? String(row[0]).replace(/\D/g, '') : '';
        const searchVal = String(valueToFind).replace(/\D/g, '');
        return cellVal === searchVal && cellVal.length > 5;
    });
};

/**
 * Update a specific row
 */
export const updateRow = async (userId, rowIndex, rowData) => {
    const user = await User.findById(userId);
    const sheets = await getSheetsClient(userId);
    const { spreadsheetId, sheetName, columns } = user.sheetsConfig;

    // Map rowData to the correct column order
    const values = columns.map(col => {
        const cleanColKey = col.key.trim();
        if (rowData[cleanColKey]) return rowData[cleanColKey];
        const key = Object.keys(rowData).find(k => k.toLowerCase() === cleanColKey.toLowerCase());
        return key ? rowData[key] : '';
    });

    // rowIndex is 0-indexed from the API array, but Sheets is 1-indexed.
    // +1 because API array starts at 0.
    const startRow = rowIndex + 1;

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!A${startRow}`,
        valueInputOption: 'USER_ENTERED',
        resource: { values: [values] }
    });
};

/**
 * Append a row to the sheet
 * @param {string} userId 
 * @param {object} rowData - Key-value pair matching column keys
 */
export const appendRow = async (userId, rowData) => {
    const user = await User.findById(userId);
    if (!user.sheetsConfig || !user.sheetsConfig.spreadsheetId) {
        throw new Error('Sheets configuration missing');
    }

    const sheets = await getSheetsClient(userId);
    const { spreadsheetId, sheetName, columns } = user.sheetsConfig;

    if (!columns || columns.length === 0) {
        console.warn('No columns configured, cannot map data to sheet.');
        return;
    }

    // Map rowData to the correct column order
    // Ensure we handle missing keys gracefully with empty string
    const values = columns.map(col => {
        const cleanColKey = col.key.trim(); // Handle trailing spaces in config

        // Try exact match with clean key
        if (rowData[cleanColKey]) return rowData[cleanColKey];

        // Try case-insensitive match
        const key = Object.keys(rowData).find(k => k.toLowerCase() === cleanColKey.toLowerCase());
        return key ? rowData[key] : '';
    });

    const resource = {
        values: [values],
    };

    const result = await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}!A1`, // Append after last row
        valueInputOption: 'USER_ENTERED',
        resource,
    });

    return result.data;
};


/**
 * Get headers from the sheet to verify/sync
 * @param {string} userId 
 */
export const getSheetHeaders = async (userId) => {
    const user = await User.findById(userId);
    if (!user.sheetsConfig || !user.sheetsConfig.spreadsheetId) {
        throw new Error('Sheets configuration missing');
    }

    const sheets = await getSheetsClient(userId);
    const { spreadsheetId, sheetName } = user.sheetsConfig;

    const result = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${sheetName}!1:1`, // First row
    });

    return result.data.values ? result.data.values[0] : [];
};

/**
 * Update headers in the sheet based on config
 * @param {string} userId 
 */
export const updateSheetHeaders = async (userId) => {
    const user = await User.findById(userId);
    const sheets = await getSheetsClient(userId);
    const { spreadsheetId, sheetName, columns } = user.sheetsConfig;

    const headerValues = columns.map(col => col.header);

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${sheetName}!1:1`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [headerValues]
        }
    });

    return headerValues;
};
