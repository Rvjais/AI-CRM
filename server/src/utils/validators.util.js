/**
 * Input validation utilities
 */

/**
 * Validate phone number (basic format)
 * @param {String} phone - Phone number
 * @returns {Boolean} Is valid
 */
export const isValidPhoneNumber = (phone) => {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    // Should be between 10-15 digits
    return cleaned.length >= 10 && cleaned.length <= 15;
};

/**
 * Validate WhatsApp JID format
 * @param {String} jid - JID (e.g., 1234567890@s.whatsapp.net)
 * @returns {Boolean} Is valid
 */
export const isValidJid = (jid) => {
    if (!jid || typeof jid !== 'string') return false;

    // Individual chat: number@s.whatsapp.net
    // Group chat: number-timestamp@g.us
    const individualPattern = /^\d+@s\.whatsapp\.net$/;
    const groupPattern = /^\d+-\d+@g\.us$/;

    return individualPattern.test(jid) || groupPattern.test(jid);
};

/**
 * Check if JID is a group
 * @param {String} jid - JID
 * @returns {Boolean} Is group
 */
export const isGroupJid = (jid) => {
    return jid && jid.endsWith('@g.us');
};

/**
 * Extract phone number from JID
 * @param {String} jid - JID
 * @returns {String} Phone number
 */
export const extractPhoneFromJid = (jid) => {
    if (!jid) return '';
    return jid.split('@')[0].split('-')[0];
};

/**
 * Format JID from phone number
 * @param {String} phone - Phone number
 * @returns {String} JID
 */
export const formatJid = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    return `${cleaned}@s.whatsapp.net`;
};

/**
 * Validate email
 * @param {String} email - Email address
 * @returns {Boolean} Is valid
 */
export const isValidEmail = (email) => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
};

/**
 * Sanitize filename
 * @param {String} filename - Original filename
 * @returns {String} Sanitized filename
 */
export const sanitizeFilename = (filename) => {
    return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
};

/**
 * Get file extension
 * @param {String} filename - Filename
 * @returns {String} Extension (lowercase)
 */
export const getFileExtension = (filename) => {
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

/**
 * Validate password strength
 * @param {String} password - Password
 * @returns {Object} { isValid, message }
 */
export const validatePasswordStrength = (password) => {
    if (!password || password.length < 8) {
        return { isValid: false, message: 'Password must be at least 8 characters long' };
    }

    if (!/[a-z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one lowercase letter' };
    }

    if (!/[A-Z]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one uppercase letter' };
    }

    if (!/[0-9]/.test(password)) {
        return { isValid: false, message: 'Password must contain at least one number' };
    }

    return { isValid: true, message: 'Password is strong' };
};
