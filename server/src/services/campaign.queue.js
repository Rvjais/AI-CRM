import cron from 'node-cron';
import Campaign from '../models/Campaign.js';
import CampaignJob from '../models/CampaignJob.js';
import * as whatsappService from './whatsapp.service.js';
import * as gmailService from './gmail.service.js'; // Assuming this exists or lines up with email controller
import logger from '../utils/logger.util.js';
import { getClientModels } from '../utils/database.factory.js';

// Configuration
const BATCH_SIZE_PER_TICK = 5; // Low batch size to respect global rates
const CRON_SCHEDULE = '*/20 * * * * *'; // Run every 20 seconds

let isProcessing = false;

export const startQueueProcessor = () => {
    logger.info('Starting Campaign Queue Processor...');
    cron.schedule(CRON_SCHEDULE, async () => {
        if (isProcessing) return;
        isProcessing = true;
        try {
            await processQueue();
        } catch (error) {
            logger.error('Queue Processor Error:', error);
        } finally {
            isProcessing = false;
        }
    });
};

const processQueue = async () => {
    // 1. Find RUNNING campaigns
    const runningCampaigns = await Campaign.find({ status: 'RUNNING' }).select('_id userId type template');

    if (runningCampaigns.length === 0) return;

    // 2. Round-robin or parallel process? 
    // For simplicity, process a small batch for EACH running campaign to ensure fairness.

    for (const campaign of runningCampaigns) {
        // Fetch pending jobs
        const jobs = await CampaignJob.find({
            campaignId: campaign._id,
            status: 'PENDING'
        })
            .limit(BATCH_SIZE_PER_TICK)
            .sort({ _id: 1 }); // FIFO

        if (jobs.length === 0) {
            // Check if completely finished
            const pendingCount = await CampaignJob.countDocuments({ campaignId: campaign._id, status: 'PENDING' });
            if (pendingCount === 0) {
                // Mark campaign as COMPLETED
                await Campaign.findByIdAndUpdate(campaign._id, { status: 'COMPLETED', completedAt: new Date() });
            }
            continue;
        }

        // Process this batch
        await Promise.all(jobs.map(job => processJob(campaign, job)));
    }
};

const processJob = async (campaign, job) => {
    // Mark as PROCESSING immediately to prevent double pick-up (though we run sequentially per tick)
    job.status = 'PROCESSING';
    await job.save();

    // 0. Check and Deduct Credits (Atomic)
    const User = (await import('../models/User.js')).default;
    const user = await User.findOneAndUpdate(
        { _id: job.userId, credits: { $gte: 1 } },
        { $inc: { credits: -1 } }
    );

    if (!user) {
        throw new Error('Insufficient credits (Required: 1)');
    }

    try {
        let sentId = null;

        // --- WHATSAPP ---
        if (campaign.type === 'WHATSAPP') {
            const { Contact } = await getClientModels(job.userId);
            // Note: job.toPhone might be just number. Need JID.
            // job.contactId is best reference.
            const contact = await Contact.findById(job.contactId);
            if (!contact || !contact.jid) throw new Error('Contact invalid or no JID');

            // Dynamic Variable Replacement
            let text = campaign.template.body;

            // Standard fields
            text = text.replace(/{{name}}/gi, contact.name || 'there');
            text = text.replace(/{{phone}}/gi, contact.phoneNumber || '');

            // Custom Attributes
            if (contact.customAttributes) {
                // Regex to find all {{key}} patterns
                text = text.replace(/{{([^}]+)}}/g, (match, key) => {
                    // key might be 'Company', 'City' etc.
                    // Check customAttributes (handle case sensitivity)
                    // We stored keys lowercase in Import?
                    // normalizeData lowercases headers. So we should look for key.toLowerCase()
                    const val = contact.customAttributes.get(key) || contact.customAttributes.get(key.toLowerCase());
                    return val || match; // Return value or keep {{key}} if not found
                });
            }

            // Random delay 1-5s to prevent burst (even within batch)
            await new Promise(r => setTimeout(r, Math.random() * 5000));

            const result = await whatsappService.sendTextMessage(job.userId, contact.jid, text);
            // TODO: Handle media if template.mediaUrl exists

            sentId = result?.key?.id;
        }

        // --- EMAIL ---
        else if (campaign.type === 'EMAIL') {
            if (!job.toEmail) throw new Error('No email address');

            let body = campaign.template.body;
            body = body.replace(/{{name}}/g, job.toName || 'there');

            // Gmail Service usage
            const result = await gmailService.sendEmail(job.userId, {
                to: job.toEmail,
                subject: campaign.template.subject,
                body: body
            });

            sentId = result.id;
        }

        // Success
        await CampaignJob.findByIdAndUpdate(job._id, {
            status: 'SENT',
            sentAt: new Date(),
            messageId: sentId
        });

        // Update stats (atomic increment)
        await Campaign.findByIdAndUpdate(campaign._id, { $inc: { 'stats.sent': 1 } });

    } catch (error) {
        // Refund credits on failure
        await User.findByIdAndUpdate(job.userId, { $inc: { credits: 1 } });

        logger.error(`Job failed ${job._id}:`, error);

        await CampaignJob.findByIdAndUpdate(job._id, {
            status: 'FAILED',
            error: error.message
        });

        await Campaign.findByIdAndUpdate(campaign._id, { $inc: { 'stats.failed': 1 } });
    }
};


