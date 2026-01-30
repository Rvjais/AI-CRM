import { uploadToCloudinary, getMediaByMessageId, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { successResponse, createdResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * Media controller
 * Handles media upload/download endpoints
 */

/**
 * Upload media to Cloudinary
 * POST /api/media/upload
 */
export const uploadMedia = asyncHandler(async (req, res) => {
    if (!req.file) {
        throw new Error('No file uploaded');
    }

    const { buffer, originalname, mimetype } = req.file;

    const media = await uploadToCloudinary(
        buffer,
        originalname,
        mimetype,
        req.userId
    );

    return createdResponse(res, 'Media uploaded successfully', media);
});

/**
 * Get media by message ID
 * GET /api/media/:messageId
 */
export const getMediaByMessage = asyncHandler(async (req, res) => {
    const { messageId } = req.params;

    const media = await getMediaByMessageId(messageId);

    if (!media) {
        throw new Error('Media not found');
    }

    return successResponse(res, 200, 'Media retrieved successfully', media);
});

/**
 * Delete media
 * DELETE /api/media/:mediaId
 */
export const deleteMedia = asyncHandler(async (req, res) => {
    const { mediaId } = req.params;
    const Media = (await import('../models/Media.js')).default;

    const media = await Media.findOne({ _id: mediaId, userId: req.userId });

    if (!media) {
        throw new Error('Media not found');
    }

    // Delete from Cloudinary
    await deleteFromCloudinary(media.cloudinaryId, media.type);

    // Delete from database
    await media.deleteOne();

    return successResponse(res, 200, 'Media deleted successfully');
});

/**
 * Download media from WhatsApp message
 * POST /api/media/download
 */
export const downloadMedia = asyncHandler(async (req, res) => {
    // This would require downloading media from a WhatsApp message
    // and uploading to Cloudinary
    return successResponse(res, 501, 'Download not yet implemented');
});
