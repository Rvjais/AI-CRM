import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        chatJid: {
            type: String,
            required: true,
        },
        isArchived: {
            type: Boolean,
            default: false,
        },
        isMuted: {
            type: Boolean,
            default: false,
        },
        mutedUntil: {
            type: Date,
        },
        isPinned: {
            type: Boolean,
            default: false,
        },
        unreadCount: {
            type: Number,
            default: 0,
        },
        extractedData: {
            type: Map,
            of: String,
            default: {}
        },
        lastMessageAt: {
            type: Date,
        },
        isGroup: {
            type: Boolean,
            default: false,
        },
        aiEnabled: {
            type: Boolean,
            default: true,
        },
        sentiment: {
            type: String,
            enum: ['positive', 'neutral', 'negative'],
            default: 'neutral',
        },
        contactName: {
            type: String,
            trim: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        summary: {
            type: String,
            default: '',
        },
        suggestions: {
            type: [String],
            default: [],
        },
        lastSummaryAt: {
            type: Date,
            default: null,
        },
        category: {
            type: String,
            enum: ['normal', 'campaign', 'archived', 'group'],
            default: 'normal',
            index: true
        }
    },
    {
        timestamps: true,
    }
);

// Compound index for unique chat per user
chatSchema.index({ userId: 1, chatJid: 1 }, { unique: true });
chatSchema.index({ userId: 1, isArchived: 1, lastMessageAt: -1 });
chatSchema.index({ userId: 1, sentiment: 1 });

export default chatSchema;
