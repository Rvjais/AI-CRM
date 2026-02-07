import mongoose from 'mongoose';
import { CONNECTION_STATUS } from '../config/constants.js';

const whatsappSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true, // Not unique per se if we have multiple sessions history? But logic implies unique.
            // In Client DB, userId is redundant but kept for schema consistency.
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        sessionData: {
            type: String, // Encrypted JSON string of auth state
            select: false,
        },
        qrCode: {
            type: String, // Base64 QR code
        },
        pairingCode: {
            type: String,
        },
        status: {
            type: String,
            enum: Object.values(CONNECTION_STATUS),
            default: CONNECTION_STATUS.DISCONNECTED,
        },
        lastConnected: {
            type: Date,
        },
        connectionAttempts: {
            type: Number,
            default: 0,
        },
        deviceInfo: {
            browser: {
                type: String,
                default: 'WhatsApp Business Platform',
            },
            version: {
                type: String,
                default: '1.0.0',
            },
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
whatsappSessionSchema.index({ userId: 1 }, { unique: true }); // Ensure one session doc per user
whatsappSessionSchema.index({ status: 1 });

export default whatsappSessionSchema;
