import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import { FaUpload, FaTrash, FaWhatsapp, FaEnvelope, FaFileCsv, FaArrowRight, FaCheck } from 'react-icons/fa';
import './ImportManager.css';

function ImportManager() {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState('WHATSAPP');

    // Mapping State
    const [step, setStep] = useState(1); // 1: Select File, 2: Map Columns
    const [selectedFile, setSelectedFile] = useState(null);
    const [csvHeaders, setCsvHeaders] = useState([]);
    const [mapping, setMapping] = useState({ phone: '', name: '', email: '' });

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/imports');
            if (res.success) {
                setBatches(res.data);
            }
        } catch (error) {
            console.error('Error fetching imports:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setSelectedFile(file);

        // Parse headers client-side
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target.result;
            const firstLine = text.split('\n')[0];
            if (firstLine) {
                // Filter out empty headers to avoid "key" issues and useless columns
                const headers = firstLine.split(',')
                    .map(h => h.trim().replace(/^"|"$/g, ''))
                    .filter(h => h.length > 0);

                setCsvHeaders(headers);

                // Auto-detect columns
                const newMapping = { phone: '', name: '', email: '' };
                headers.forEach(h => {
                    const lower = h.toLowerCase();
                    if (['phone', 'mobile', 'cell', 'number', 'contact'].some(k => lower.includes(k))) newMapping.phone = h;
                    if (['name', 'user', 'first'].some(k => lower.includes(k))) newMapping.name = h;
                    if (['email', 'mail'].some(k => lower.includes(k))) newMapping.email = h;
                });
                setMapping(newMapping);
                setStep(2); // Move to mapping step
            }
        };
        reader.readAsText(file);

        // Reset input so same file can be selected again
        event.target.value = null;
    };

    const handleUpload = async () => {
        if (!selectedFile) return;
        if (selectedType === 'WHATSAPP' && !mapping.phone) return alert('Please select a Phone Number column');
        if (selectedType === 'EMAIL' && !mapping.email) return alert('Please select an Email column');

        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', selectedType);
        formData.append('mapping', JSON.stringify(mapping));

        try {
            const res = await api.post('/api/imports/upload', formData);
            if (res.success) {
                fetchBatches();
                setStep(1);
                setSelectedFile(null);
            }
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed: ' + (error.response?.data?.message || error.message));
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this list?')) return;
        try {
            await api.delete(`/api/imports/${id}`);
            fetchBatches();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    return (
        <div className="import-manager">
            <header className="page-header">
                <h2>Audience & Imports</h2>
                <p>Upload CSV files to create target lists for your campaigns.</p>
            </header>

            <div className="upload-section">
                {step === 1 && (
                    <>
                        <div className="upload-options">
                            <label>List Type:</label>
                            <div className="type-selector">
                                <button
                                    className={selectedType === 'WHATSAPP' ? 'active' : ''}
                                    onClick={() => setSelectedType('WHATSAPP')}
                                >
                                    <FaWhatsapp /> WhatsApp
                                </button>
                                <button
                                    className={selectedType === 'EMAIL' ? 'active' : ''}
                                    onClick={() => setSelectedType('EMAIL')}
                                >
                                    <FaEnvelope /> Email
                                </button>
                            </div>
                        </div>

                        <div className="file-drop-area">
                            <input
                                type="file"
                                id="csv-upload"
                                accept=".csv"
                                onChange={handleFileSelect}
                                disabled={uploading}
                            />
                            <label htmlFor="csv-upload" className="drop-label">
                                <FaUpload className="upload-icon" />
                                <span>Click to select <strong>.csv</strong> file</span>
                                <small>You can map columns in the next step</small>
                            </label>
                        </div>
                    </>
                )}

                {step === 2 && (
                    <div className="mapping-ui">
                        <h3><FaFileCsv /> Map Your Columns</h3>
                        <p>Tell us which columns match our fields.</p>

                        <div className="mapping-grid">
                            <div className="mapping-row">
                                <label>Phone Number <span className="required">*</span></label>
                                <div className="arrow"><FaArrowRight /></div>
                                <select
                                    value={mapping.phone}
                                    onChange={e => setMapping({ ...mapping, phone: e.target.value })}
                                    className={selectedType === 'WHATSAPP' && !mapping.phone ? 'invalid' : ''}
                                >
                                    <option value="">-- Select Column --</option>
                                    {csvHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
                                </select>
                            </div>

                            <div className="mapping-row">
                                <label>Full Name</label>
                                <div className="arrow"><FaArrowRight /></div>
                                <select
                                    value={mapping.name}
                                    onChange={e => setMapping({ ...mapping, name: e.target.value })}
                                >
                                    <option value="">-- Select Column --</option>
                                    {csvHeaders.map((h, i) => <option key={i} value={h}>{h}</option>)}
                                </select>
                            </div>

                            {selectedType === 'EMAIL' && (
                                <div className="mapping-row">
                                    <label>Email <span className="required">*</span></label>
                                    <div className="arrow"><FaArrowRight /></div>
                                    <select
                                        value={mapping.email}
                                        onChange={e => setMapping({ ...mapping, email: e.target.value })}
                                        className={!mapping.email ? 'invalid' : ''}
                                    >
                                        <option value="">-- Select Column --</option>
                                        {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            )}

                            <div className="mapping-info">
                                <p><small>All other columns ({csvHeaders.filter(h => h !== mapping.phone && h !== mapping.name && h !== mapping.email).join(', ')}) will be imported as dynamic variables.</small></p>
                            </div>
                        </div>

                        <div className="mapping-actions">
                            <button className="btn-secondary" onClick={() => { setStep(1); setSelectedFile(null); }}>
                                Cancel
                            </button>
                            <button className="btn-primary" onClick={handleUpload} disabled={uploading}>
                                {uploading ? 'Importing...' : 'Confirm & Import'} <FaCheck />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="batches-list">
                <h3>Import History</h3>
                {loading ? (
                    <p>Loading...</p>
                ) : batches.length === 0 ? (
                    <div className="empty-state">No imports yet. Upload a CSV to get started.</div>
                ) : (
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Filename</th>
                                <th>Type</th>
                                <th>Stats</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {batches.map(batch => (
                                <tr key={batch._id}>
                                    <td>{new Date(batch.createdAt).toLocaleDateString()}</td>
                                    <td className="filename"><FaFileCsv /> {batch.originalName}</td>
                                    <td>
                                        <span className={`badge ${batch.type.toLowerCase()}`}>
                                            {batch.type}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="stats-mini">
                                            <span className="success" title="Valid">{batch.stats.valid}</span> /
                                            <span className="total" title="Total">{batch.stats.total}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${batch.status.toLowerCase()}`}>
                                            {batch.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="btn-icon danger"
                                            onClick={() => handleDelete(batch._id)}
                                            title="Delete List"
                                        >
                                            <FaTrash />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}

export default ImportManager;
