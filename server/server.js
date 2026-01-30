import { createServer } from 'http';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import { configureCloudinary } from './src/config/cloudinary.js';
import initializeSocket from './src/socket/socket.handler.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.util.js';

/**
 * Server entry point
 * Initializes HTTP server, Socket.io, and database connection
 */

// Create HTTP server
const httpServer = createServer(app);

// Initialize Socket.io
const io = initializeSocket(httpServer);

// Make io accessible to routes
app.set('io', io);

// Start server
const startServer = async () => {
    try {
        // Connect to database
        await connectDB();

        // Configure Cloudinary
        configureCloudinary();

        // Start listening
        httpServer.listen(env.PORT, () => {
            logger.info(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 WhatsApp Business Platform Server Started       ║
║                                                       ║
║   Port:        ${env.PORT}                                  ║
║   Environment: ${env.NODE_ENV}                       ║
║   URL:         http://localhost:${env.PORT}                 ║
║   API:         http://localhost:${env.PORT}/api             ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);

    // Close HTTP server
    httpServer.close(async () => {
        logger.info('HTTP server closed');

        // Close Socket.io connections
        io.close(() => {
            logger.info('Socket.io connections closed');
        });

        // Close database connection (handled by mongoose in database.js)
        logger.info('Database connections will be closed');

        logger.info('✅ Graceful shutdown completed');
        process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
        logger.error('❌ Could not close connections in time, forcefully shutting down');
        process.exit(1);
    }, 10000);
};

// Handle process signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
