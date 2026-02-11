import mongoose from 'mongoose';
import User from '../src/models/User.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (error) {
        console.error('MongoDB Connection Error:', error);
        process.exit(1);
    }
};

const fixUserDB = async () => {
    try {
        await connectDB();

        // Get all users, selecting mongoURI which is usually hidden
        const users = await User.find({}).select('+mongoURI');

        if (users.length === 0) {
            console.log('No users found.');
            return;
        }

        console.log(`Found ${users.length} users.`);

        for (const user of users) {
            console.log(`\nUser: ${user.email} (${user._id})`);
            console.log(`Current mongoURI: ${user.mongoURI ? 'SET' : 'MISSING'}`);

            if (!user.mongoURI) {
                console.log(' -> Fixing missing mongoURI...');
                // In single-DB architecture, we use the main MONGODB_URI
                user.mongoURI = process.env.MONGODB_URI;
                user.infrastructureReady = true;
                await user.save();
                console.log(' -> FIXED.');
            } else {
                console.log(' -> OK.');
            }
        }

    } catch (error) {
        console.error('Fix script error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
    }
};

fixUserDB();
