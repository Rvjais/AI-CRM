import mongoose from 'mongoose';

const formSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        default: 'Untitled Form'
    },
    description: {
        type: String,
        default: ''
    },
    fields: [{
        id: String,
        type: { type: String, required: true },
        label: String,
        placeholder: String,
        required: Boolean,
        width: { type: String, default: 'full' }, // 'full' or 'half'
        options: [String]
    }],
    theme: {
        type: String,
        default: 'blue'
    },
    customColor: {
        type: String,
        default: null
    },
    designConfig: {
        backgroundColor: { type: String, default: '#ffffff' },
        textColor: { type: String, default: '#1f2937' },
        buttonColor: { type: String, default: '#4f46e5' },
        borderRadius: { type: String, default: '0.75rem' },
        maxWidth: { type: String, default: '42rem' }, // max-w-2xl
        textAlign: { type: String, default: 'left' },
        fontSize: { type: String, default: '1rem' }, // base
        titleColor: { type: String, default: '#111827' },
        fontFamily: { type: String, default: 'system-ui, -apple-system, sans-serif' },
        padding: { type: String, default: '2rem' },
        minHeight: { type: String, default: 'auto' }, // Allow empty or specific height
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, {
    timestamps: true
});

export default formSchema;
