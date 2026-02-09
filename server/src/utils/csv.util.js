/**
 * Simple CSV Parser
 * @param {Buffer|String} buffer - CSV content
 * @returns {Array} Array of objects
 */
export const parseCsv = (buffer) => {
    const content = buffer.toString().trim();
    const lines = content.split(/\r?\n/);

    if (lines.length === 0) return [];

    // Parse headers (first line)
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());

    const results = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Handle quoted values logic simplistically (split by comma ignoring commas in quotes matches)
        // For now, simple split. TODO: Use full CSV parser if complex data needed.
        const values = line.split(',');

        const row = {};

        headers.forEach((header, index) => {
            let value = values[index] ? values[index].trim() : '';
            // Remove quotes
            value = value.replace(/^"|"$/g, '');
            row[header] = value;
        });

        results.push(row);
    }

    return results;
};

/**
 * Normalizes keys to standard CRM fields
 * Mappings:
 * - Phone: phone, mobile, contact, phonenumber
 * - Name: name, firstname, fullname, contactname
 * - Email: email, mail, e-mail
 */
export const normalizeData = (data) => {
    return data.map(row => {
        // We now copy ALL keys from row to normalized
        const normalized = { ...row };

        // Find Phone (if not already found by mapping)
        const phoneKey = Object.keys(row).find(k => ['phone', 'mobile', 'cell', 'number', 'phonenumber', 'contact'].includes(k.replace(/[^a-z]/g, '')));
        if (phoneKey && !normalized.phoneNumber) normalized.phoneNumber = row[phoneKey];

        // Find Name
        const nameKey = Object.keys(row).find(k => ['name', 'firstname', 'fullname', 'username'].includes(k.replace(/[^a-z]/g, '')));
        if (nameKey && !normalized.name) normalized.name = row[nameKey];

        // Find Email
        const emailKey = Object.keys(row).find(k => ['email', 'mail', 'e-mail'].includes(k.replace(/[^a-z]/g, '')));
        if (emailKey && !normalized.email) normalized.email = row[emailKey];

        return normalized;
    });
};
