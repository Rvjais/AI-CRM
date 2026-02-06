import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import './SheetsConfig.css';
import { FaPlus, FaTrash, FaSave, FaSync } from 'react-icons/fa';

function SheetsConfig() {
    const [config, setConfig] = useState({
        spreadsheetId: '',
        sheetName: 'Sheet1',
        columns: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const result = await api.get('/api/sheets/config');
            if (result.success && result.data) {
                setConfig({
                    spreadsheetId: result.data.spreadsheetId || '',
                    sheetName: result.data.sheetName || 'Sheet1',
                    columns: result.data.columns || []
                });
            }
        } catch (error) {
            console.error('Error fetching sheets config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleColumnChange = (index, field, value) => {
        const newColumns = [...config.columns];
        newColumns[index] = { ...newColumns[index], [field]: value };
        setConfig({ ...config, columns: newColumns });
    };

    const addColumn = () => {
        setConfig({
            ...config,
            columns: [...config.columns, { key: '', header: '', description: '' }]
        });
    };

    const removeColumn = (index) => {
        const newColumns = config.columns.filter((_, i) => i !== index);
        setConfig({ ...config, columns: newColumns });
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const result = await api.post('/api/sheets/config', config);
            if (result.success) {
                setMessage('Configuration saved!');
                // Automatically sync headers after save to ensure sheet structure matches
                await api.post('/api/sheets/sync-headers');
            } else {
                setMessage('Failed to save.');
            }
        } catch (error) {
            setMessage('Error saving configuration.');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleReconnect = async () => {
        try {
            const result = await api.get('/api/auth/google');
            if (result.success && result.data.url) {
                window.location.href = result.data.url;
            }
        } catch (error) {
            console.error('Error fetching auth url:', error);
            setMessage('Error starting authentication.');
        }
    };

    if (loading) return <div>Loading config...</div>;

    return (
        <div className="sheets-config">
            <div className="header-actions" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2>Google Sheets Integration</h2>
                    <p className="subtitle">Connect a Google Sheet to auto-extract chat data.</p>
                </div>
                <button
                    onClick={handleReconnect}
                    className="reconnect-btn"
                    style={{
                        background: '#4285f4',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '14px'
                    }}
                >
                    <FaSync /> Re-Authorize Google
                </button>
            </div>

            <div className="config-section">
                <div className="form-group">
                    <label>Spreadsheet ID</label>
                    <input
                        type="text"
                        value={config.spreadsheetId}
                        onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                        placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBkJ..."
                    />
                    <small>Found in your Google Sheet URL: docs.google.com/spreadsheets/d/<b>SpreadsheetID</b>/edit</small>
                </div>

                <div className="form-group">
                    <label>Sheet Name</label>
                    <input
                        type="text"
                        value={config.sheetName}
                        onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
                        placeholder="Sheet1"
                    />
                </div>
            </div>

            <div className="columns-section">
                <h3>Extraction Variables (Columns)</h3>
                <p>Define what AI should extract from the chat and where it goes in the sheet.</p>

                <div className="columns-header">
                    <span>Variable (Key)</span>
                    <span>Sheet Header</span>
                    <span>AI Instruction (Description)</span>
                    <span>Action</span>
                </div>

                {config.columns.map((col, index) => (
                    <div key={index} className="column-row">
                        <input
                            type="text"
                            placeholder="e.g. customerName"
                            value={col.key}
                            onChange={(e) => handleColumnChange(index, 'key', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="e.g. Customer Name"
                            value={col.header}
                            onChange={(e) => handleColumnChange(index, 'header', e.target.value)}
                        />
                        <input
                            type="text"
                            placeholder="e.g. The extracted name of the client"
                            value={col.description}
                            onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
                        />
                        <button className="remove-btn" onClick={() => removeColumn(index)}>
                            <FaTrash />
                        </button>
                    </div>
                ))}

                <button className="add-btn" onClick={addColumn}>
                    <FaPlus /> Add Variable
                </button>
            </div>

            <div className="actions">
                <button className="save-btn" onClick={saveConfig} disabled={saving}>
                    {saving ? 'Saving...' : <><FaSave /> Save & Sync Headers</>}
                </button>
                {message && <span className="message success">{message}</span>}
            </div>

            <div className="info-box">
                <p><strong>Note:</strong> Saving will verify your Spreadsheet ID and automatically update the first row of your sheet with the headers defined above.</p>
            </div>
        </div>
    );
}

export default SheetsConfig;
