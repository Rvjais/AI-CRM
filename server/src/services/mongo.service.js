import mongoose from 'mongoose';
import { Readable } from 'stream';
import logger from '../utils/logger.util.js';

let bucket;

// Initialize GridFS Bucket
const getBucket = () => {
    if (!bucket) {
        if (!mongoose.connection.db) {
            throw new Error('Database not connected');
        }
        bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
            bucketName: 'uploads'
        });
    }
    return bucket;
};

/**
 * Upload buffer to MongoDB GridFS
 * @param {Buffer} buffer - File buffer
 * @param {String} filename - Filename
 * @param {String} mimeType - Mime type
 * @returns {Promise<Object>} File info
 */
export const uploadToMongo = async (buffer, filename, mimeType) => {
    try {
        const bucket = getBucket();

        const uploadStream = bucket.openUploadStream(filename, {
            contentType: mimeType,
            metadata: {
                timestamp: new Date()
            }
        });

        const readStream = new Readable();
        readStream.push(buffer);
        readStream.push(null);

        return new Promise((resolve, reject) => {
            readStream
                .pipe(uploadStream)
                .on('error', (error) => {
                    logger.error('GridFS upload error:', error);
                    reject(error);
                })
                .on('finish', () => {
                    resolve({
                        fileId: uploadStream.id,
                        filename: filename,
                        contentType: mimeType,
                        url: `/api/files/${uploadStream.id}`
                    });
                });
        });
    } catch (error) {
        logger.error('Mongo upload error:', error);
        throw error;
    }
};

/**
 * Get file read stream from GridFS
 * @param {String} fileId - GridFS file ID
 * @returns {Promise<Object>} Stream and metadata
 */
export const getFileStream = async (fileId) => {
    try {
        const bucket = getBucket();
        const _id = new mongoose.Types.ObjectId(fileId);

        const files = await bucket.find({ _id }).toArray();
        if (!files || files.length === 0) {
            throw new Error('File not found');
        }

        const file = files[0];
        const stream = bucket.openDownloadStream(_id);

        return {
            stream,
            contentType: file.contentType,
            filename: file.filename,
            length: file.length
        };
    } catch (error) {
        logger.error('Mongo get file error:', error);
        throw error;
    }
};
