
import mongoose from 'mongoose';
import Chat from '../models/Chat.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkSentiment = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const userId = '698c68f75c1c5848ef067019'; // User from logs

        const chats = await Chat.find({ userId }).select('chatJid sentiment phoneNumber contactName');

        console.log(`Found ${chats.length} chats for user ${userId}:`);
        chats.forEach(chat => {
            console.log(`- JID: ${chat.chatJid}, Sentiment: ${chat.sentiment}, Phone: ${chat.phoneNumber}`);
        });

        // Test the aggregation used in dashboard
        const sentimentStats = await Chat.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(userId), sentiment: { $in: ['positive', 'negative'] } } },
            {
                $group: {
                    _id: '$sentiment',
                    count: { $sum: 1 }
                }
            }
        ]);
        console.log('Aggregation Result:', sentimentStats);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
};

checkSentiment();
