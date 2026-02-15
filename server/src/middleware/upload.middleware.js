import multer from 'multer';
import path from 'path';
import {
    FILE_SIZE_LIMITS,
    ALLOWED_IMAGE_TYPES,
    ALLOWED_VIDEO_TYPES,
    ALLOWED_AUDIO_TYPES,
    ALLOWED_DOCUMENT_TYPES
} from '../config/constants.js';
import { sanitizeFilename } from '../utils/validators.util.js';

/**
 * Multer upload middleware configuration
 */

// Storage configuration (memory storage for Cloudinary)
const storage = multer.memoryStorage();

// File filter
const fileFilter = (req, file, cb) => {
    // [DEBUG] Log file details
    console.log(`📂 [Multer] Filtering file: ${file.originalname} (${file.mimetype})`);

    const allowedTypes = [
        ...ALLOWED_IMAGE_TYPES,
        ...ALLOWED_VIDEO_TYPES,
        ...ALLOWED_AUDIO_TYPES,
        ...ALLOWED_DOCUMENT_TYPES,
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        console.error(`❌ [Multer] Rejected file type: ${file.mimetype}`);
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images, videos, audio, and documents are allowed.`), false);
    }
};

// Size limit based on file type
const limits = {
    fileSize: FILE_SIZE_LIMITS.DOCUMENT, // Max limit (will be checked per type)
};

// Create multer instance
export const upload = multer({
    storage,
    fileFilter,
    limits,
});

/**
 * Single file upload middleware
 */
export const uploadSingle = (fieldName = 'file') => {
    return upload.single(fieldName);
};

/**
 * Multiple files upload middleware
 */
export const uploadMultiple = (fieldName = 'files', maxCount = 10) => {
    return upload.array(fieldName, maxCount);
};

/**
 * Validate file size based on type
 */
export const validateFileSize = (req, res, next) => {
    if (!req.file) {
        return next();
    }

    const { mimetype, size } = req.file;

    let maxSize;

    if (ALLOWED_IMAGE_TYPES.includes(mimetype)) {
        maxSize = FILE_SIZE_LIMITS.IMAGE;
    } else if (ALLOWED_VIDEO_TYPES.includes(mimetype)) {
        maxSize = FILE_SIZE_LIMITS.VIDEO;
    } else if (ALLOWED_AUDIO_TYPES.includes(mimetype)) {
        maxSize = FILE_SIZE_LIMITS.AUDIO;
    } else if (ALLOWED_DOCUMENT_TYPES.includes(mimetype)) {
        maxSize = FILE_SIZE_LIMITS.DOCUMENT;
    }

    if (size > maxSize) {
        return res.status(400).json({
            success: false,
            message: `File size exceeds limit of ${maxSize / (1024 * 1024)}MB`,
        });
    }

    next();
};
