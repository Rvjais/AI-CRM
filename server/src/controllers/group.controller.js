import Group from '../models/Group.js';
import * as whatsappService from '../services/whatsapp.service.js';
import { successResponse, createdResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';
import logger from '../utils/logger.util.js';

/**
 * Group controller
 * Handles group management endpoints
 */

/** POST /api/groups/create */
export const createGroup = asyncHandler(async (req, res) => {
    const { name, participants, description } = req.body;
    const sock = whatsappService.getConnection(req.userId);
    if (!sock) throw new Error('WhatsApp not connected');

    const result = await sock.groupCreate(name, participants);

    const group = await Group.create({
        userId: req.userId,
        groupJid: result.id,
        name,
        description,
        participants: participants.map(jid => ({ jid, role: 'member' })),
    });

    return createdResponse(res, 'Group created successfully', group);
});

/** GET /api/groups/ */
export const getAllGroups = asyncHandler(async (req, res) => {
    const groups = await Group.find({ userId: req.userId }).sort({ createdAt: -1 });
    return successResponse(res, 200, 'Groups retrieved successfully', groups);
});

/** GET /api/groups/:groupJid */
export const getGroupDetails = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);

    let liveMetadata = null;
    if (sock) {
        try { liveMetadata = await sock.groupMetadata(groupJid); } catch (e) {}
    }

    const group = await Group.findOne({ userId: req.userId, groupJid });
    if (!group && !liveMetadata) throw new Error('Group not found');

    return successResponse(res, 200, 'Group retrieved successfully', liveMetadata || group);
});

/**
 * Update group settings — name, description, announce, locked
 * PUT /api/groups/:groupJid
 */
export const updateGroupSettings = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const { name, description, onlyAdminsCanSend, onlyAdminsCanEdit } = req.body;
    const sock = whatsappService.getConnection(req.userId);

    // Update subject on WhatsApp
    if (name && sock) {
        try { await sock.groupUpdateSubject(groupJid, name); }
        catch (e) { logger.warn('WA groupUpdateSubject failed:', e.message); }
    }

    // Update description on WhatsApp
    if (description && sock) {
        try { await sock.groupUpdateDescription(groupJid, description); }
        catch (e) { logger.warn('WA groupUpdateDescription failed:', e.message); }
    }

    // Update announce setting
    if (onlyAdminsCanSend !== undefined && sock) {
        try {
            await whatsappService.groupSettingUpdate(req.userId, groupJid, onlyAdminsCanSend ? 'announcement' : 'not_announcement');
        } catch (e) { logger.warn('WA groupSettingUpdate(announce) failed:', e.message); }
    }

    // Update locked setting (only admins can edit group info)
    if (onlyAdminsCanEdit !== undefined && sock) {
        try {
            await whatsappService.groupSettingUpdate(req.userId, groupJid, onlyAdminsCanEdit ? 'locked' : 'unlocked');
        } catch (e) { logger.warn('WA groupSettingUpdate(locked) failed:', e.message); }
    }

    const updates = {};
    if (name) updates.name = name;
    if (description) updates.description = description;
    if (onlyAdminsCanSend !== undefined) updates.onlyAdminsCanSend = onlyAdminsCanSend;
    if (onlyAdminsCanEdit !== undefined) updates.onlyAdminsCanEdit = onlyAdminsCanEdit;

    const group = await Group.findOneAndUpdate(
        { userId: req.userId, groupJid },
        updates,
        { new: true }
    );

    return successResponse(res, 200, 'Group updated successfully', group);
});

/** DELETE /api/groups/:groupJid/leave */
export const leaveGroup = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);
    if (sock) await sock.groupLeave(groupJid);
    await Group.findOneAndDelete({ userId: req.userId, groupJid });
    return successResponse(res, 200, 'Left group successfully');
});

/** POST /api/groups/:groupJid/participants */
export const manageParticipants = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const { action, participants } = req.body;
    const sock = whatsappService.getConnection(req.userId);
    if (!sock) throw new Error('WhatsApp not connected');

    if (action === 'add') {
        await sock.groupParticipantsUpdate(groupJid, participants, 'add');
        await Group.findOneAndUpdate(
            { userId: req.userId, groupJid },
            { $addToSet: { participants: { $each: participants.map(jid => ({ jid, role: 'member' })) } } }
        );
    } else if (action === 'remove') {
        await sock.groupParticipantsUpdate(groupJid, participants, 'remove');
        await Group.findOneAndUpdate(
            { userId: req.userId, groupJid },
            { $pull: { participants: { jid: { $in: participants } } } }
        );
    }

    return successResponse(res, 200, `Participants ${action}ed successfully`);
});

