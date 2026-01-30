import mongoose from 'mongoose';
import { MEDIA_TYPES } from '../config/constants.js';

/**
 * Media Schema
 * Stores media metadata and Cloudinary URLs
 */

const mediaSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            index: true,
        },
        messageId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Message',
            index: true,
        },
        cloudinaryId: {
            type: String,
            required: true,
        },
        url: {
            type: String,
            required: true,
        },
        secureUrl: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            enum: Object.values(MEDIA_TYPES),
            required: true,
        },
        format: {
            type: String,
        },
        size: {
            type: Number, // Bytes
        },
        dimensions: {
            width: Number,
            height: Number,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes
mediaSchema.index({ userId: 1, createdAt: -1 });
mediaSchema.index({ messageId: 1 });
mediaSchema.index({ cloudinaryId: 1 });

const Media = mongoose.model('Media', mediaSchema);

export default Media;
