import mongoose from 'mongoose';
import campaignJobSchema from '../schemas/CampaignJob.schema.js';

const CampaignJob = mongoose.model('CampaignJob', campaignJobSchema);

export default CampaignJob;
