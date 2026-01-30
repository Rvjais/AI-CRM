import mongoose from 'mongoose';
import { PARTICIPANT_ROLES } from '../config/constants.js';

/**
 * Group Schema
 * Stores WhatsApp group information
 */

const participantSchema = new mongoose.Schema({
    jid: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        enum: Object.values(PARTICIPANT_ROLES),
        default: PARTICIPANT_ROLES.MEMBER,
    },
    joinedAt: {
        type: Date,
        default: Date.now,
    },
}, { _id: false });

const groupSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        groupJid: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        profilePicUrl: {
            type: String,
        },
        participants: [participantSchema],
        settings: {
            onlyAdminsCanSend: {
                type: Boolean,
                default: false,
            },
            onlyAdminsCanEdit: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for unique group per user
groupSchema.index({ userId: 1, groupJid: 1 }, { unique: true });

const Group = mongoose.model('Group', groupSchema);

export default Group;
