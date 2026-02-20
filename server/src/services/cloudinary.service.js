import { cloudinary } from '../config/cloudinary.js';
import { MEDIA_TYPES } from '../config/constants.js';
import logger from '../utils/logger.util.js';
import Media from '../models/Media.js';
import User from '../models/User.js';

/**
 * Cloudinary service for media upload/management
 */

/**
 * Upload file to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from multer
 * @param {String} fileName - Original filename
 * @param {String} mimeType - MIME type
 * @param {String} userId - User ID for folder organization
 * @param {String} messageId - Optional message ID
 * @returns {Object} Media document
 */
export const uploadToCloudinary = async (fileBuffer, fileName, mimeType, userId, messageId = null) => {
    try {
        // Determine resource type
        let resourceType = 'auto';
        let mediaType;

        if (mimeType.startsWith('image/')) {
            resourceType = 'image';
            mediaType = MEDIA_TYPES.IMAGE;
        } else if (mimeType.startsWith('video/')) {
            resourceType = 'video';
            mediaType = MEDIA_TYPES.VIDEO;
        } else if (mimeType.startsWith('audio/')) {
            resourceType = 'video'; // Cloudinary uses 'video' for audio
            mediaType = MEDIA_TYPES.AUDIO;
        } else {
            resourceType = 'raw';
            mediaType = MEDIA_TYPES.DOCUMENT;
        }

        // Fetch User's Cloudinary Credentials
        const user = await User.findById(userId).select('+cloudinaryConfig.apiSecret');
        const userConfig = user?.cloudinaryConfig;
        const hasUserConfig = userConfig && userConfig.cloudName && userConfig.apiKey && userConfig.apiSecret;

        let uploadOptions = {
            folder: `whatsapp/${userId}`,
            resource_type: resourceType,
            public_id: fileName.split('.')[0],
        };

        if (hasUserConfig) {
            uploadOptions.cloud_name = userConfig.cloudName;
            uploadOptions.api_key = userConfig.apiKey;
            uploadOptions.api_secret = userConfig.apiSecret;
        } else {
            logger.warn(`User ${userId} has no Cloudinary config. Falling back to global config.`);
        }

        // Upload to Cloudinary
        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                uploadOptions,
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            );

            uploadStream.end(fileBuffer);
        });

        // Create media record
        const media = await Media.create({
            userId,
            messageId,
            cloudinaryId: result.public_id,
            url: result.url,
            secureUrl: result.secure_url,
            type: mediaType,
            format: result.format,
            size: result.bytes,
            dimensions: {
                width: result.width,
                height: result.height,
            },
        });

        logger.info(`Media uploaded to Cloudinary: ${result.public_id}`);

        return media;
    } catch (error) {
        logger.error('Cloudinary upload error:', error);
        throw new Error(`Failed to upload media: ${error.message}`);
    }
};

/**
 * Delete media from Cloudinary
 * @param {String} cloudinaryId - Cloudinary public ID
 * @param {String} resourceType - Resource type (image, video, raw)
 * @param {String} userId - User ID to fetch user-specific Cloudinary credentials
 */
export const deleteFromCloudinary = async (cloudinaryId, resourceType = 'image', userId = null) => {
    try {
        let options = { resource_type: resourceType };

        if (userId) {
            const user = await User.findById(userId).select('+cloudinaryConfig.apiSecret');
            const userConfig = user?.cloudinaryConfig;
            if (userConfig && userConfig.cloudName && userConfig.apiKey && userConfig.apiSecret) {
                options.cloud_name = userConfig.cloudName;
                options.api_key = userConfig.apiKey;
                options.api_secret = userConfig.apiSecret;
            }
        }

        await cloudinary.uploader.destroy(cloudinaryId, options);
        logger.info(`Media deleted from Cloudinary: ${cloudinaryId}`);
    } catch (error) {
        logger.error('Cloudinary delete error:', error);
        throw new Error(`Failed to delete media: ${error.message}`);
    }
};

/**
 * Get media by message ID
 * @param {String} messageId - Message ID
 * @returns {Object} Media document
 */
export const getMediaByMessageId = async (messageId) => {
    return await Media.findOne({ messageId });
};

/**
 * Get user's media
 * @param {String} userId - User ID
 * @param {Number} limit - Limit
 * @returns {Array} Media documents
 */
export const getUserMedia = async (userId, limit = 50) => {
    return await Media.find({ userId })
        .sort({ createdAt: -1 })
        .limit(limit);
};

/**
 * Generate thumbnail URL
 * @param {String} cloudinaryId - Cloudinary public ID
 * @param {Number} width - Width
 * @param {Number} height - Height
 * @returns {String} Thumbnail URL
 */
export const generateThumbnail = (cloudinaryId, width = 200, height = 200) => {
    return cloudinary.url(cloudinaryId, {
        width,
        height,
        crop: 'fill',
        quality: 'auto',
        fetch_format: 'auto',
    });
};
