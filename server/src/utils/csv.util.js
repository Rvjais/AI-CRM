/**
 * Simple CSV Parser
 * @param {Buffer|String} buffer - CSV content
 * @returns {Array} Array of objects
 */
export const parseCsv = (buffer) => {
    const content = buffer.toString().trim().replace(/^\uFEFF/, ''); // Remove BOM
    const lines = content.split(/\r?\n/);
    if (lines.length === 0) return [];

    // Regex to match CSV fields: 
    // 1. Quoted fields: "([^"]*(?:""[^"]*)*)"
    // 2. Standard fields: ([^",]+)
    // 3. Empty fields: (,, or ,$) handled by loop
    const parseLine = (text) => {
        const result = [];
        let start = 0;
        let inQuotes = false;
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '"') {
                inQuotes = !inQuotes;
            } else if (text[i] === ',' && !inQuotes) {
                let field = text.substring(start, i);
                // Remove surrounding quotes and unescape double quotes
                if (field.startsWith('"') && field.endsWith('"')) {
                    field = field.slice(1, -1).replace(/""/g, '"');
                }
                result.push(field.trim());
                start = i + 1;
            }
        }
        // Last field
        let lastField = text.substring(start);
        if (lastField.startsWith('"') && lastField.endsWith('"')) {
            lastField = lastField.slice(1, -1).replace(/""/g, '"');
        }
        result.push(lastField.trim());
        return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase());

    const results = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        const values = parseLine(line);
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
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
