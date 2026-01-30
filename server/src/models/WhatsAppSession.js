import mongoose from 'mongoose';
import { CONNECTION_STATUS } from '../config/constants.js';

/**
 * WhatsApp Session Schema
 * Stores encrypted WhatsApp authentication state
 */

const whatsappSessionSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
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
whatsappSessionSchema.index({ userId: 1 });
whatsappSessionSchema.index({ status: 1 });

const WhatsAppSession = mongoose.model('WhatsAppSession', whatsappSessionSchema);

export default WhatsAppSession;
