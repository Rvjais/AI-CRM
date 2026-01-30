import Contact from '../models/Contact.js';
import * as whatsappService from '../services/whatsapp.service.js';
import { successResponse, createdResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Contact controller
 * Handles contact management endpoints
 */

/**
 * Get all contacts
 * GET /api/contacts/
 */
export const getAllContacts = asyncHandler(async (req, res) => {
    const contacts = await Contact.find({ userId: req.userId }).sort({ name: 1 });

    return successResponse(res, 200, 'Contacts retrieved successfully', contacts);
});

/**
 * Get contact details
 * GET /api/contacts/:jid
 */
export const getContactDetails = asyncHandler(async (req, res) => {
    const { jid } = req.params;

    const contact = await Contact.findOne({ userId: req.userId, jid });

    if (!contact) {
        throw new Error('Contact not found');
    }

    return successResponse(res, 200, 'Contact retrieved successfully', contact);
});

/**
 * Sync contacts from WhatsApp
 * POST /api/contacts/sync
 */
export const syncContacts = asyncHandler(async (req, res) => {
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    // Get contacts from WhatsApp
    const contacts = Object.values(sock.store?.contacts || {});

    // Save to database
    for (const contact of contacts) {
        await Contact.findOneAndUpdate(
            { userId: req.userId, jid: contact.id },
            {
                name: contact.name || contact.notify || '',
                phoneNumber: contact.id.split('@')[0],
            },
            { upsert: true }
        );
    }

    return successResponse(res, 200, 'Contacts synced successfully', { count: contacts.length });
});

/**
 * Update contact
 * PUT /api/contacts/:jid
 */
export const updateContact = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const updates = req.body;

    const contact = await Contact.findOneAndUpdate(
        { userId: req.userId, jid },
        updates,
        { new: true, upsert: true }
    );

    return successResponse(res, 200, 'Contact updated successfully', contact);
});

/**
 * Delete contact
 * DELETE /api/contacts/:jid
 */
export const deleteContact = asyncHandler(async (req, res) => {
    const { jid } = req.params;

    await Contact.findOneAndDelete({ userId: req.userId, jid });

    return successResponse(res, 200, 'Contact deleted successfully');
});

/**
 * Block contact
 * POST /api/contacts/:jid/block
 */
export const blockContact = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (sock) {
        await sock.updateBlockStatus(jid, 'block');
    }

    await Contact.findOneAndUpdate(
        { userId: req.userId, jid },
        { isBlocked: true },
        { upsert: true }
    );

    return successResponse(res, 200, 'Contact blocked successfully');
});

/**
 * Unblock contact
 * POST /api/contacts/:jid/unblock
 */
export const unblockContact = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (sock) {
        await sock.updateBlockStatus(jid, 'unblock');
    }

    await Contact.findOneAndUpdate(
        { userId: req.userId, jid },
        { isBlocked: false }
    );

    return successResponse(res, 200, 'Contact unblocked successfully');
});

/**
 * Check if number exists on WhatsApp
 * GET /api/contacts/:jid/check
 */
export const checkContact = asyncHandler(async (req, res) => {
    const { phoneNumber } = req.query;
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    const [result] = await sock.onWhatsApp(phoneNumber);

    return successResponse(res, 200, 'Contact checked', {
        exists: !!result,
        jid: result?.jid,
    });
});
