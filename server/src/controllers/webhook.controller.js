import { asyncHandler } from '../middleware/error.middleware.js';
import { successResponse } from '../utils/response.util.js';
import User from '../models/User.js';
import logger from '../utils/logger.util.js';

/**
 * Webhook Controller
 * Handles external webhooks (Pabbly, etc.)
 */

/**
 * Handle Pabbly Subscription Webhook
 * POST /api/webhooks/pabbly
 * Expected paylod: { email, subscription_id, plan_id, status, ... }
 */
export const handlePabblyWebhook = asyncHandler(async (req, res) => {
    const data = req.body;
    logger.info('Received Pabbly Webhook:', JSON.stringify(data));

    // Basic Validation
    // Pabbly sends data in various formats depending on trigger. Adjust as needed.
    // Assuming we map fields in Pabbly to send: email, subscription_id, event_type

    // Example Pabbly payload fields (you configure this in Pabbly)
    // We expect: email, subscription_id, credits_to_add (optional), event_type

    const { email, subscription_id, event_type, credits } = data;

    if (!email) {
        throw new Error('Email is required in webhook payload');
    }

    const user = await User.findOne({ email });
    if (!user) {
        logger.warn(`Pabbly Webhook: User not found for email ${email}`);
        // Return 200 to Pabbly so it doesn't retry indefinitely for bad emails
        return successResponse(res, 200, 'User not found, webhook ignored');
    }

    // Logic based on event_type
    // 'subscription_created', 'payment_success', 'subscription_cancelled'

    // Default logic: If payment success or subscription created, update sub ID and add credits
    if (event_type === 'payment_success' || event_type === 'subscription_created') {
        user.pabblySubscriptionId = subscription_id || user.pabblySubscriptionId;

        // Add credits if provided
        if (credits) {
            const creditAmount = parseInt(credits, 10);
            if (!isNaN(creditAmount)) {
                user.credits = (user.credits || 0) + creditAmount;
                logger.info(`Added ${creditAmount} credits to user ${user.email}`);
            }
        } else {
            // Default credit allocation based on plan? 
            // For now, let's assume Pabbly sends the 'credits' field or we do nothing if not provided.
            // Or we could have a map of plan_id -> credits here.
        }

        await user.save();
    } else if (event_type === 'subscription_cancelled') {
        // Handle cancellation (maybe strict access?)
        logger.info(`Subscription cancelled for user ${user.email}`);
        // We might not want to remove credits immediately, just log it.
        user.pabblySubscriptionId = null; // Optional: clear it
        await user.save();
    }

    return successResponse(res, 200, 'Webhook processed successfully');
});
