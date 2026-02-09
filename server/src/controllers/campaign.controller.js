import * as campaignService from '../services/campaign.service.js';
import { successResponse } from '../utils/response.util.js';
import { asyncHandler } from '../middleware/error.middleware.js';

export const createCampaign = asyncHandler(async (req, res) => {
    const result = await campaignService.createCampaign(req.userId, req.body);
    return successResponse(res, 201, 'Campaign created successfully', result);
});

export const getCampaigns = asyncHandler(async (req, res) => {
    const result = await campaignService.getCampaigns(req.userId);
    return successResponse(res, 200, 'Campaigns retrieved successfully', result);
});

export const getCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await campaignService.getCampaign(req.userId, id);
    if (!result) throw new Error('Campaign not found');
    return successResponse(res, 200, 'Campaign retrieved successfully', result);
});

export const startCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await campaignService.startCampaign(req.userId, id);
    return successResponse(res, 200, 'Campaign started successfully', result);
});

export const pauseCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const result = await campaignService.pauseCampaign(req.userId, id);
    return successResponse(res, 200, 'Campaign paused successfully', result);
});

export const deleteCampaign = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await campaignService.deleteCampaign(req.userId, id);
    return successResponse(res, 200, 'Campaign deleted successfully');
});
