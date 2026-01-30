import mongoose from 'mongoose';
import env from './env.js';
import logger from '../utils/logger.util.js';

/**
 * MongoDB connection configuration
 * Includes retry logic and connection event handlers
 */

const connectDB = async (retries = 5) => {
    try {
        const options = {
            // Connection options
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        await mongoose.connect(env.MONGODB_URI, options);

        logger.info('✅ MongoDB connected successfully');
        logger.info(`📊 Database: ${mongoose.connection.name}`);

    } catch (error) {
        logger.error('❌ MongoDB connection error:', error.message);

        if (retries > 0) {
            logger.info(`🔄 Retrying connection... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            return connectDB(retries - 1);
        }

        logger.error('💥 Failed to connect to MongoDB after multiple attempts');
        process.exit(1);
    }
};

// Connection event handlers
mongoose.connection.on('connected', () => {
    logger.info('🔌 Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    logger.error('❌ Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    logger.warn('⚠️ Mongoose disconnected from MongoDB');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose.connection.close();
    logger.info('👋 MongoDB connection closed through app termination');
    process.exit(0);
});

export default connectDB;
