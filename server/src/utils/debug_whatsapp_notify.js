
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import * as whatsappService from '../services/whatsapp.service.js';
import User from '../models/User.js';

// Convert current file URL to path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('MongoDB Connected');
    } catch (err) {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    }
};

const runDebug = async () => {
    await connectDB();

    try {
        // Fetch the first user (assuming single user for now or configurable)
        // In this context, we usually have one main user
        const user = await User.findOne({});
        if (!user) {
            console.error('No user found');
            return;
        }

        console.log(`User found: ${user._id} (${user.name})`);

        // Check connection status
        // Note: isConnected checks in-memory map. 
        // If this script runs in a separate process from the main server, 
        // it WON'T share the in-memory 'connections' map.
        // THIS IS A LIMITATION OF THIS DEBUG SCRIPT approach if run as standalone node process.
        // HOWEVER, we can check the database status.

        console.log('Checking User DB WhatsApp Status:', user.whatsappConnected);

        // Since we can't access the running server's memory from here, 
        // we can't test 'sendMessage' directly unless we spin up a new connection, 
        // which might conflict with the main server.

        // Instead, let's inject a "Test Notification" logic into the RUNNING server via a temporary endpoint or log inspection.
        // OR, simply add extensive logging to the controller as planned.

        // BUT, wait! the 'whatsappService' in THIS script will have empty 'connections' map.
        // So 'getSelfJid' will return null.

        console.log('⚠️  CANNOT test live connection from separate script because connections are in-memory.');
        console.log('⚠️  Switching strategy: Adding verbose logging to the controllers.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Done.');
    }
};

runDebug();
