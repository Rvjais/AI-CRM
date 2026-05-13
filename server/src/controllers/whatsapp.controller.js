import * as whatsappService from '../services/whatsapp.service.js';
import WhatsAppSession from '../models/WhatsAppSession.js';
import { successResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import logger from '../utils/logger.util.js';

/**
 * WhatsApp controller
 * Handles WhatsApp connection endpoints
 */

/** POST /api/whatsapp/connect */
export const connect = asyncHandler(async (req, res) => {
    const io = req.app.get('io');
    const result = await whatsappService.connectWhatsApp(req.userId, io);
    return successResponse(res, 200, 'WhatsApp connection initiated', result);
});

/** GET /api/whatsapp/qr */
export const getQRCode = asyncHandler(async (req, res) => {
    const { getClientModels } = await import('../utils/database.factory.js');
    const { WhatsAppSession } = await getClientModels(req.userId);
    const session = await WhatsAppSession.findOne({ userId: req.userId });
    if (!session || !session.qrCode) {
        return successResponse(res, 200, 'No QR code available', { qrCode: null });
    }
    return successResponse(res, 200, 'QR code retrieved', { qrCode: session.qrCode });
});

/** POST /api/whatsapp/pairing-code */
export const requestPairingCode = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.body;
    const io = req.app.get('io');

    // Ensure socket is initialized first
    if (!whatsappService.isConnected(req.userId)) {
        await whatsappService.connectWhatsApp(req.userId, io);
        // Give a moment for socket to initialize
        await new Promise(r => setTimeout(r, 2000));
    }

    const code = await whatsappService.requestPairingCode(req.userId, phoneNumber);
    return successResponse(res, 200, 'Pairing code generated', { code });
});

/** POST /api/whatsapp/disconnect */
export const disconnect = asyncHandler(async (req, res) => {
    await whatsappService.disconnectWhatsApp(req.userId);
    return successResponse(res, 200, 'WhatsApp disconnected successfully');
});

/** GET /api/whatsapp/status */
export const getStatus = asyncHandler(async (req, res) => {
    const { getClientModels } = await import('../utils/database.factory.js');
    const { WhatsAppSession } = await getClientModels(req.userId);
    const session = await WhatsAppSession.findOne({ userId: req.userId });

    const isAuthenticating = whatsappService.isConnected(req.userId);
    const isTrulyConnected = session?.status === 'connected';

    return successResponse(res, 200, 'Status retrieved', {
        connected: isTrulyConnected,
        status: session?.status || 'disconnected',
        phoneNumber: session?.phoneNumber || null,
        lastConnected: session?.lastConnected || null,
        isAuthenticating
    });
});

/** GET /api/whatsapp/phone-info */
export const getPhoneInfo = asyncHandler(async (req, res) => {
    const sock = whatsappService.getConnection(req.userId);
    if (!sock || !sock.user) {
        return successResponse(res, 200, 'Not connected', { phoneInfo: null });
    }
    return successResponse(res, 200, 'Phone info retrieved', {
        phoneNumber: sock.user.id.split(':')[0],
        name: sock.user.name || '',
    });
});

/** POST /api/whatsapp/logout-devices */
export const logoutDevices = asyncHandler(async (req, res) => {
    const sock = whatsappService.getConnection(req.userId);
    if (sock) await sock.logout();
    return successResponse(res, 200, 'Logged out from all devices');
});

/** POST /api/whatsapp/reject-call */
export const rejectCall = asyncHandler(async (req, res) => {
    const { callId, callFrom } = req.body;
    await whatsappService.rejectCall(req.userId, callId, callFrom);
    return successResponse(res, 200, 'Call rejected');
});

/** POST /api/whatsapp/presence/subscribe */
export const subscribePresence = asyncHandler(async (req, res) => {
    const { jid } = req.body;
    await whatsappService.presenceSubscribe(req.userId, jid);
    return successResponse(res, 200, 'Subscribed to presence');
});

/** POST /api/whatsapp/presence/update */
export const updatePresence = asyncHandler(async (req, res) => {
    const { presence, jid } = req.body;
    await whatsappService.sendPresenceUpdate(req.userId, presence, jid);
    return successResponse(res, 200, 'Presence updated');
});

/** POST /api/whatsapp/read-messages */
export const readMessages = asyncHandler(async (req, res) => {
    const { keys } = req.body; // array of WAMessageKey objects
    await whatsappService.readMessages(req.userId, keys);
    return successResponse(res, 200, 'Messages marked as read on WhatsApp');
});

/** GET /api/whatsapp/check/:phoneNumber */
export const checkOnWhatsApp = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.params;
    const jid = `${phoneNumber}@s.whatsapp.net`;
    const result = await whatsappService.checkOnWhatsApp(req.userId, jid);
    return successResponse(res, 200, 'Check complete', { exists: result?.exists || false, jid: result?.jid });
});

