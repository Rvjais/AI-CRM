import mongoose from 'mongoose';

const campaignJobSchema = new mongoose.Schema(
    {
        campaignId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Campaign',
            required: true,
            index: true,
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        contactId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Contact',
            required: true,
        },
        // Snapshot of contact details at creation time
        toName: { type: String },
        toPhone: { type: String },
        toEmail: { type: String },

        status: {
            type: String,
            enum: ['PENDING', 'PROCESSING', 'SENT', 'FAILED', 'SKIPPED'],
            default: 'PENDING',
            index: true,
        },
        sentAt: {
            type: Date,
        },
        error: {
            type: String,
        },
        messageId: {
            type: String, // WhatsApp Message ID or Email ID
        }
    },
    {
        timestamps: true,
    }
);

// Compound index for efficient queuing per campaign
campaignJobSchema.index({ campaignId: 1, status: 1 });

export default campaignJobSchema;
