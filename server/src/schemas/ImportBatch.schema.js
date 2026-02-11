import mongoose from 'mongoose';

const importBatchSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        filename: {
            type: String,
            required: true,
        },
        originalName: {
            type: String,
        },
        type: {
            type: String,
            enum: ['WHATSAPP', 'EMAIL', 'BOTH'],
            default: 'WHATSAPP',
        },
        status: {
            type: String,
            enum: ['PROCESSING', 'COMPLETED', 'FAILED'],
            default: 'PROCESSING',
        },
        stats: {
            total: { type: Number, default: 0 },
            valid: { type: Number, default: 0 },
            duplicates: { type: Number, default: 0 },
            errors: { type: Number, default: 0 },
        },
        tags: [{
            type: String,
        }],
        errorLog: [{
            row: Number,
            error: String,
            data: String
        }]
    },
    {
        timestamps: true,
    }
);

export default importBatchSchema;
