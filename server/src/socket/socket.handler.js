import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.util.js';
import logger from '../utils/logger.util.js';
import env from '../config/env.js';
import { SOCKET_EVENTS } from '../config/constants.js';

/**
 * Socket.io handler
 * Initializes Socket.io server with authentication
 */

/**
 * Initialize Socket.io server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server
 */
export const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: (origin, callback) => {
                // Allow requests with no origin
                if (!origin) return callback(null, true);

                // Allow localhost
                if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
                    return callback(null, true);
                }

                // Allow configured frontend URL
                if (origin === env.FRONTEND_URL) {
                    return callback(null, true);
                }

                // In development, allow all
                if (env.NODE_ENV === 'development') {
                    return callback(null, true);
                }

                callback(new Error('Not allowed by CORS'));
            },
            credentials: true,
        },
        pingTimeout: 60000,
    });

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error('Authentication error: No token provided'));
            }

            // Verify token
            const decoded = verifyAccessToken(token);
            socket.userId = decoded.userId;

            logger.info(`Socket authenticated for user: ${socket.userId}`);
            next();
        } catch (error) {
            logger.error('Socket authentication error:', error);
            next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler
    io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
        const userId = socket.userId;
        logger.info(`Client connected: ${socket.id}, User: ${userId}`);

        // Join user-specific room
        socket.join(userId.toString());

        // Handle disconnection
        socket.on(SOCKET_EVENTS.DISCONNECT, () => {
            logger.info(`Client disconnected: ${socket.id}, User: ${userId}`);
        });

        // Handle typing event
        socket.on(SOCKET_EVENTS.TYPING, (data) => {
            const { chatJid, isTyping } = data;

            // Emit typing status to the specific chat (could be used for group notifications)
            socket.to(userId.toString()).emit(SOCKET_EVENTS.CHAT_TYPING, {
                chatJid,
                isTyping,
            });
        });

        // Handle presence update
        socket.on(SOCKET_EVENTS.UPDATE_PRESENCE, async (data) => {
            const { status } = data; // 'available' or 'unavailable'

            // This could update the user's WhatsApp presence
            logger.info(`Presence update for user ${userId}: ${status}`);
        });

        // Send welcome message
        socket.emit('connected', {
            message: 'Connected to WhatsApp Business Platform',
            userId,
        });

        // [FIX] Send current WhatsApp connection status immediately on socket reconnect
        (async () => {
            try {
                const { isConnected, getConnection } = await import('../services/whatsapp.service.js');
                const connected = isConnected(userId);

                if (connected) {
                    const sock = getConnection(userId);
                    const phoneNumber = sock?.user?.id?.split(':')[0];

                    socket.emit('whatsapp:connected', {
                        phoneNumber,
                        deviceInfo: {
                            browser: 'Chrome (Linux)',
                            version: ''
                        }
                    });
                    logger.info(`🔄 Sent existing WhatsApp connection status to user ${userId}`);
                } else {
                    // Check if there is a pending QR code
                    const { getClientModels } = await import('../utils/database.factory.js');
                    const { WhatsAppSession } = await getClientModels(userId);
                    const session = await WhatsAppSession.findOne({ userId });

                    if (session?.qrCode) {
                        socket.emit('whatsapp:qr', { qr: session.qrCode });
                        logger.info(`🔄 Sent existing QR code to user ${userId}`);
                    }
                }
            } catch (err) {
                logger.error(`Error sending initial stats to user ${userId}:`, err);
            }
        })();
    });

    logger.info('✅ Socket.io initialized successfully');

    return io;
};

export default initializeSocket;
