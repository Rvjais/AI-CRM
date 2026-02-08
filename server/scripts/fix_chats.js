import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';
import { normalizeChats } from '../src/services/message.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

const run = async () => {
    await connectDB();

    console.log('Fetching users...');
    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
        console.log(`Processing user: ${user.email} (${user._id})`);
        const result = await normalizeChats(user._id);
        if (result.success) {
            console.log(`  Normalized: ${result.migratedMessages} messages migrated.`);
        } else {
            console.error(`  Error: ${result.error}`);
        }
    }

    console.log('Done!');
    process.exit(0);
};

run();
