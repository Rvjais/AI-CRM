import mongoose from 'mongoose';

const formSubmissionSchema = new mongoose.Schema({
    formId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Form',
        required: true
    },
    data: {
        type: Map,
        of: mongoose.Schema.Types.Mixed
    },
    submittedAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default formSubmissionSchema;
