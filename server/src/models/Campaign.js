import mongoose from 'mongoose';
import campaignSchema from '../schemas/Campaign.schema.js';

const Campaign = mongoose.model('Campaign', campaignSchema);

export default Campaign;
