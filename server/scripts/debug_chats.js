import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../src/models/User.js';
import { getClientModels } from '../src/utils/database.factory.js';

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

    // Get the main user (ranveer)
    const user = await User.findOne({ email: 'ranveerjais9984@gmail.com' });
    if (!user) {
        console.log('User not found');
        process.exit(1);
    }

    console.log(`Analyzing data for user: ${user.email} (${user._id})`);

    const { Chat, Contact } = await getClientModels(user._id);

    // 1. Dump all Chats
    const chats = await Chat.find({}).lean();
    console.log('\n--- CHATS ---');
    chats.forEach(c => {
        console.log(`JID: ${c.chatJid} | Name: ${c.contactName} | Phone: ${c.phoneNumber} | LID? ${c.chatJid.includes('@lid')}`);
    });

    // 3. Inspect messages for the problematic LID
    const lidJid = '244465394540666@lid';
    const { Message } = await getClientModels(user._id);
    const messages = await Message.find({ userId: user._id, chatJid: lidJid }).sort({ timestamp: -1 }).limit(5).lean();

    console.log(`\n--- MESSAGES for ${lidJid} ---`);
    messages.forEach(m => {
        console.log(`ID: ${m.messageId} | FromMe: ${m.fromMe} | SenderPn: ${m.senderPn} | RemoteJid: ${m.key?.remoteJid}`);
    });

    process.exit(0);
};

run();
