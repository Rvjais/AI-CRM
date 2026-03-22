import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '../../.env') });

const MONGO_URI = process.env.MONGODB_URI;

if (!MONGO_URI) {
    console.error('❌ MONGODB_URI not found in environment variables');
    process.exit(1);
}

const PROTECTED_COLLECTIONS = ['users', 'user']; // Strictly keep user data

async function cleanupMaster() {
    try {
        console.log('🔌 Connecting to Master Database...');
        await mongoose.connect(MONGO_URI);
        console.log('✅ Connected.');

        const db = mongoose.connection.db;
        const currentCollections = await db.listCollections().toArray();
        const collectionNames = currentCollections.map(c => c.name);

        console.log(`🔍 Found ${collectionNames.length} total collections.`);

        for (const name of collectionNames) {
            if (PROTECTED_COLLECTIONS.includes(name)) {
                console.log(`🛡️  Keeping protected collection: ${name}`);
                continue;
            }

            // Also check for case-insensitive 'users' just in case
            if (name.toLowerCase() === 'users') {
                console.log(`🛡️  Keeping protected collection: ${name}`);
                continue;
            }

            console.log(`🗑️  Dropping collection: ${name}...`);
            await db.dropCollection(name);
            console.log(`✅ ${name} dropped.`);
        }

        console.log('\n✨ Deep Cleanup Complete! Master Database now contains ONLY users.');
        console.log('🔒 Account credentials and tenant mappings are safe.');

    } catch (error) {
        console.error('❌ Cleanup failed:', error);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

// Security: Check for a flag to prevent accidental runs
if (process.argv.includes('--force')) {
    cleanupMaster();
} else {
    console.log('⚠️  DRY RUN: Use --force to actually delete data.');
    console.log('Target collections:', COLLECTIONS_TO_CLEAN);
    process.exit(0);
}
