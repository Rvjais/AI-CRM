import mongoose from 'mongoose';

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
        // CRM Fields
        email: {
            type: String,
            trim: true,
            lowercase: true,
            index: true,
        },
        tags: [{
            type: String,
            trim: true,
            index: true,
        }],
        customAttributes: {
            type: Map,
            of: String,
            default: {}
        },
        source: {
            type: String,
            default: 'WHATSAPP', // 'WHATSAPP', 'IMPORT', 'MANUAL'
        },
        importBatchId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ImportBatch',
        },
    },
    {
        timestamps: true,
    }
);

contactSchema.index({ userId: 1, jid: 1 }, { unique: true });

export default contactSchema;
