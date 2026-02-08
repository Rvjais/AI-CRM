import { createServer } from 'http';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import { configureCloudinary } from './src/config/cloudinary.js';
import initializeSocket from './src/socket/socket.handler.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.util.js';
import { startAIWorker } from './src/services/ai-worker.service.js';
import { ensureAdminUser } from './src/utils/setup.util.js';

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

        // Ensure admin user exists
        await ensureAdminUser();

        // Restore active WhatsApp sessions
        try {
            const WhatsAppSession = (await import('./src/models/WhatsAppSession.js')).default;
            const { connectWhatsApp } = await import('./src/services/whatsapp.service.js');

            const activeSessions = await WhatsAppSession.find({ status: 'connected' });
            logger.info(`Found ${activeSessions.length} active sessions to restore`);

            for (const session of activeSessions) {
                logger.info(`Restoring session for user ${session.userId}`);
                connectWhatsApp(session.userId, io).catch(err => {
                    logger.error(`Failed to restore session for user ${session.userId}:`, err);
                });
            }
        } catch (error) {
            logger.error('Error restoring sessions:', error);
        }

        // Start AI Background Worker
        startAIWorker(io);

        // Start AI Cron Job (30-min scheduled tasks)
        const { startAiCron } = await import('./src/jobs/ai.cron.js');
        startAiCron();


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
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    logger.error(`Unhandled Rejection: ${reason instanceof Error ? reason.message : reason}`);
    if (reason instanceof Error) {
        logger.error(reason.stack);
    }
    gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();
