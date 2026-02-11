import User from '../models/User.js';
import { USER_ROLES } from '../config/constants.js';
import logger from './logger.util.js';

/**
 * Setup utility
 * Runs on server startup to ensure necessary database records exist
 */

export const ensureAdminUser = async () => {
    try {
        const email = 'admin@raincrm.com';
        const password = 'Password'; // In a real scenario, this should be an env var or complex default

        console.log('DEBUG: ensureAdminUser - Finding user...');
        let adminUser = await User.findOne({ email });
        console.log('DEBUG: ensureAdminUser - User found?', !!adminUser);

        if (adminUser) {
            // Optional: Update existing admin to ensure they have the role
            if (adminUser.role !== USER_ROLES.ADMIN) {
                console.log('DEBUG: ensureAdminUser - Updating role...');
                adminUser.role = USER_ROLES.ADMIN;
                await adminUser.save();
                console.log('✅ Existing admin user role updated');
            } else {
                console.log('✅ Admin user already exists');
            }
        } else {
            console.log('Creating new admin user...');
            adminUser = await User.create({
                name: 'Admin',
                email,
                password,
                role: USER_ROLES.ADMIN,
                isActive: true
            });
            logger.info('✅ Admin user created successfully');
            logger.info(`Credentials: ${email} / ${password}`);
        }
    } catch (error) {
        logger.error('❌ Error ensuring admin user:', error);
        // Don't crash the server, just log the error
    }
};
