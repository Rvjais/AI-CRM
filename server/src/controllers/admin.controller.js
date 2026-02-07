import User from '../models/User.js';
import { successResponse, errorResponse } from '../utils/response.util.js';

/**
 * Get all users with stats
 */
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select('-password -__v')
            .sort({ createdAt: -1 });

        return successResponse(res, 200, 'Users fetched successfully', users);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Toggle user suspension (active status)
 */
export const toggleUserSuspension = async (req, res) => {
    try {
        const { userId } = req.params;
        const { isActive } = req.body;

        const user = await User.findByIdAndUpdate(
            userId,
            { isActive },
            { new: true }
        ).select('-password');

        if (!user) {
            return errorResponse(res, 404, 'User not found');
        }

        const action = isActive ? 'activated' : 'suspended';
        return successResponse(res, 200, `User ${action} successfully`, user);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Get Admin Dashboard Stats
 */
export const getAdminStats = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeUsers = await User.countDocuments({ role: 'user', isActive: true });
        // Use User model's status since sessions are sharded
        const connectedSessions = await User.countDocuments({ whatsappConnected: true });

        // Total messages is hard to aggregate across all tenant DBs efficiently. 
        // We could track it in User model if needed, but for now omitting or setting to 0.
        const totalMessages = 0;

        const stats = {
            totalUsers,
            activeUsers,
            connectedSessions,
            totalMessages
        };

        return successResponse(res, 200, 'Stats fetched successfully', stats);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Update User (Credits, Name, etc.)
 * PUT /api/admin/users/:userId
 */
export const updateUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const updates = req.body;

        // allowed fields
        const allowedUpdates = ['name', 'email', 'credits', 'isActive', 'role'];
        const filteredUpdates = Object.keys(updates)
            .filter(key => allowedUpdates.includes(key))
            .reduce((obj, key) => {
                obj[key] = updates[key];
                return obj;
            }, {});

        const user = await User.findByIdAndUpdate(userId, filteredUpdates, { new: true }).select('-password');

        if (!user) return errorResponse(res, 404, 'User not found');

        return successResponse(res, 200, 'User updated successfully', user);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};

/**
 * Delete User
 * DELETE /api/admin/users/:userId
 */
export const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findByIdAndDelete(userId);

        if (!user) return errorResponse(res, 404, 'User not found');

        // Note: We are strictly deleting the User record from Master DB.
        // We do NOT drop their external Client DB (BYOD).

        return successResponse(res, 200, 'User deleted successfully', null);
    } catch (error) {
        return errorResponse(res, 500, error.message);
    }
};
