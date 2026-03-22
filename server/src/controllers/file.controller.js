import { asyncHandler } from '../middleware/error.middleware.js';

/**
 * getFile - Deprecated
 * Previously used for GridFS storage. 
 * Now all media is stored on Cloudinary.
 */
export const getFile = asyncHandler(async (req, res) => {
    return res.status(410).json({
        success: false,
        message: 'Storage endpoint moved to Cloudinary. GridFS is deprecated.'
    });
});
