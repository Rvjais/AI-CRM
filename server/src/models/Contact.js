import mongoose from 'mongoose';

/**
 * Contact Schema
 * Stores WhatsApp contacts for each user
 */

const contactSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        jid: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            trim: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        profilePicUrl: {
            type: String,
        },
        status: {
            type: String,
        },
        isBlocked: {
            type: Boolean,
            default: false,
        },
        lastSeen: {
            type: Date,
        },
        aiEnabled: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
    }
);

// Compound index for unique contact per user
contactSchema.index({ userId: 1, jid: 1 }, { unique: true });

const Contact = mongoose.model('Contact', contactSchema);

export default Contact;
