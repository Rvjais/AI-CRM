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

const debugCampaignErrors = async () => {
    try {
        await connectDB();

        // Find the most recent campaign
        const lastCampaign = await Campaign.findOne().sort({ createdAt: -1 });

        if (!lastCampaign) {
            console.log('No campaigns found.');
            return;
        }

        console.log('--- Last Campaign ---');
        console.log(`ID: ${lastCampaign._id}`);
        console.log(`Name: ${lastCampaign.name}`);
        console.log(`Status: ${lastCampaign.status}`);
        console.log(`Stats -> Total: ${lastCampaign.stats?.total}, Sent: ${lastCampaign.stats?.sent}, Failed: ${lastCampaign.stats?.failed}`);

        if (lastCampaign.stats?.failed > 0) {
            console.log('\n--- Failed Jobs (Last 20) ---');
            const failedJobs = await CampaignJob.find({
                campaignId: lastCampaign._id,
                status: 'FAILED'
            }).limit(20);

            failedJobs.forEach((job, idx) => {
                console.log(`\nJob ${idx + 1}:`);
                console.log(`  To Phone: ${job.toPhone}`); // Assuming schema has toPhone, checking...
                // Wait, schema might not have toPhone directly on Job, it has contactId.
                // Let's print whatever failure info is there.
                console.log(`  Error: ${job.error}`);
                console.log(`  Updated At: ${job.updatedAt}`);
            });
        } else {
            console.log('\nNo failed jobs found for this campaign.');
        }

    } catch (error) {
        console.error('Debug script error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
    }
};

debugCampaignErrors();
