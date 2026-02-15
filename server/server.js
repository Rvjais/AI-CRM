import { createServer } from 'http';
import app from './src/app.js';
import connectDB from './src/config/database.js';
import { configureCloudinary } from './src/config/cloudinary.js';
import initializeSocket from './src/socket/socket.handler.js';
import env from './src/config/env.js';
import logger from './src/utils/logger.util.js';
import { startAIWorker } from './src/services/ai-worker.service.js';
import { ensureAdminUser } from './src/utils/setup.util.js';
import { startQueueProcessor } from './src/services/campaign.queue.js';

logger.info('SERVER SCRIPT STARTED');

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
        logger.info('Attempting DB Connection...');
        await connectDB();
        logger.info('DEBUG: DB Connected');

        // Configure Cloudinary
        configureCloudinary();
        logger.info('DEBUG: Cloudinary Configured');

        // Ensure admin user exists (Run in background to avoid startup block)
        ensureAdminUser().catch(err => logger.error('Error ensuring admin user:', err));
        logger.info('DEBUG: Admin User check started in background');

        // Restore active WhatsApp sessions (BYOD Aware) - Delayed to ensure DB/Socket stability
        setTimeout(async () => {
            try {
                logger.info('🔄 [Restoration] Starting WhatsApp Session Restoration (5s delayed)...');
                const { connectWhatsApp } = await import('./src/services/whatsapp.service.js');
                const User = (await import('./src/models/User.js')).default;
                const { getClientModels } = await import('./src/utils/database.factory.js');

                // Find all users with configured infrastructure
                const users = await User.find({ infrastructureReady: true });
                logger.info(`🔍 [Restoration] Found ${users.length} users with infrastructure configurations.`);

                for (const user of users) {
                    try {
                        logger.info(`🔍 [Restoration] Checking user ${user._id} (${user.email})...`);
                        const { WhatsAppSession } = await getClientModels(user._id);

                        if (!WhatsAppSession) {
                            logger.error(`❌ [Restoration] Failed to get WhatsAppSession model for ${user._id}`);
                            continue;
                        }

                        const session = await WhatsAppSession.findOne({ userId: user._id });

                        if (session) {
                            logger.info(`📄 [Restoration] Session found for ${user._id}. Status: ${session.status}`);
                            if (session.status === 'connected') {
                                logger.info(`🚀 [Restoration] Restoring active session for user ${user._id}...`);
                                connectWhatsApp(user._id, io).catch(err => {
                                    logger.error(`❌ [Restoration] Failed to restore session for user ${user._id}:`, err);
                                });
                            } else {
                                logger.info(`Thinking... Session exists but status is '${session.status}'. Skipping.`);
                            }
                        } else {
                            logger.info(`⚠️ [Restoration] No session document found for user ${user._id}`);
                        }
                    } catch (userError) {
                        logger.error(`❌ [Restoration] Error checking session for user ${user._id}:`, userError);
                    }
                }
                logger.info('✅ [Restoration] Session check completed');
            } catch (error) {
                logger.error('❌ [Restoration] Critical error:', error);
            }
        }, 5000);

        // Start AI Background Worker
        startAIWorker(io);
        logger.info('DEBUG: AI Worker Started');

        // Start AI Cron Job (30-min scheduled tasks)
        const { startAiCron } = await import('./src/jobs/ai.cron.js');
        startAiCron();
        logger.info('DEBUG: AI Cron Started');

        // Start Email Monitoring Cron
        const { startEmailCron } = await import('./src/jobs/email.cron.js');
        startEmailCron();
        logger.info('DEBUG: Email Cron Started');

        // Start Campaign Queue Processor
        startQueueProcessor();
        logger.info('DEBUG: Queue Processor Started');


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
