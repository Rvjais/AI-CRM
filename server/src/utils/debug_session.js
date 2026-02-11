
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
        console.log('--- Debug Start ---');

        // List Collections
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Found Collections:', collections.map(c => c.name));

        const user = await User.findOne({});
        if (!user) { console.log('No user found'); return; }

        console.log(`User: ${user._id} (${user.name})`);
        console.log(`User.whatsappConnected: ${user.whatsappConnected}`);

        // Use Model dynamically
        const { default: WhatsAppSession } = await import('../models/WhatsAppSession.js');
        const count = await WhatsAppSession.countDocuments();
        console.log(`WhatsAppSession Documents Total: ${count}`);

        const sessions = await WhatsAppSession.find({});
        sessions.forEach(s => {
            console.log(`- Session: ${s._id}, User: ${s.userId}, Status: ${s.status}, LastConn: ${s.lastConnected}`);
        });

        const userSession = await WhatsAppSession.findOne({ userId: user._id });
        if (!userSession) {
            console.log('⚠️  CRITICAL: No WhatsAppSession found for this user!');
            console.log('  -> This explains why getSelfJid returns null.');
            console.log('  -> The user needs to scan QR code again to create a session.');
        } else {
            console.log('User Session details:', {
                status: userSession.status,
                lastConnected: userSession.lastConnected,
                phoneNumber: userSession.phoneNumber,
                hasCreds: !!userSession.credentials
            });

            if (userSession.status !== 'connected') {
                console.log('⚠️  Session exists but status is NOT connected.');
            }
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('--- Debug Done ---');
    }
};

runDebug();