/** PUT /api/groups/:groupJid/participants/:jid/promote */
export const promoteToAdmin = asyncHandler(async (req, res) => {
    const { groupJid, jid } = req.params;
    const sock = whatsappService.getConnection(req.userId);
    if (sock) await sock.groupParticipantsUpdate(groupJid, [jid], 'promote');
    await Group.findOneAndUpdate(
        { userId: req.userId, groupJid, 'participants.jid': jid },
        { $set: { 'participants.$.role': 'admin' } }
    );
    return successResponse(res, 200, 'Participant promoted to admin');
});

/** PUT /api/groups/:groupJid/participants/:jid/demote */
export const demoteFromAdmin = asyncHandler(async (req, res) => {
    const { groupJid, jid } = req.params;
    const sock = whatsappService.getConnection(req.userId);
    if (sock) await sock.groupParticipantsUpdate(groupJid, [jid], 'demote');
    await Group.findOneAndUpdate(
        { userId: req.userId, groupJid, 'participants.jid': jid },
        { $set: { 'participants.$.role': 'member' } }
    );
    return successResponse(res, 200, 'Participant demoted from admin');
});

/** GET /api/groups/:groupJid/invite-code */
export const getInviteCode = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);
    if (!sock) throw new Error('WhatsApp not connected');
    const code = await sock.groupInviteCode(groupJid);
    return successResponse(res, 200, 'Invite code retrieved', { code });
});

/** POST /api/groups/:groupJid/revoke-code */
export const revokeInviteCode = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const sock = whatsappService.getConnection(req.userId);
    if (!sock) throw new Error('WhatsApp not connected');
    await sock.groupRevokeInvite(groupJid);
    return successResponse(res, 200, 'Invite code revoked');
});

/** POST /api/groups/join/:code */
export const joinGroup = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const sock = whatsappService.getConnection(req.userId);
    if (!sock) throw new Error('WhatsApp not connected');
    const result = await sock.groupAcceptInvite(code);
    return successResponse(res, 200, 'Joined group successfully', { groupJid: result });
});

/**
 * Get group info by invite code (without joining)
 * GET /api/groups/invite-info/:code
 */
export const getGroupByInviteCode = asyncHandler(async (req, res) => {
    const { code } = req.params;
    const info = await whatsappService.groupGetInviteInfo(req.userId, code);
    return successResponse(res, 200, 'Group info retrieved', info);
});

/**
 * Toggle ephemeral messages
 * POST /api/groups/:groupJid/ephemeral
 */
export const toggleEphemeral = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const { ephemeral } = req.body; // 0=off, 86400=1d, 604800=7d, 7776000=90d
    await whatsappService.groupToggleEphemeral(req.userId, groupJid, ephemeral);
    await Group.findOneAndUpdate({ userId: req.userId, groupJid }, { ephemeral });
    return successResponse(res, 200, 'Ephemeral setting updated');
});

/**
 * Change member-add mode
 * POST /api/groups/:groupJid/member-add-mode
 */
export const updateMemberAddMode = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const { mode } = req.body; // 'all_member_add' | 'admin_add'
    await whatsappService.groupMemberAddMode(req.userId, groupJid, mode);
    return successResponse(res, 200, 'Member add mode updated');
});

/**
 * Get pending join requests
 * GET /api/groups/:groupJid/join-requests
 */
export const getJoinRequests = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const list = await whatsappService.groupRequestParticipantsList(req.userId, groupJid);
    return successResponse(res, 200, 'Join requests retrieved', { list });
});

/**
 * Approve or reject join requests
 * POST /api/groups/:groupJid/join-requests
 */
export const handleJoinRequests = asyncHandler(async (req, res) => {
    const { groupJid } = req.params;
    const { participants, action } = req.body; // action: 'approve' | 'reject'
    const result = await whatsappService.groupRequestParticipantsUpdate(req.userId, groupJid, participants, action);
    return successResponse(res, 200, `Join requests ${action}d`, result);
});



