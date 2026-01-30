import crypto from 'crypto';
import env from '../config/env.js';

/**
 * Encryption utility using AES-256-CBC
 * Used for encrypting WhatsApp session data
 */

const ALGORITHM = 'aes-256-cbc';
const KEY = Buffer.from(env.ENCRYPTION_KEY, 'hex'); // 32 bytes

/**
 * Encrypt data
 * @param {String} text - Plain text to encrypt
 * @returns {String} Encrypted text with IV prepended (hex format)
 */
export const encrypt = (text) => {
    try {
        // Generate random IV for each encryption
        const iv = crypto.randomBytes(16);

        // Create cipher
        const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);

        // Encrypt the text
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        // Return IV + encrypted data (both in hex)
        return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
        throw new Error(`Encryption failed: ${error.message}`);
    }
};

/**
 * Decrypt data
 * @param {String} encryptedText - Encrypted text with IV prepended (hex format)
 * @returns {String} Decrypted plain text
 */
export const decrypt = (encryptedText) => {
    try {
        // Split IV and encrypted data
        const parts = encryptedText.split(':');
        if (parts.length !== 2) {
            throw new Error('Invalid encrypted data format');
        }

        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];

        // Create decipher
        const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);

        // Decrypt the text
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    } catch (error) {
        throw new Error(`Decryption failed: ${error.message}`);
    }
};

/**
 * Encrypt object (converts to JSON first)
 * @param {Object} obj - Object to encrypt
 * @returns {String} Encrypted string
 */
export const encryptObject = (obj) => {
    const jsonString = JSON.stringify(obj);
    return encrypt(jsonString);
};

/**
 * Decrypt to object (parses JSON after decryption)
 * @param {String} encryptedText - Encrypted string
 * @returns {Object} Decrypted object
 */
export const decryptObject = (encryptedText) => {
    const jsonString = decrypt(encryptedText);
    return JSON.parse(jsonString, (key, value) => {
        if (value && value.type === 'Buffer' && Array.isArray(value.data)) {
            return Buffer.from(value.data);
        }
        return value;
    });
};

/**
 * Generate a random encryption key (for setup)
 * @returns {String} Random 32-byte key in hex format
 */
export const generateEncryptionKey = () => {
    return crypto.randomBytes(32).toString('hex');
};
