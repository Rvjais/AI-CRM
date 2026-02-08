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

    console.log(`Fixing data for user: ${user.email} (${user._id})`);

    const { Contact, Chat, Message } = await getClientModels(user._id);

    // 1. Clean up BAD phone numbers (where phoneNumber == LidID)
    const badContacts = await Contact.find({ jid: { $regex: /@lid/ } });
    for (const c of badContacts) {
        const lidId = c.jid.split('@')[0];
        if (c.phoneNumber === lidId) {
            console.log(`Clearing bad phone number for ${c.jid}`);
            c.phoneNumber = null;
            await c.save();
        }
    }

    // 2. Manual Link: 244465394540666@lid -> 919789565515
    const lidJid = '244465394540666@lid';
    const realPhoneNumber = '919789565515';
    const realPhoneJid = `${realPhoneNumber}@s.whatsapp.net`;

    console.log(`Manually linking ${lidJid} -> ${realPhoneNumber}`);

    await Contact.updateOne(
        { userId: user._id, jid: lidJid },
        { $set: { phoneNumber: realPhoneNumber } },
        { upsert: true }
    );

    // 3. Migrate Messages
    const updateResult = await Message.updateMany(
        { userId: user._id, chatJid: lidJid },
        { $set: { chatJid: realPhoneJid } }
    );
    console.log(`Migrated ${updateResult.modifiedCount} messages`);

    // 4. Delete old Chat
    await Chat.deleteOne({ userId: user._id, chatJid: lidJid });
    console.log('Deleted old LID chat');

    console.log('Done.');
    process.exit(0);
};

run();
