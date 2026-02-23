import cron from 'node-cron';
import User from '../models/User.js';
import * as whatsappService from './whatsapp.service.js';
import * as gmailService from './gmail.service.js';
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
    // 1. Find all users who are ready and have a valid URI
    const users = await User.find({
        infrastructureReady: true,
        mongoURI: { $exists: true, $ne: '' }
    }).select('_id');

    for (const user of users) {
        try {
            await processUserQueue(user._id);
        } catch (err) {
            logger.error(`Failed to process queue for user ${user._id}:`, err);
        }
    }
};

const processUserQueue = async (userId) => {
    const { Campaign, CampaignJob, Contact } = await getClientModels(userId);

    // 1. Find RUNNING campaigns for this user
    const runningCampaigns = await Campaign.find({ status: 'RUNNING' }).select('_id userId type template stats');

    if (runningCampaigns.length === 0) return;

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
                campaign.status = 'COMPLETED';
                campaign.completedAt = new Date();
                await campaign.save();
            }
            continue;
        }

        // Process this batch sequentially to respect the random delays
        for (const job of jobs) {
            await processJob(userId, campaign, job, { Campaign, CampaignJob, Contact });
        }
    }
};

const processJob = async (userId, campaign, job, models) => {
    const { Campaign, CampaignJob, Contact } = models;

    // Mark as PROCESSING immediately
    job.status = 'PROCESSING';
    await job.save();

    // 0. Check and Deduct Credits (Atomic) - User is Master DB
    const user = await User.findOneAndUpdate(
        { _id: userId, credits: { $gte: 1 } },
        { $inc: { credits: -1 } }
    );

    if (!user) {
        // Fail job if no credits
        job.status = 'FAILED';
        job.error = 'Insufficient credits';
        await job.save();
        await Campaign.findByIdAndUpdate(campaign._id, { $inc: { 'stats.failed': 1 } });
        return;
    }

    try {
        let sentId = null;

        // --- WHATSAPP ---
        if (campaign.type === 'WHATSAPP') {
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
                text = text.replace(/{{([^}]+)}}/g, (match, key) => {
                    const val = contact.customAttributes.get(key) || contact.customAttributes.get(key.toLowerCase());
                    return val || match;
                });
            }

            // Random delay 1-5s to prevent burst
            await new Promise(r => setTimeout(r, Math.random() * 5000));

            const result = await whatsappService.sendTextMessage(userId, contact.jid, text, { isCampaign: true });
            sentId = result?.key?.id;
        }

        // --- EMAIL ---
        else if (campaign.type === 'EMAIL') {
            if (!job.toEmail) throw new Error('No email address');

            let body = campaign.template.body;
            body = body.replace(/{{name}}/g, job.toName || 'there');

            const result = await gmailService.sendEmail(userId, {
                to: job.toEmail,
                subject: campaign.template.subject,
                body: body
            });

            sentId = result.id;
        }

        // Success
        job.status = 'SENT';
        job.sentAt = new Date();
        job.messageId = sentId;
        await job.save();

        // Update stats (atomic increment)
        await Campaign.findByIdAndUpdate(campaign._id, { $inc: { 'stats.sent': 1 } });

    } catch (error) {
        // Refund credits on failure
        await User.findByIdAndUpdate(userId, { $inc: { credits: 1 } });

        logger.error(`Job failed ${job._id}:`, error);

        job.status = 'FAILED';
        job.error = error.message;
        await job.save();

        await Campaign.findByIdAndUpdate(campaign._id, { $inc: { 'stats.failed': 1 } });
    }
};


