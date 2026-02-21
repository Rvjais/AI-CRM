import { getClientModels } from '../utils/database.factory.js';
import logger from '../utils/logger.util.js';

// Get all agents
export const getAgents = async (req, res) => {
    try {
        const { VoiceAgent } = await getClientModels(req.user.id);
        const agents = await VoiceAgent.find().sort({ createdAt: -1 });
        res.json({ success: true, count: agents.length, data: agents });
    } catch (error) {
        logger.error('Error fetching agents:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single agent
export const getAgent = async (req, res) => {
    try {
        const { VoiceAgent } = await getClientModels(req.user.id);
        const agent = await VoiceAgent.findById(req.params.agentId);
        if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.json({ success: true, data: agent });
    } catch (error) {
        logger.error('Error fetching agent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Create agent
export const createAgent = async (req, res) => {
    try {
        const { name, bolna_agent_id, prompt } = req.body;
        const { VoiceAgent } = await getClientModels(req.user.id);
        const newAgent = await VoiceAgent.create({ name, bolna_agent_id, prompt });
        res.status(201).json({ success: true, data: newAgent });
    } catch (error) {
        logger.error('Error creating agent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Update agent
export const updateAgent = async (req, res) => {
    try {
        const { VoiceAgent } = await getClientModels(req.user.id);
        const agent = await VoiceAgent.findByIdAndUpdate(req.params.agentId, req.body, { new: true, runValidators: true });
        if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.json({ success: true, data: agent });
    } catch (error) {
        logger.error('Error updating agent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Delete agent
export const deleteAgent = async (req, res) => {
    try {
        const { VoiceAgent } = await getClientModels(req.user.id);
        const agent = await VoiceAgent.findByIdAndDelete(req.params.agentId);
        if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });
        res.json({ success: true, data: {} });
    } catch (error) {
        logger.error('Error deleting agent:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};
