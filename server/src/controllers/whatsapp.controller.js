import * as whatsappService from '../services/whatsapp.service.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import { successResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * WhatsApp controller
 * Handles WhatsApp connection endpoints
 */

/**
 * Initialize WhatsApp connection
 * POST /api/whatsapp/connect
 */
export const connect = asyncHandler(async (req, res) => {
    const io = req.app.get('io');

    const result = await whatsappService.connectWhatsApp(req.userId, io);

    return successResponse(res, 200, 'WhatsApp connection initiated', result);
});

/**
 * Get current QR code
 * GET /api/whatsapp/qr
 */
export const getQRCode = asyncHandler(async (req, res) => {
    const session = await WhatsAppSession.findOne({ userId: req.userId });

    if (!session || !session.qrCode) {
        return successResponse(res, 200, 'No QR code available', { qrCode: null });
    }

    return successResponse(res, 200, 'QR code retrieved', { qrCode: session.qrCode });
});

/**
 * Request pairing code
 * POST /api/whatsapp/pairing-code
 */
export const requestPairingCode = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;

    // This would require additional Baileys logic for pairing code
    // For now, return not implemented
    return successResponse(res, 501, 'Pairing code not yet implemented');
});

/**
 * Disconnect WhatsApp
 * POST /api/whatsapp/disconnect
 */
export const disconnect = asyncHandler(async (req, res) => {
    await whatsappService.disconnectWhatsApp(req.userId);

    return successResponse(res, 200, 'WhatsApp disconnected successfully');
});

/**
 * Get connection status
 * GET /api/whatsapp/status
 */
export const getStatus = asyncHandler(async (req, res) => {
    const session = await WhatsAppSession.findOne({ userId: req.userId });

    // Check real connection status from session
    const isAuthenticating = whatsappService.isConnected(req.userId);
    const isTrulyConnected = session?.status === 'connected';

    const status = {
        connected: isTrulyConnected,
        status: session?.status || 'disconnected',
        phoneNumber: session?.phoneNumber || null,
        lastConnected: session?.lastConnected || null,
        isAuthenticating // helper flag if needed
    };

    return successResponse(res, 200, 'Status retrieved', status);
});

/**
 * Get connected phone info
 * GET /api/whatsapp/phone-info
 */
export const getPhoneInfo = asyncHandler(async (req, res) => {
    const sock = whatsappService.getConnection(req.userId);

    if (!sock || !sock.user) {
        return successResponse(res, 200, 'Not connected', { phoneInfo: null });
    }

    const phoneInfo = {
        phoneNumber: sock.user.id.split(':')[0],
        name: sock.user.name || '',
    };

    return successResponse(res, 200, 'Phone info retrieved', phoneInfo);
});

/**
 * Logout from all devices
 * POST /api/whatsapp/logout-devices
 */
export const logoutDevices = asyncHandler(async (req, res) => {
    const sock = whatsappService.getConnection(req.userId);

    if (sock) {
        await sock.logout();
    }

    return successResponse(res, 200, 'Logged out from all devices');
});
