import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from './src/models/User.js';
import { USER_ROLES } from './src/config/constants.js';

dotenv.config();

const createAdmin = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const email = 'admin@raincrm.com';
        const password = 'Password';

        let adminUser = await User.findOne({ email });

        if (adminUser) {
            console.log('Admin user found, updating role/password...');
            adminUser.role = USER_ROLES.ADMIN;
            adminUser.password = password; // Request explicitly asked for this password
            adminUser.name = 'Admin';
            await adminUser.save();
        } else {
            console.log('Creating new admin user...');
            adminUser = await User.create({
                name: 'Admin',
                email,
                password,
                role: USER_ROLES.ADMIN,
                isActive: true
            });
        }

        console.log(`
        ✅ Admin User Ready!
        Username/Email: ${email}
        Password: ${password}
        `);

        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
