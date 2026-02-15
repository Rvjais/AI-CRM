import { getClientModels } from '../utils/database.factory.js';
import logger from '../utils/logger.util.js';

export const createCampaign = async (userId, data) => {
    // 1. Validate Input
    if (!data.name || !data.type || !data.template?.body) {
        throw new Error('Missing required fields');
    }

    if (!data.targetBatchId && (!data.targetTags || data.targetTags.length === 0)) {
        throw new Error('Must specify target audience (Batch or Tags)');
    }

    const { Campaign, Contact } = await getClientModels(userId);

    // 2. Create Campaign
    const campaign = await Campaign.create({
        userId,
        name: data.name,
        type: data.type,
        status: data.scheduleTime ? 'SCHEDULED' : 'DRAFT',
        targetBatchId: data.targetBatchId,
        targetTags: data.targetTags,
        template: data.template,
        scheduleTime: data.scheduleTime,
        stats: { total: 0, sent: 0, failed: 0 }
    });

    // 3. Resolve Audience & Create Jobs (If not just draft)
    if (campaign.status === 'SCHEDULED' || data.startNow) {
        await generateJobs(userId, campaign._id);

        if (data.startNow) {
            campaign.status = 'RUNNING';
            await campaign.save();
        }
    }

    return campaign;
};

export const generateJobs = async (userId, campaignId) => {
    const { Campaign, Contact, CampaignJob } = await getClientModels(userId);
    const campaign = await Campaign.findById(campaignId);
    if (!campaign) throw new Error('Campaign not found');

    const query = { userId }; // Base query

    // Filter by Batch
    if (campaign.targetBatchId) {
        query.importBatchId = campaign.targetBatchId;
    }

    // Filter by Tags
    if (campaign.targetTags && campaign.targetTags.length > 0) {
        query.tags = { $in: campaign.targetTags };
    }

    // Filter by Type validity
    if (campaign.type === 'WHATSAPP') {
        query.jid = { $exists: true }; // Must have JID
    } else if (campaign.type === 'EMAIL') {
        query.email = { $exists: true, $ne: '' };
    }

    logger.info(`[Campaign] Querying contacts with filter: ${JSON.stringify(query)}`);
    const contacts = await Contact.find(query).lean();
    logger.info(`[Campaign] Found ${contacts.length} contacts for user ${userId}`);

    const jobs = contacts.map(contact => ({
        campaignId,
        userId,
        contactId: contact._id,
        toName: contact.name,
        toPhone: contact.phoneNumber, // fallback to phone from contact
        toEmail: contact.email,
        status: 'PENDING'
    }));

    if (jobs.length > 0) {
        await CampaignJob.insertMany(jobs);

        // Update total stats
        campaign.stats.total = jobs.length;
        await campaign.save();
    }

    return jobs.length;
};

export const getCampaigns = async (userId) => {
    const { Campaign } = await getClientModels(userId);
    return await Campaign.find({ userId }).sort({ createdAt: -1 });
};

export const getCampaign = async (userId, id) => {
    const { Campaign } = await getClientModels(userId);
    const campaign = await Campaign.findOne({ _id: id, userId });
    return campaign;
};

export const startCampaign = async (userId, id) => {
    const { Campaign } = await getClientModels(userId);
    const campaign = await Campaign.findOne({ _id: id, userId });
    if (!campaign) throw new Error('Campaign not found');

    // Generate jobs if 0 (maybe it was draft)
    if (campaign.stats.total === 0) {
        await generateJobs(userId, id);
    }

    campaign.status = 'RUNNING';
    await campaign.save();
    return campaign;
};

export const pauseCampaign = async (userId, id) => {
    const { Campaign } = await getClientModels(userId);
    const campaign = await Campaign.findOne({ _id: id, userId });
    if (!campaign) throw new Error('Campaign not found');

    campaign.status = 'PAUSED';
    await campaign.save();
    return campaign;
};

export const deleteCampaign = async (userId, id) => {
    const { Campaign, CampaignJob } = await getClientModels(userId);
    await CampaignJob.deleteMany({ campaignId: id, userId });
    return await Campaign.findOneAndDelete({ _id: id, userId });
};
