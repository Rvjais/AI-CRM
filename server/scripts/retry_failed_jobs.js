import mongoose from 'mongoose';
import Campaign from '../src/models/Campaign.js';
import CampaignJob from '../src/models/CampaignJob.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const retryFailedJobs = async () => {
    try {
        await connectDB();

        // 1. Get Last Campaign
        const lastCampaign = await Campaign.findOne().sort({ createdAt: -1 });
        if (!lastCampaign) {
            console.log('No campaigns found.');
            return;
        }

        console.log(`Campaign: ${lastCampaign.name} (${lastCampaign._id})`);

        // 2. Find Failed Jobs for this campaign
        const failedJobs = await CampaignJob.find({
            campaignId: lastCampaign._id,
            status: 'FAILED'
        });

        if (failedJobs.length === 0) {
            console.log('No failed jobs to retry.');
            return;
        }

        console.log(`Found ${failedJobs.length} failed jobs. Resetting to PENDING...`);

        // 3. Update Jobs to PENDING
        const result = await CampaignJob.updateMany(
            { campaignId: lastCampaign._id, status: 'FAILED' },
            { $set: { status: 'PENDING', error: null }, $unset: { sentAt: 1 } }
        );

        console.log(`Reset ${result.modifiedCount} jobs.`);

        // 4. Update Campaign Stats/Status
        // We need to decrement 'failed' count and ensure status is RUNNING if it was completed
        // Wait, stats are just counters. We should decrement failures.
        // And if status was COMPLETED, set back to RUNNING so processor picks it up (if processor checks Campaign status first)

        await Campaign.findByIdAndUpdate(lastCampaign._id, {
            $inc: { 'stats.failed': -result.modifiedCount },
            $set: { status: 'RUNNING' }
        });

        console.log('Updated campaign stats and set status to RUNNING.');

    } catch (error) {
        console.error('Retry script error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
    }
};

retryFailedJobs();
