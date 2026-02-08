import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Environment configuration
 * Validates and exports all required environment variables
 */
const env = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '5000', 10),
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://ai-crm-vert.vercel.app',
  ALLOWED_ORIGINS: (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'https://ai-crm-vert.vercel.app').split(',').map(origin => origin.trim()),

  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/whatsapp-platform',

  // JWT
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRY: process.env.JWT_ACCESS_EXPIRY || '15m',
  JWT_REFRESH_EXPIRY: process.env.JWT_REFRESH_EXPIRY || '7d',

  // Encryption
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,

  // Rate Limiting
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',

  // Google OAuth
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_REDIRECT_URI: process.env.REDIRECT_URI || process.env.GOOGLE_REDIRECT_URI,

  // Computed
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};

// Validate critical environment variables
const validateEnv = () => {
  const required = [
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'ENCRYPTION_KEY',
  ];

  const missing = required.filter(key => !env[key]);

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('📝 Please copy .env.example to .env and fill in the values');
    process.exit(1);
  }

  // Validate encryption key length (must be 32 bytes = 64 hex characters)
  if (env.ENCRYPTION_KEY && env.ENCRYPTION_KEY.length !== 64) {
    console.error('❌ ENCRYPTION_KEY must be 64 characters (32 bytes in hex format)');
    console.error('💡 Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
  }
};

validateEnv();

export default env;
