import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import { FaPlus, FaPlay, FaPause, FaTrash, FaWhatsapp, FaEnvelope, FaClock, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';
import './CampaignManager.css';

function CampaignManager() {
    const [view, setView] = useState('list'); // 'list' | 'create'
    const [campaigns, setCampaigns] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        type: 'WHATSAPP',
        template: { body: '', subject: '' },
        targetBatchId: '',
        startNow: true
    });

    useEffect(() => {
        if (view === 'list') fetchCampaigns();
        if (view === 'create') fetchBatches();
    }, [view]);

    const fetchCampaigns = async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/campaigns');
            if (res.success) setCampaigns(res.data);
        } catch (error) {
            console.error('Error fetching campaigns:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const res = await api.get('/api/imports');
            if (res.success) setBatches(res.data);
        } catch (error) { console.error(error); }
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        try {
            await api.post('/api/campaigns', formData);
            setView('list');
        } catch (error) {
            alert('Creation failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleAction = async (id, action) => {
        try {
            if (action === 'delete') {
                if (!confirm('Delete campaign?')) return;
                await api.delete(`/api/campaigns/${id}`);
            } else {
                await api.post(`/api/campaigns/${id}/${action}`);
            }
            fetchCampaigns();
        } catch (error) {
            console.error(error);
        }
    };

    const [preview, setPreview] = useState(null);

    useEffect(() => {
        if (formData.targetBatchId) {
            updatePreview();
        } else {
            setPreview(null);
        }
    }, [formData.targetBatchId, formData.template.body]);

    const updatePreview = async () => {
        if (!formData.targetBatchId) return;
        try {
            const res = await api.get(`/api/imports/${formData.targetBatchId}/sample`);
            if (res.success && res.data) {
                const contact = res.data;
                let text = formData.template.body;

                // Standard Substitutions
                text = text.replace(/{{name}}/gi, contact.name || 'John Doe');
                text = text.replace(/{{phone}}/gi, contact.phoneNumber || '1234567890');

                // Custom Attribute Substitutions
                if (contact.customAttributes) {
                    text = text.replace(/{{([^}]+)}}/g, (match, key) => {
                        // Find key case-insensitively
                        const attrKey = Object.keys(contact.customAttributes).find(k => k.toLowerCase() === key.toLowerCase());
                        return attrKey ? contact.customAttributes[attrKey] : match;
                    });
                }

                setPreview(text);
            }
        } catch (error) {
            console.error("Failed to fetch preview", error);
        }
    };

    if (view === 'create') {
        return (
            <div className="campaign-manager">
                <header className="page-header">
                    <button className="back-btn" onClick={() => setView('list')}>← Back</button>
                    <h2>Create Campaign</h2>
                </header>

                <div className="create-layout">
                    <form className="campaign-form" onSubmit={handleCreate}>
                        <div className="form-group">
                            <label>Campaign Name</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                placeholder="e.g. November Newsletter"
                            />
                        </div>

                        <div className="form-group">
                            <label>Channel</label>
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={formData.type === 'WHATSAPP' ? 'active' : ''}
                                    onClick={() => setFormData({ ...formData, type: 'WHATSAPP' })}
                                >
                                    <FaWhatsapp /> WhatsApp
                                </button>
                                <button
                                    type="button"
                                    className={formData.type === 'EMAIL' ? 'active' : ''}
                                    onClick={() => setFormData({ ...formData, type: 'EMAIL' })}
                                >
                                    <FaEnvelope /> Email
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Target Audience</label>
                            <select
                                value={formData.targetBatchId}
                                onChange={e => setFormData({ ...formData, targetBatchId: e.target.value })}
                                required
                            >
                                <option value="">-- Select a List --</option>
                                {batches
                                    .filter(b => b.type === formData.type || b.type === 'BOTH')
                                    .map(b => (
                                        <option key={b._id} value={b._id}>
                                            {b.originalName} ({b.stats.valid} contacts)
                                        </option>
                                    ))}
                            </select>
                        </div>

                        {formData.type === 'EMAIL' && (
                            <div className="form-group">
                                <label>Subject Line</label>
                                <input
                                    type="text"
                                    value={formData.template.subject}
                                    onChange={e => setFormData({ ...formData, template: { ...formData.template, subject: e.target.value } })}
                                    required
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>Message Body</label>
                            <small>Use {'{{name}}'}, {'{{phone}}'} or any column header like {'{{Company}}'}</small>
                            <textarea
                                rows="6"
                                value={formData.template.body}
                                onChange={e => setFormData({ ...formData, template: { ...formData.template, body: e.target.value } })}
                                required
                            ></textarea>
                        </div>

                        <div className="form-actions">
                            <button type="submit" className="btn-primary">Launch Campaign</button>
                        </div>
                    </form>

                    {/* Preview Panel */}
                    <div className="preview-panel">
                        <h3>Message Preview</h3>
                        <div className="preview-box">
                            {preview ? (
                                <div className="preview-content">
                                    {preview.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                                </div>
                            ) : (
                                <p className="placeholder">Select an audience and type a message to see a preview.</p>
                            )}
                        </div>
                        {preview && <small>Preview based on a random contact from the selected list.</small>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="campaign-manager">
            <header className="page-header">
                <div className="header-content">
                    <h2>Campaigns</h2>
                    <p>Manage and monitor your broadcast campaigns.</p>
                </div>
                <button className="btn-primary" onClick={() => setView('create')}>
                    <FaPlus /> New Campaign
                </button>
            </header>

            <div className="campaigns-grid">
                {loading ? <p>Loading...</p> : campaigns.map(c => (
                    <div key={c._id} className="campaign-card">
                        <div className="card-header">
                            <div className="card-title">
                                {c.type === 'WHATSAPP' ? <FaWhatsapp color="#25D366" /> : <FaEnvelope color="#4299e1" />}
                                <h3>{c.name}</h3>
                            </div>
                            <span className={`status-badge ${c.status.toLowerCase()}`}>{c.status}</span>
                        </div>

                        <div className="card-stats">
                            <div className="stat">
                                <span className="label">Total</span>
                                <span className="value">{c.stats.total}</span>
                            </div>
                            <div className="stat">
                                <span className="label">Sent</span>
                                <span className="value success">{c.stats.sent}</span>
                            </div>
                            <div className="stat">
                                <span className="label">Failed</span>
                                <span className="value danger">{c.stats.failed}</span>
                            </div>
                        </div>

                        <div className="progress-bar">
                            <div
                                className="fill"
                                style={{
                                    width: `${c.stats.total > 0 ? (c.stats.sent / c.stats.total) * 100 : 0}%`
                                }}
                            ></div>
                        </div>

                        <div className="card-actions">
                            {c.status === 'RUNNING' && (
                                <button onClick={() => handleAction(c._id, 'pause')}><FaPause /> Pause</button>
                            )}
                            {(c.status === 'PAUSED' || c.status === 'DRAFT') && (
                                <button onClick={() => handleAction(c._id, 'start')}><FaPlay /> Start</button>
                            )}
                            <button className="danger-text" onClick={() => handleAction(c._id, 'delete')}>
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default CampaignManager;
