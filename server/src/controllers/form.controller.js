import Form from '../models/Form.js';
import FormSubmission from '../models/FormSubmission.js';
import { validationResult } from 'express-validator';

export const createForm = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { title, description, fields, theme, customColor, designConfig } = req.body;

        const newForm = new Form({
            title,
            description,
            fields,
            theme,
            customColor,
            designConfig,
            createdBy: req.user._id
        });

        await newForm.save();

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

// Public endpoint
export const submitForm = async (req, res, next) => {
    try {
        const { formId } = req.params;
        const formData = req.body;

        // Check if form exists
        const form = await Form.findById(formId);
        if (!form) {
            return res.status(404).json({ success: false, message: 'Form not found' });
        }

        const submission = new FormSubmission({
            formId,
            data: formData
        });

        await submission.save();

        // --- Notification Logic ---
        try {
            // lazy load service to avoid any circular dependency issues if they exist
            const whatsappService = (await import('../services/whatsapp.service.js'));

            const creatorId = form.createdBy;
            const creatorJid = whatsappService.getSelfJid(creatorId);

            if (creatorJid) {
                // [FEATURE FLAG CHECK]
                const creator = await ((await import('../models/User.js')).default).findById(creatorId);
                if (creator && creator.featureFlags && creator.featureFlags.formNotifications === false) {
                    console.log(`[Form] WhatsApp notifications disabled for user ${creatorId}. Skipping.`);
                    return successResponse(res, 201, 'Form submitted successfully');
                }

                // Format the message
                let messageText = `📝 *New Submission: ${form.title}*\n\n`;

                // Fields from schema or just keys from body?
                // Using formData directly is safer as it contains actual submitted values
                Object.entries(formData).forEach(([key, value]) => {
                    // Try to find label if possible, otherwise use key
                    const fieldConfig = form.fields.find(f => f.id === key || f.label === key);
                    const label = fieldConfig ? fieldConfig.label : key;

                    messageText += `*${label}:* ${value}\n`;
                });

                messageText += `\n_Received via RainCRM Form_`;

                await whatsappService.sendTextMessage(creatorId, creatorJid, messageText);
                console.log(`[Form] Notification sent to creator ${creatorId}`);
            } else {
                console.log(`[Form] Creator ${creatorId} not connected to WhatsApp. No notification sent.`);
            }

        } catch (notifyError) {
            console.error('[Form] Notification failed:', notifyError);
            // Don't fail the request, just log it
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
