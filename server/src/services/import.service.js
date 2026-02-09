import ImportBatch from '../models/ImportBatch.js';
import { getClientModels } from '../utils/database.factory.js';
import { parseCsv, normalizeData } from '../utils/csv.util.js';
import logger from '../utils/logger.util.js';

export const processImport = async (userId, file, type = 'WHATSAPP', mappingStr = '{}') => {
    let batchId = null;
    const mapping = typeof mappingStr === 'string' ? JSON.parse(mappingStr) : mappingStr;

    try {
        const { Contact } = await getClientModels(userId);

        // 1. Create Batch Record
        const batch = await ImportBatch.create({
            userId,
            filename: file.filename || `upload_${Date.now()}.csv`,
            originalName: file.originalname,
            type,
            status: 'PROCESSING'
        });

        batchId = batch._id;

        // 2. Parse CSV
        const rawData = parseCsv(file.buffer);
        const normalizedData = normalizeData(rawData);

        logger.info(`[Import] Parsed ${normalizedData.length} rows from ${file.originalname}`);

        // 3. Process Rows
        let validCount = 0;
        let duplicateCount = 0;
        let errorCount = 0;
        const errorLog = [];
        const tagName = `import_${new Date().toISOString().split('T')[0]}_${file.originalname.replace(/[^a-zA-Z0-9]/g, '')}`;

        // Add tag to batch
        batch.tags.push(tagName);
        await batch.save();

        for (let i = 0; i < normalizedData.length; i++) {
            const row = normalizedData[i];

            try {
                // Determine Phone and Name based on mapping or normalization
                let phoneNumber;
                if (mapping.phone) {
                    // Try exact match first, then lowercase
                    phoneNumber = row[mapping.phone] || row[mapping.phone.toLowerCase()];
                } else {
                    phoneNumber = row.phoneNumber; // Fallback to normalized data's inferred phone number
                }

                let name;
                if (mapping.name) {
                    name = row[mapping.name] || row[mapping.name.toLowerCase()];
                } else {
                    name = row.name; // Fallback to normalized data's inferred name
                }

                let email;
                if (mapping.email) {
                    email = row[mapping.email] || row[mapping.email.toLowerCase()];
                } else {
                    email = row.email; // Fallback to normalized data's inferred email
                }

                // Validate
                if (type === 'WHATSAPP' && !phoneNumber) throw new Error('Missing Phone Number');
                if (type === 'EMAIL' && !email) throw new Error('Missing Email');

                // Construct JID
                let jid = null;
                if (phoneNumber) {
                    const cleanPhone = String(phoneNumber).replace(/\D/g, ''); // Ensure phoneNumber is string
                    if (cleanPhone.length < 10) throw new Error('Invalid Phone Number');
                    jid = `${cleanPhone}@s.whatsapp.net`;
                    phoneNumber = cleanPhone;
                }

                // Upsert Filter
                const filter = {};
                if (jid) filter.jid = jid;
                else if (email) filter.email = email;

                // Fallback JID for email-only
                if (!jid && email) {
                    jid = `${String(email).replace(/@/g, '_at_')}@email.placeholder`; // Ensure email is string
                    filter.email = email;
                }

                // Prepare Custom Attributes (All CSV columns)
                const customAttributes = {};
                Object.keys(row).forEach(key => {
                    // Exclude keys that are explicitly mapped or inferred by normalizeData
                    const lowerKey = key.toLowerCase();
                    const mappedPhoneKey = mapping.phone ? mapping.phone.toLowerCase() : null;
                    const mappedNameKey = mapping.name ? mapping.name.toLowerCase() : null;
                    const mappedEmailKey = mapping.email ? mapping.email.toLowerCase() : null;

                    if (lowerKey !== 'phonenumber' && lowerKey !== 'name' && lowerKey !== 'email' &&
                        lowerKey !== mappedPhoneKey && lowerKey !== mappedNameKey && lowerKey !== mappedEmailKey) {
                        customAttributes[key] = row[key];
                    }
                });

                // Update Ops
                const update = {
                    $addToSet: { tags: tagName },
                    $set: {
                        userId, // Ensure userId is set
                        source: 'IMPORT',
                        importBatchId: batch._id,
                        customAttributes: customAttributes // Store all extra data
                    }
                };

                if (name) update.$set.name = name;
                if (email) update.$set.email = email;
                if (phoneNumber) update.$set.phoneNumber = phoneNumber;

                if (!filter.jid) filter.jid = jid;

                const result = await Contact.findOneAndUpdate(
                    filter,
                    update,
                    { upsert: true, new: true, rawResult: true }
                );

                if (result.lastErrorObject?.updatedExisting) {
                    duplicateCount++;
                } else {
                    validCount++;
                }

            } catch (err) {
                errorCount++;
                errorLog.push({ row: i + 1, error: err.message });
            }
        }

        // 4. Update Batch Status
        batch.status = 'COMPLETED';
        batch.stats = {
            total: normalizedData.length,
            valid: validCount,
            duplicates: duplicateCount,
            errors: errorCount
        };
        batch.errorLog = errorLog;
        await batch.save();

        return batch;

    } catch (error) {
        logger.error('[Import] Error:', error);
        if (batchId) {
            await ImportBatch.findByIdAndUpdate(batchId, {
                status: 'FAILED',
                errorLog: [{ row: 0, error: error.message }]
            });
        }
        throw error;
    }
};

export const listBatches = async (userId) => {
    return await ImportBatch.find({ userId }).sort({ createdAt: -1 });
};

// ... existing code ...
export const deleteBatch = async (userId, batchId) => {
    // Optional: Also remove tags from contacts?
    // For now just delete the batch record
    return await ImportBatch.findOneAndDelete({ _id: batchId, userId });
};

export const getBatchSample = async (userId, batchId) => {
    const { Contact } = await getClientModels(userId);
    // Get 1 random contact from this batch
    const sample = await Contact.findOne({ userId, importBatchId: batchId }).select('name phoneNumber email customAttributes');
    return sample;
};
