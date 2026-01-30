import Joi from 'joi';
import { badRequestResponse } from '../utils/response.util.js';

/**
 * Validation middleware using Joi
 */

/**
 * Validate request data against schema
 * @param {Object} schema - Joi schema object with body, query, params
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const options = {
            abortEarly: false, // Return all errors
            allowUnknown: true, // Allow unknown keys in request
            stripUnknown: true, // Remove unknown keys
        };

        const toValidate = {};
        if (schema.body) toValidate.body = req.body;
        if (schema.query) toValidate.query = req.query;
        if (schema.params) toValidate.params = req.params;

        const schemaToValidate = Joi.object(schema);
        const { error, value } = schemaToValidate.validate(toValidate, options);

        if (error) {
            const errors = error.details.map((detail) => ({
                field: detail.path.join('.'),
                message: detail.message,
            }));

            return badRequestResponse(res, 'Validation failed', errors);
        }

        // Replace request data with validated data
        if (value.body) req.body = value.body;
        if (value.query) req.query = value.query;
        if (value.params) req.params = value.params;

        next();
    };
};

// Common validation schemas
export const schemas = {
    // Auth schemas
    register: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().min(8).required(),
            name: Joi.string().min(2).max(50).required(),
        }),
    },

    login: {
        body: Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
        }),
    },

    refreshToken: {
        body: Joi.object({
            refreshToken: Joi.string().required(),
        }),
    },

    updateProfile: {
        body: Joi.object({
            name: Joi.string().min(2).max(50),
            email: Joi.string().email(),
        }),
    },

    changePassword: {
        body: Joi.object({
            currentPassword: Joi.string().required(),
            newPassword: Joi.string().min(8).required(),
        }),
    },

    // Message schemas
    sendMessage: {
        body: Joi.object({
            chatJid: Joi.string().required(),
            type: Joi.string().valid('text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contact').required(),
            content: Joi.object({
                text: Joi.string(),
                mediaUrl: Joi.string(),
                caption: Joi.string(),
                mimeType: Joi.string(),
                fileName: Joi.string(),
                latitude: Joi.number(),
                longitude: Joi.number(),
                contactName: Joi.string(),
                contactNumber: Joi.string(),
            }).required(),
            quotedMessageId: Joi.string(),
            mentions: Joi.array().items(Joi.string()),
        }),
    },

    getMessages: {
        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50),
        }),
    },

    editMessage: {
        body: Joi.object({
            text: Joi.string().required(),
        }),
    },

    reactToMessage: {
        body: Joi.object({
            emoji: Joi.string().required(),
        }),
    },

    forwardMessage: {
        body: Joi.object({
            toJid: Joi.string().required(),
        }),
    },

    markAsRead: {
        body: Joi.object({
            messageIds: Joi.array().items(Joi.string()).required(),
        }),
    },

    // Contact schemas
    updateContact: {
        body: Joi.object({
            name: Joi.string().min(1).max(100),
            isBlocked: Joi.boolean(),
            aiEnabled: Joi.boolean(),
        }),
    },

    updateAIConfig: {
        body: Joi.object({
            enabled: Joi.boolean(),
            systemPrompt: Joi.string(),
            autoReply: Joi.boolean(),
            maxTokens: Joi.number(),
            temperature: Joi.number().min(0).max(1),
        }),
    },

    checkContact: {
        query: Joi.object({
            phoneNumber: Joi.string().required(),
        }),
    },

    // Group schemas
    createGroup: {
        body: Joi.object({
            name: Joi.string().min(1).max(100).required(),
            participants: Joi.array().items(Joi.string()).min(1).required(),
            description: Joi.string().max(500),
        }),
    },

    updateGroup: {
        body: Joi.object({
            name: Joi.string().min(1).max(100),
            description: Joi.string().max(500),
            onlyAdminsCanSend: Joi.boolean(),
            onlyAdminsCanEdit: Joi.boolean(),
        }),
    },

    manageParticipants: {
        body: Joi.object({
            action: Joi.string().valid('add', 'remove').required(),
            participants: Joi.array().items(Joi.string()).min(1).required(),
        }),
    },

    // WhatsApp schemas
    pairingCode: {
        body: Joi.object({
            phoneNumber: Joi.string().required(),
        }),
    },

    // Pagination
    pagination: {
        query: Joi.object({
            page: Joi.number().integer().min(1).default(1),
            limit: Joi.number().integer().min(1).max(100).default(50),
        }),
    },

    // JID param
    jidParam: {
        params: Joi.object({
            jid: Joi.string().required(),
        }),
    },

    // ID param
    idParam: {
        params: Joi.object({
            id: Joi.string().required(),
        }),
    },
};
