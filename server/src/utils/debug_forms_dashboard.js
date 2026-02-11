
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

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
        // Import models dynamically to ensure connection is established first if needed, though usually standard import is fine.
        // But for script simplicity:
        const { default: Form } = await import('../models/Form.js');
        const { default: FormSubmission } = await import('../models/FormSubmission.js');

        console.log('Fetching all forms...');
        const forms = await Form.find().lean();
        console.log(`Found ${forms.length} forms.`);

        for (const form of forms) {
            console.log(`\nProcessing Form: ${form.title} (${form._id})`);

            const submissionCount = await FormSubmission.countDocuments({ formId: form._id });
            console.log(`- Total Submissions: ${submissionCount}`);

            const recentSubmissions = await FormSubmission.find({ formId: form._id })
                .sort({ submittedAt: -1 }) // Sort by date desc
                .limit(5)
                .lean();

            console.log(`- Recent Submissions Found: ${recentSubmissions.length}`);

            recentSubmissions.forEach((sub, index) => {
                console.log(`  [${index + 1}] ID: ${sub._id}`);
                console.log(`      Submitted At: ${sub.submittedAt}`);
                console.log(`      Data Type: ${typeof sub.data}`);
                console.log(`      Data Content:`, sub.data);

                // Simulate controller logic
                const email = sub.data?.email || sub.data?.Email || 'No Email';
                console.log(`      Extracted Email: ${email}`);
            });
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDone.');
    }
};

runDebug();
