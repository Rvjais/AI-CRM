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

// Trust the first proxy in front of Express (LiteSpeed)
// Essential for the Rate Limiter to see real user IPs instead of 127.0.0.1
app.set('trust proxy', true);

// Security middleware
app.use(helmet());

// Manual CORS middleware (replaces cors npm package to prevent LiteSpeed from duplicating headers)
const ALLOWED_ORIGINS_LIST = [
    'https://in.aicrmz.com',
    'https://ai-crm-vert.vercel.app',
    'https://ai-crm-lz5h.vercel.app',
];

app.use((req, res, next) => {
    let origin = req.headers['origin'] || '';

    // LiteSpeed sometimes doubles Origin headers: "https://in.aicrmz.com, https://in.aicrmz.com"
    if (origin.includes(',')) {
        origin = origin.split(',')[0].trim();
    }

    const isPublicFormSubmit = req.path.startsWith('/api/forms/') && req.path.endsWith('/submit');

    const isAllowed =
        isPublicFormSubmit ||
        !origin ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        ALLOWED_ORIGINS_LIST.includes(origin) ||
        origin.endsWith('.vercel.app') ||
        (env.ALLOWED_ORIGINS && env.ALLOWED_ORIGINS.includes(origin)) ||
        env.NODE_ENV === 'development';

    if (isAllowed && origin) {
        // Use set() so we only ever have ONE value, overwriting anything LiteSpeed added
        res.set('Access-Control-Allow-Origin', origin);
        res.set('Access-Control-Allow-Credentials', 'true');
        res.set('Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Origin,Content-Type,Accept,Authorization,X-Requested-With');
    }

    // Handle OPTIONS preflight immediately
    if (req.method === 'OPTIONS') {
        return res.sendStatus(204);
    }

    next();
});

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
        headers: req.headers, // [DEBUG] Log headers
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