/** GET /api/whatsapp/profile-picture/:jid */
export const getProfilePicture = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const url = await whatsappService.fetchProfilePicture(req.userId, decodeURIComponent(jid));
    return successResponse(res, 200, 'Profile picture fetched', { url });
});

/** GET /api/whatsapp/status-text/:jid */
export const getStatusText = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const status = await whatsappService.fetchStatus(req.userId, decodeURIComponent(jid));
    return successResponse(res, 200, 'Status fetched', { status });
});

/** GET /api/whatsapp/business-profile/:jid */
export const getBusinessProfile = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const profile = await whatsappService.getBusinessProfile(req.userId, decodeURIComponent(jid));
    return successResponse(res, 200, 'Business profile fetched', profile);
});

/** PUT /api/whatsapp/profile/status */
export const updateProfileStatus = asyncHandler(async (req, res) => {
    const { status } = req.body;
    await whatsappService.updateProfileStatus(req.userId, status);
    return successResponse(res, 200, 'Profile status updated');
});

/** PUT /api/whatsapp/profile/name */
export const updateProfileName = asyncHandler(async (req, res) => {
    const { name } = req.body;
    await whatsappService.updateProfileName(req.userId, name);
    return successResponse(res, 200, 'Profile name updated');
});

/** POST /api/whatsapp/profile/picture */
export const updateProfilePicture = asyncHandler(async (req, res) => {
    // Expect image as base64 in body
    const { imageBase64, jid } = req.body;
    const buffer = Buffer.from(imageBase64, 'base64');
    const targetJid = jid || `${whatsappService.getConnection(req.userId)?.user?.id?.split(':')[0]}@s.whatsapp.net`;
    await whatsappService.updateProfilePicture(req.userId, targetJid, buffer);
    return successResponse(res, 200, 'Profile picture updated');
});

/** DELETE /api/whatsapp/profile/picture */
export const removeProfilePicture = asyncHandler(async (req, res) => {
    const sock = whatsappService.getConnection(req.userId);
    const selfJid = sock?.user?.id;
    if (!selfJid) throw new Error('Not connected');
    await whatsappService.removeProfilePicture(req.userId, selfJid);
    return successResponse(res, 200, 'Profile picture removed');
});

/** POST /api/whatsapp/block */
export const blockUser = asyncHandler(async (req, res) => {
    const { jid } = req.body;
    await whatsappService.updateBlockStatus(req.userId, jid, 'block');
    return successResponse(res, 200, 'User blocked');
});

/** POST /api/whatsapp/unblock */
export const unblockUser = asyncHandler(async (req, res) => {
    const { jid } = req.body;
    await whatsappService.updateBlockStatus(req.userId, jid, 'unblock');
    return successResponse(res, 200, 'User unblocked');
});

/** GET /api/whatsapp/blocklist */
export const getBlocklist = asyncHandler(async (req, res) => {
    const list = await whatsappService.fetchBlocklist(req.userId);
    return successResponse(res, 200, 'Block list retrieved', { list });
});

/** GET /api/whatsapp/privacy */
export const getPrivacySettings = asyncHandler(async (req, res) => {
    const settings = await whatsappService.fetchPrivacySettings(req.userId);
    return successResponse(res, 200, 'Privacy settings retrieved', settings);
});

/** PUT /api/whatsapp/privacy */
export const updatePrivacySettings = asyncHandler(async (req, res) => {
    const { type, value } = req.body;
    const updateMap = {
        lastSeen: whatsappService.updateLastSeenPrivacy,
        online: whatsappService.updateOnlinePrivacy,
        profilePicture: whatsappService.updateProfilePicturePrivacy,
        status: whatsappService.updateStatusPrivacy,
        readReceipts: whatsappService.updateReadReceiptsPrivacy,
        groupsAdd: whatsappService.updateGroupsAddPrivacy,
    };
    const fn = updateMap[type];
    if (!fn) throw new Error(`Unknown privacy type: ${type}`);
    await fn(req.userId, value);
    return successResponse(res, 200, `Privacy setting '${type}' updated`);
});

/** PUT /api/whatsapp/privacy/disappearing */
export const updateDefaultDisappearing = asyncHandler(async (req, res) => {
    const { ephemeral } = req.body; // seconds: 0, 86400, 604800, 7776000
    await whatsappService.updateDefaultDisappearingMode(req.userId, ephemeral);
    return successResponse(res, 200, 'Default disappearing mode updated');
});

/** POST /api/whatsapp/chat-modify */
export const chatModify = asyncHandler(async (req, res) => {
    const { modification, jid } = req.body;
    await whatsappService.chatModify(req.userId, modification, jid);
    return successResponse(res, 200, 'Chat modified');
});

/** GET /api/whatsapp/broadcast/:broadcastJid */
export const getBroadcastInfo = asyncHandler(async (req, res) => {
    const { broadcastJid } = req.params;
    const info = await whatsappService.getBroadcastListInfo(req.userId, broadcastJid);
    return successResponse(res, 200, 'Broadcast info retrieved', info);
});
