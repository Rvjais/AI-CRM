import { getClientModels } from '../utils/database.factory.js';
import { validationResult } from 'express-validator';
import { successResponse } from '../utils/response.util.js';

export const createForm = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, description, fields, theme, customColor, designConfig } = req.body;

        const { Form } = await getClientModels(req.user._id);

        const newForm = await Form.create({
            title,
            description,
            fields,
            theme,
            customColor,
            designConfig,
            createdBy: req.user._id
        });

        res.status(201).json({
            success: true,
            data: newForm
        });
    } catch (error) {
        next(error);
    }
};

export const getForms = async (req, res, next) => {
    try {
        const { Form } = await getClientModels(req.user._id);
        const forms = await Form.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
        res.json({
            success: true,
            data: forms
        });
    } catch (error) {
        next(error);
    }
};

export const getForm = async (req, res, next) => {
    try {
        const { Form } = await getClientModels(req.user._id);
        const form = await Form.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }
        res.json({
            success: true,
            data: form
        });
    } catch (error) {
        next(error);
    }
};

export const updateForm = async (req, res, next) => {
    try {
        const { title, description, fields, theme, customColor } = req.body;

        const { Form } = await getClientModels(req.user._id);
        let form = await Form.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        form.title = title || form.title;
        form.description = description !== undefined ? description : form.description;
        form.fields = fields || form.fields;
        form.theme = theme || form.theme;
        form.customColor = customColor !== undefined ? customColor : form.customColor;

        if (req.body.designConfig) {
            form.designConfig = { ...form.designConfig, ...req.body.designConfig };
        }

        await form.save();

        res.json({
            success: true,
            data: form
        });
    } catch (error) {
        next(error);
    }
};

export const deleteForm = async (req, res, next) => {
    try {
        const { Form, FormSubmission } = await getClientModels(req.user._id);
        const form = await Form.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        // Also delete submissions
        await FormSubmission.deleteMany({ formId: form._id });

        res.json({
            success: true,
            message: 'Form deleted successfully'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Public endpoint
 * Expects ?u=userId or similar to resolve tenant DB if form is purely in tenant DB
 * For compatibility, we'll try to resolve userId from a FormIndex or similar if possible.
 * [STRATEGY] Since user wants ONLY credentials in Master, we'll assume the URL contains the userId.
 */
export const submitForm = async (req, res, next) => {
    try {
        const { formId } = req.params;
        const { u: userId } = req.query; // Expect userId in query param for public links
        const formData = req.body;

        if (!userId) {
            return res.status(400).json({ success: false, message: 'Missing tenant identifier' });
        }

        const { Form, FormSubmission } = await getClientModels(userId);

        // Check if form exists
        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        const submission = await FormSubmission.create({
            formId,
            data: formData
        });

        // --- Notification Logic ---
        try {
            // lazy load service to avoid any circular dependency issues if they exist
            const whatsappService = (await import('../services/whatsapp.service.js')).default;

            const creatorId = form.createdBy;
            const creatorJid = whatsappService.getSelfJid(creatorId);

            if (creatorJid) {
                // [FEATURE FLAG CHECK]
                const User = (await import('../models/User.js')).default;
                const creator = await User.findById(creatorId);
                if (creator && creator.featureFlags && creator.featureFlags.formNotifications === false) {
                    console.log(`[Form] WhatsApp notifications disabled for user ${creatorId}. Skipping.`);
                    return successResponse(res, 201, 'Form submitted successfully');
                }

                // Format the message
                let messageText = `📝 *New Submission: ${form.title}*\n\n`;

                Object.entries(formData).forEach(([key, value]) => {
                    const fieldConfig = form.fields.find(f => f.id === key || f.label === key);
                    const label = fieldConfig ? fieldConfig.label : key;
                    messageText += `*${label}:* ${value}\n`;
                });

                messageText += `\n_Received via RainCRM Form_`;

                await whatsappService.sendTextMessage(creatorId, creatorJid, messageText);
                console.log(`[Form] Notification sent to creator ${creatorId}`);
            }

        } catch (notifyError) {
            console.error('[Form] Notification failed:', notifyError);
        }
        // --------------------------

        res.status(201).json({
            success: true,
            message: 'Form submitted successfully'
        });
    } catch (error) {
        next(error);
    }
};

export const getSubmissions = async (req, res, next) => {
    try {
        const { Form, FormSubmission } = await getClientModels(req.user._id);

        // First verify user owns the form
        const form = await Form.findOne({ _id: req.params.id, createdBy: req.user._id });
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        const submissions = await FormSubmission.find({ formId: req.params.id }).sort({ submittedAt: -1 });

        res.json({
            success: true,
            data: submissions
        });
    } catch (error) {
        next(error);
    }
};
