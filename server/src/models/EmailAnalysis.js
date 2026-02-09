import mongoose from 'mongoose';

const emailAnalysisSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    threadId: {
        type: String,
        required: true,
        index: true
    },
    sentiment: {
        type: String,
        enum: ['positive', 'neutral', 'negative'],
        default: 'neutral'
    },
    summary: {
        type: String
    },
    importanceScore: {
        type: Number,
        min: 1,
        max: 10
    },
    importanceReason: {
        type: String
    },
    analyzedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Compound index to ensure one analysis per thread per user
emailAnalysisSchema.index({ userId: 1, threadId: 1 }, { unique: true });

const EmailAnalysis = mongoose.model('EmailAnalysis', emailAnalysisSchema);

export default EmailAnalysis;
