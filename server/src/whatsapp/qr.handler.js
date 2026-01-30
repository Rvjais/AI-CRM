import QRCode from 'qrcode';
import logger from '../utils/logger.util.js';

/**
 * QR code handler
 * Generates QR codes for WhatsApp connection
 */

/**
 * Generate QR code as base64 data URL
 * @param {String} qrText - QR code text from Baileys
 * @returns {String} Base64 data URL
 */
export const generateQRCode = async (qrText) => {
    try {
        const qrCodeDataURL = await QRCode.toDataURL(qrText, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#FFFFFF',
            },
        });

        logger.info('QR code generated successfully');
        return qrCodeDataURL;
    } catch (error) {
        logger.error('QR code generation error:', error);
        throw new Error(`Failed to generate QR code: ${error.message}`);
    }
};

/**
 * Generate QR code as buffer (for terminal display)
 * @param {String} qrText - QR code text from Baileys
 * @returns {Buffer} QR code buffer
 */
export const generateQRBuffer = async (qrText) => {
    try {
        const qrBuffer = await QRCode.toBuffer(qrText, {
            width: 300,
            margin: 2,
        });

        return qrBuffer;
    } catch (error) {
        logger.error('QR buffer generation error:', error);
        throw error;
    }
};
