import { getClientModels } from '../utils/database.factory.js';
import logger from '../utils/logger.util.js';

// Get all executions directly from Bolna API
export const getExecutions = async (req, res) => {
    try {
        const { VoiceAgent } = await getClientModels(req.user.id);
        const agents = await VoiceAgent.find();
        const bolna = await import('../services/bolna.service.js');

        let allExecutions = [];

        for (const agent of agents) {
            if (!agent.bolna_agent_id) continue;
            try {
                const response = await bolna.fetchAgentExecutions(agent.bolna_agent_id);
                if (response && response.data && Array.isArray(response.data)) {
                    // Map Bolna structure to our expected UI structure
                    const mappedData = response.data.map(exec => ({
                        _id: exec.id,
                        call_id: exec.id,
                        bolna_agent_id: exec.agent_id,
                        recipientPhone: exec.telephony_data?.to_number || 'Unknown',
                        status: exec.status,
                        duration: exec.telephony_data?.duration ? parseInt(exec.telephony_data.duration) : (exec.conversation_time || 0),
                        cost: exec.total_cost || 0,
                        transcript: exec.transcript || '',
                        createdAt: exec.created_at ? new Date(exec.created_at) : new Date(),
                    }));
                    allExecutions = [...allExecutions, ...mappedData];
                }
            } catch (err) {
                logger.error(`Failed to fetch live executions for agent ${agent.name}:`, err);
            }
        }

        // Sort by newest first
        allExecutions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        res.json({ success: true, count: allExecutions.length, data: allExecutions });
    } catch (error) {
        logger.error('Error fetching live executions:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get single execution (Currently unsupported via Bolna direct fetch in our scope, keeping stub)
export const getExecution = async (req, res) => {
    res.status(501).json({ success: false, message: 'Not implemented for real-time Bolna fetching' });
};

// Get execution stats directly from Bolna API
export const getExecutionStats = async (req, res) => {
    try {
        const { VoiceAgent } = await getClientModels(req.user.id);
        const agents = await VoiceAgent.find();
        const bolna = await import('../services/bolna.service.js');

        let totalCalls = 0;
        let totalExpense = 0;
        let totalTalkTime = 0;

        for (const agent of agents) {
            if (!agent.bolna_agent_id) continue;
            try {
                const response = await bolna.fetchAgentExecutions(agent.bolna_agent_id);
                if (response && response.data && Array.isArray(response.data)) {
                    response.data.forEach(exec => {
                        totalCalls++;
                        totalExpense += exec.total_cost || 0;
                        const duration = exec.telephony_data?.duration ? parseInt(exec.telephony_data.duration) : (exec.conversation_time || 0);
                        totalTalkTime += duration;
                    });
                }
            } catch (err) {
                logger.error(`Failed to fetch stats for agent ${agent.name}:`, err);
            }
        }

        const activeAgentsCount = agents.filter(a => a.status === 'active').length;
        const avgTalkTime = totalCalls > 0 ? Math.round(totalTalkTime / totalCalls) : 0;

        res.json({
            success: true,
            data: {
                totalCalls,
                totalExpense,
                totalTalkTime,
                activeAgentsCount,
                avgTalkTime
            }
        });
    } catch (error) {
        logger.error('Error calculating live stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// Sync execution history from Bolna (Now a no-op since data is live)
export const syncHistory = async (req, res) => {
    res.json({ success: true, message: 'Data is now fetched live from Bolna, syncing is no longer required.' });
};
