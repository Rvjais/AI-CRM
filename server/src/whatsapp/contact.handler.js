
import { getClientModels } from '../utils/database.factory.js';
import logger from '../utils/logger.util.js';

export const handleContactsUpsert = async (userId, contacts) => {
    try {
        const { Contact, Chat } = await getClientModels(userId);

        // Process contacts in batches
        const updates = contacts.map(async (contact) => {
            const jid = contact.id;
            // Only care about users or LIDs, not groups/broadcasts usually (though groups have metadata elsewhere)
            if (jid.includes('@g.us') || jid.includes('@broadcast') || jid === 'status@broadcast') return;

            const name = contact.name || contact.notify || contact.verifiedName;
            if (!name) return; // Skip if no meaningful name update

            // Normalize phone number
            let phoneNumber = jid.split('@')[0];
            if (jid.includes('@lid')) {
                // If it's a LID, we might not know real phone number yet unless we have it stored
                // But we should save the name at least so our resolver can find it
            }

            // Upsert Contact
            await Contact.findOneAndUpdate(
                { userId, jid },
                {
                    name,
                    // If it's a phone JID, update phoneNumber too
                    ...(jid.includes('@s.whatsapp.net') ? { phoneNumber } : {})
                },
                { upsert: true, new: true }
            );

            // Also update Chat if it exists and we have a better name
            await Chat.findOneAndUpdate(
                { userId, chatJid: jid },
                { contactName: name }
            );

            // If we have a verified name or notify name, and it's a LID, 
            // we might want to update the corresponding Phone chat if we can link them
            // But verify logic is complex without link. 
            // My getUserChats resolver handles the lookup, so just saving to Contact is enough.
        });

        await Promise.all(updates);
        logger.info(`Synced ${contacts.length} contacts for user ${userId}`);
    } catch (error) {
        logger.error(`Error handling contacts upsert for user ${userId}:`, error);
    }
};

export const handleContactsUpdate = async (userId, updates) => {
    try {
        const { Contact, Chat } = await getClientModels(userId);

        for (const update of updates) {
            const jid = update.id;
            if (jid.includes('@g.us') || jid.includes('@broadcast')) continue;

            const name = update.name || update.notify;
            if (!name) continue;

            await Contact.findOneAndUpdate(
                { userId, jid },
                { name },
                { new: true }
            );

            await Chat.findOneAndUpdate(
                { userId, chatJid: jid },
                { contactName: name }
            );
        }
        logger.info(`Updated ${updates.length} contacts for user ${userId}`);
    } catch (error) {
        logger.error(`Error handling contacts update for user ${userId}:`, error);
    }
};
