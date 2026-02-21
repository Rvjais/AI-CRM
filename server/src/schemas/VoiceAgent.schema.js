import mongoose from 'mongoose';

const voiceAgentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    bolna_agent_id: {
        type: String,
        required: true
    },
    prompt: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true
});

export default voiceAgentSchema;
