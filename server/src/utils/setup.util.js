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

        let adminUser = await User.findOne({ email });

        if (adminUser) {
            // Optional: Update existing admin to ensure they have the role
            if (adminUser.role !== USER_ROLES.ADMIN) {
                adminUser.role = USER_ROLES.ADMIN;
                await adminUser.save();
                logger.info('✅ Existing admin user role updated');
            } else {
                logger.info('✅ Admin user already exists');
            }
        } else {
            logger.info('Creating new admin user...');
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
