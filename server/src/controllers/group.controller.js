import Group from '../models/Group.js';
import * as whatsappService from '../services/whatsapp.service.js';
import { successResponse, createdResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Group controller
 * Handles group management endpoints
 */

/**
 * Create group
 * POST /api/groups/create
 */
export const createGroup = asyncHandler(async (req, res) => {
    const { name, participants, description } = req.body;
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    // Create group on WhatsApp
    const result = await sock.groupCreate(name, participants);

    // Save to database
    const group = await Group.create({
        userId: req.userId,
        groupJid: result.id,
        name,
        description,
        participants: participants.map(jid => ({ jid, role: 'member' })),
    });

    return createdResponse(res, 'Group created successfully', group);
});

/**
 * Get all groups
 * GET /api/groups/
 */
export const getAllGroups = asyncHandler(async (req, res) => {
    const groups = await Group.find({ userId: req.userId }).sort({ createdAt: -1 });

    return successResponse(res, 200, 'Groups retrieved successfully', groups);
});

/**
 * Get group details
 * GET /api/groups/:groupJid
 */
export const getGroupDetails = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;

    const group = await Group.findOne({ userId: req.userId, groupJid });

    if (!group) {
        throw new Error('Group not found');
    }

    return successResponse(res, 200, 'Group retrieved successfully', group);
});

/**
 * Update group settings
 * PUT /api/groups/:groupJid
 */
export const updateGroupSettings = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const updates = req.body;

    const group = await Group.findOneAndUpdate(
        { userId: req.userId, groupJid },
        updates,
        { new: true }
    );

    return successResponse(res, 200, 'Group updated successfully', group);
});

/**
 * Leave group
 * DELETE /api/groups/:groupJid/leave
 */
export const leaveGroup = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (sock) {
        await sock.groupLeave(groupJid);
    }

    await Group.findOneAndDelete({ userId: req.userId, groupJid });

    return successResponse(res, 200, 'Left group successfully');
});

/**
 * Manage participants (add/remove)
 * POST /api/groups/:groupJid/participants
 */
export const manageParticipants = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const { action, participants } = req.body;
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    if (action === 'add') {
        await sock.groupParticipantsUpdate(groupJid, participants, 'add');

        // Update database
        await Group.findOneAndUpdate(
            { userId: req.userId, groupJid },
            {
                $addToSet: {
                    participants: { $each: participants.map(jid => ({ jid, role: 'member' })) },
                },
            }
        );
    } else if (action === 'remove') {
        await sock.groupParticipantsUpdate(groupJid, participants, 'remove');

        // Update database
        await Group.findOneAndUpdate(
            { userId: req.userId, groupJid },
            {
                $pull: { participants: { jid: { $in: participants } } },
            }
        );
    }

    return successResponse(res, 200, `Participants ${action}ed successfully`);
});

/**
 * Promote to admin
 * PUT /api/groups/:groupJid/participants/:jid/promote
 */
export const promoteToAdmin = asyncHandler(async (req, res) => {
    const { groupJid, jid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (sock) {
        await sock.groupParticipantsUpdate(groupJid, [jid], 'promote');
    }

    await Group.findOneAndUpdate(
        { userId: req.userId, groupJid, 'participants.jid': jid },
        { $set: { 'participants.$.role': 'admin' } }
    );

    return successResponse(res, 200, 'Participant promoted to admin');
});

/**
 * Demote from admin
 * PUT /api/groups/:groupJid/participants/:jid/demote
 */
export const demoteFromAdmin = asyncHandler(async (req, res) => {
    const { groupJid, jid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (sock) {
        await sock.groupParticipantsUpdate(groupJid, [jid], 'demote');
    }

    await Group.findOneAndUpdate(
        { userId: req.userId, groupJid, 'participants.jid': jid },
        { $set: { 'participants.$.role': 'member' } }
    );

    return successResponse(res, 200, 'Participant demoted from admin');
});

/**
 * Get group invite code
 * GET /api/groups/:groupJid/invite-code
 */
export const getInviteCode = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    const code = await sock.groupInviteCode(groupJid);

    return successResponse(res, 200, 'Invite code retrieved', { code });
});

/**
 * Revoke group invite code
 * POST /api/groups/:groupJid/revoke-code
 */
export const revokeInviteCode = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    await sock.groupRevokeInvite(groupJid);

    return successResponse(res, 200, 'Invite code revoked');
});

/**
 * Join group via invite code
 * POST /api/groups/join/:code
 */
export const joinGroup = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    if (!sock) {
        throw new Error('WhatsApp not connected');
    }

    const result = await sock.groupAcceptInvite(code);

    return successResponse(res, 200, 'Joined group successfully', { groupJid: result });
});
