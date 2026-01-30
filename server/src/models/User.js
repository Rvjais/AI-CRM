import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { USER_ROLES } from '../config/constants.js';

/**
 * User Schema
 * Multi-tenant user management with authentication
 */

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Don't include password in queries by default
        },
        name: {
            type: String,
            required: [true, 'Name is required'],
            trim: true,
            minlength: [2, 'Name must be at least 2 characters'],
            maxlength: [50, 'Name cannot exceed 50 characters'],
        },
        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            default: USER_ROLES.USER,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        whatsappConnected: {
            type: Boolean,
            default: false,
        },
        lastLogin: {
            type: Date,
        },
        refreshToken: {
            type: String,
            select: false,
        },
        // AI Configuration for chatbot
        aiSettings: {
            enabled: {
                type: Boolean,
                default: false,
            },
            apiKey: {
                type: String,
                select: false,
            },
            model: {
                type: String,
                default: 'gpt-3.5-turbo',
            },
            systemPrompt: {
                type: String,
                default: 'You are a helpful WhatsApp assistant.',
            },
            maxTokens: {
                type: Number,
                default: 500,
            },
            autoReply: {
                type: Boolean,
                default: false,
            },
        },
    },
    {
        timestamps: true,
    }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
    // Only hash if password is modified
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
    try {
        return await bcrypt.compare(candidatePassword, this.password);
    } catch (error) {
        throw new Error('Password comparison failed');
    }
};

// Method to get public profile
userSchema.methods.toPublicJSON = function () {
    return {
        id: this._id,
        email: this.email,
        name: this.name,
        role: this.role,
        isActive: this.isActive,
        whatsappConnected: this.whatsappConnected,
        lastLogin: this.lastLogin,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
    };
};

// Indexes
userSchema.index({ email: 1 });

const User = mongoose.model('User', userSchema);

export default User;
