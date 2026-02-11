import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import env from './config/env.js';
import routes from './routes/index.js';
import fileRoutes from './routes/file.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { apiLimiter } from './middleware/rateLimiter.middleware.js';
import logger from './utils/logger.util.js';

/**
 * Express application setup
 */

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Allow file:// and localhost origins
app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or file://)
        if (!origin) return callback(null, true);

        // Allow localhost
        if (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1')) {
            return callback(null, true);
        }

        // Allow Vercel deployments
        const allowedVercelDomains = [
            'https://ai-crm-vert.vercel.app', // Frontend
            'https://ai-crm-lz5h.vercel.app'  // Admin
        ];

        if (allowedVercelDomains.includes(origin) || origin.endsWith('.vercel.app')) {
            return callback(null, true);
        }

        // Allow configured allowed origins
        if (env.ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }

        // In development, allow all origins
        if (env.NODE_ENV === 'development') {
            return callback(null, true);
        }

        callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
    });
    next();
});

// Rate limiting
app.use('/api', apiLimiter);

// API routes
app.use('/api', routes);
app.use('/api/files', fileRoutes);

// Root-level Google OAuth callback forwarder
// Handles redirects to http://localhost:3000/auth/google/callback
app.get('/auth/google/callback', (req, res) => {
    const queryString = req.url.split('?')[1] || '';
    res.redirect(`/api/auth/google/callback?${queryString}`);
});

// Health check (no prefix)
app.get('/', (req, res) => {
    res.json({
        success: true,
        message: 'WhatsApp Business Platform API',
        version: '1.0.0',
        environment: env.NODE_ENV,
    });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export default app;
