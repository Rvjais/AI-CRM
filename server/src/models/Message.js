import mongoose from 'mongoose';
import { MESSAGE_TYPES, MESSAGE_STATUS } from '../config/constants.js';

/**
 * Message Schema
 * Stores all WhatsApp messages with media and metadata
 */

const reactionSchema = new mongoose.Schema({
    emoji: { type: String, required: true },
    fromJid: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });

const messageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        messageId: {
            type: String,
            required: true,
        },
        chatJid: {
            type: String,
            required: true,
            index: true,
        },
        fromMe: {
            type: Boolean,
            required: true,
            default: false,
        },
        type: {
            type: String,
            enum: Object.values(MESSAGE_TYPES),
            required: true,
            default: MESSAGE_TYPES.TEXT,
        },
        content: {
            text: String,
            mediaUrl: String,
            url: String, // Add this line
            caption: String,
            mimeType: String,
            fileName: String,
            thumbnail: String,
            // Sticker
            sticker: {
                url: String,
            },
            // Location
            latitude: Number,
            longitude: Number,
            // Contact
            contactName: String,
            contactNumber: String,
        },
        status: {
            type: String,
            enum: Object.values(MESSAGE_STATUS),
            default: MESSAGE_STATUS.PENDING,
        },
        senderName: {
            type: String,
            trim: true,
        },
        senderPn: {
            type: String,
            trim: true,
        },
        timestamp: {
            type: Date,
            default: Date.now,
            index: true,
        },
        quotedMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
        },
        mentions: [String],
        isForwarded: {
            type: Boolean,
            default: false,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
        reactions: [reactionSchema],
    },
    {
        timestamps: true,
    }
);

// Compound indexes for efficient queries
messageSchema.index({ userId: 1, chatJid: 1, timestamp: -1 });
messageSchema.index({ userId: 1, timestamp: -1 });
messageSchema.index({ messageId: 1, userId: 1 });

const Message = mongoose.model('Message', messageSchema);

export default Message;
