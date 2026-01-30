/**
 * Application-wide constants
 */

export const MESSAGE_TYPES = {
    TEXT: 'text',
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
    STICKER: 'sticker',
    LOCATION: 'location',
    CONTACT: 'contact',
};

export const MESSAGE_STATUS = {
    PENDING: 'pending',
    SENT: 'sent',
    DELIVERED: 'delivered',
    READ: 'read',
    FAILED: 'failed',
};

export const CONNECTION_STATUS = {
    DISCONNECTED: 'disconnected',
    CONNECTING: 'connecting',
    QR_READY: 'qr_ready',
    CONNECTED: 'connected',
};

export const USER_ROLES = {
    USER: 'user',
    ADMIN: 'admin',
};

export const PARTICIPANT_ROLES = {
    ADMIN: 'admin',
    MEMBER: 'member',
};

export const MEDIA_TYPES = {
    IMAGE: 'image',
    VIDEO: 'video',
    AUDIO: 'audio',
    DOCUMENT: 'document',
};

export const FILE_SIZE_LIMITS = {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 50 * 1024 * 1024, // 50MB
    AUDIO: 16 * 1024 * 1024, // 16MB
    DOCUMENT: 100 * 1024 * 1024, // 100MB
};

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav'];
export const ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
];

export const SOCKET_EVENTS = {
    // Connection
    CONNECTION: 'connection',
    DISCONNECT: 'disconnect',
    AUTHENTICATE: 'authenticate',

    // WhatsApp
    WHATSAPP_QR: 'whatsapp:qr',
    WHATSAPP_PAIRING_CODE: 'whatsapp:pairing_code',
    WHATSAPP_CONNECTED: 'whatsapp:connected',
    WHATSAPP_DISCONNECTED: 'whatsapp:disconnected',
    WHATSAPP_CONNECTING: 'whatsapp:connecting',
    WHATSAPP_ERROR: 'whatsapp:error',

    // Messages
    SEND_MESSAGE: 'send_message',
    MESSAGE_NEW: 'message:new',
    MESSAGE_UPDATE: 'message:update',
    MESSAGE_DELETED: 'message:deleted',
    MESSAGE_REACTION: 'message:reaction',
    TYPING: 'typing',
    READ_MESSAGE: 'read_message',

    // Chats
    CHAT_TYPING: 'chat:typing',
    CHAT_PRESENCE: 'chat:presence',
    CHAT_ARCHIVE: 'chat:archive',

    // Contacts
    CONTACT_UPDATE: 'contact:update',

    // Groups
    GROUP_UPDATE: 'group:update',
    GROUP_PARTICIPANT_UPDATE: 'group:participant_update',

    // Presence
    UPDATE_PRESENCE: 'update_presence',
};

export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
    AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
    NOT_FOUND: 'NOT_FOUND',
    WHATSAPP_ERROR: 'WHATSAPP_ERROR',
    DATABASE_ERROR: 'DATABASE_ERROR',
    UPLOAD_ERROR: 'UPLOAD_ERROR',
    RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};

export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 50,
    MAX_LIMIT: 100,
};
