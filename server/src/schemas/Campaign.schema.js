import mongoose from 'mongoose';

const campaignSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
        },
        type: {
            type: String,
            enum: ['WHATSAPP', 'EMAIL'],
            required: true,
        },
        status: {
            type: String,
            enum: ['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'PAUSED', 'FAILED'],
            default: 'DRAFT',
            index: true,
        },
        // Targeting
        targetBatchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ImportBatch',
        },
        targetTags: [{
            type: String,
            index: true,
        }],

        // Content Template
        template: {
            subject: { type: String }, // Email only
            body: { type: String, required: true },
            mediaUrl: { type: String }, // WhatsApp only
            mediaType: { type: String }, // 'image', 'video', 'document'
        },

        // Stats
        stats: {
            total: { type: Number, default: 0 },
            sent: { type: Number, default: 0 },
            failed: { type: Number, default: 0 },
            read: { type: Number, default: 0 }, // WhatsApp only
            delivered: { type: Number, default: 0 },
        },

        scheduleTime: {
            type: Date,
        },
        completedAt: {
            type: Date,
        },
        error: {
            type: String,
        }
    },
    {
        timestamps: true,
    }
);

export default campaignSchema;
