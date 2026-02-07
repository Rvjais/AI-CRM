import { useState, useEffect } from 'react';
import { FaDatabase, FaCloud, FaSave, FaCheckCircle, FaExclamationTriangle, FaLock } from 'react-icons/fa';
import api from '../utils/apiClient';
import './InfrastructureConfig.css';

function InfrastructureConfig({ token, onConfigSaved }) {
    const [mongoURI, setMongoURI] = useState('');
    const [cloudinaryConfig, setCloudinaryConfig] = useState({
        cloudName: '',
        apiKey: '',
        apiSecret: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [infrastructureReady, setInfrastructureReady] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, [token]);

    const fetchConfig = async () => {
        try {
            const data = await api.get('/api/user/infrastructure');
            if (data.success && data.data) {
                if (data.data.mongoURI) setMongoURI(data.data.mongoURI);
                if (data.data.cloudinaryConfig) {
                    setCloudinaryConfig({
                        cloudName: data.data.cloudinaryConfig.cloudName || '',
                        apiKey: data.data.cloudinaryConfig.apiKey || '',
                        apiSecret: data.data.cloudinaryConfig.apiSecret || '' // Might be masked or empty
                    });
                }
                setInfrastructureReady(data.data.infrastructureReady);
            }
        } catch (err) {
            console.error('Error fetching infrastructure config:', err);
            setError('Failed to load settings.');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const payload = {
                mongoURI,
                cloudinaryConfig
            };

            const data = await api.put('/api/user/infrastructure', payload);

            if (data.success) {
                setSuccess('Infrastructure settings saved and verified successfully!');
                setInfrastructureReady(true);
                if (onConfigSaved) onConfigSaved();
            } else {
                setError(data.message || 'Failed to save settings.');
            }
        } catch (err) {
            console.error('Error saving settings:', err);
            setError(err.response?.data?.message || 'Failed to save settings. Please check your credentials.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading">Loading settings...</div>;

    return (
        <div className="infra-config-view">
            <div className="view-header">
                <h1>Infrastructure Settings</h1>
                <p>Connect your own database and storage to power your RainCRM instance.</p>
            </div>

            <div className="status-banner">
                {infrastructureReady ? (
                    <div className="status-card success">
                        <FaCheckCircle className="status-icon" />
                        <div>
                            <h3>System Connected</h3>
                            <p>Your MongoDB and Cloudinary are connected and ready.</p>
                        </div>
                    </div>
                ) : (
                    <div className="status-card warning">
                        <FaExclamationTriangle className="status-icon" />
                        <div>
                            <h3>Action Required</h3>
                            <p>Please configure your infrastructure to enable WhatsApp and Media features.</p>
                        </div>
                    </div>
                )}
            </div>

            <form onSubmit={handleSave} className="infra-form">

                <div className="form-section">
                    <div className="section-header">
                        <FaDatabase className="section-icon" />
                        <h2>MongoDB Connection</h2>
                    </div>
                    <p className="section-desc">Provide your MongoDB Connection String (URI). Ensure it includes username and password if required.</p>

                    <div className="form-group">
                        <label>MongoDB URI</label>
                        <input
                            type="password"
                            value={mongoURI}
                            onChange={(e) => setMongoURI(e.target.value)}
                            placeholder="mongodb+srv://user:password@cluster.mongodb.net/dbname"
                            required
                            className="input-field"
                        />
                        <small className="hint"><FaLock size={10} /> Your URI is encrypted at rest.</small>
                    </div>
                </div>

                <div className="form-section">
                    <div className="section-header">
                        <FaCloud className="section-icon" />
                        <h2>Cloudinary Configuration</h2>
                    </div>
                    <p className="section-desc">Connect your Cloudinary account for media storage (images, videos).</p>

                    <div className="form-group">
                        <label>Cloud Name</label>
                        <input
                            type="text"
                            value={cloudinaryConfig.cloudName}
                            onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, cloudName: e.target.value })}
                            placeholder="e.g. my-cloud-name"
                            required
                            className="input-field"
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group half">
                            <label>API Key</label>
                            <input
                                type="text"
                                value={cloudinaryConfig.apiKey}
                                onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, apiKey: e.target.value })}
                                placeholder="1234567890"
                                required
                                className="input-field"
                            />
                        </div>
                        <div className="form-group half">
                            <label>API Secret</label>
                            <input
                                type="password"
                                value={cloudinaryConfig.apiSecret}
                                onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, apiSecret: e.target.value })}
                                placeholder="••••••••••••••••"
                                required
                                className="input-field"
                            />
                        </div>
                    </div>
                </div>

                {/* Visual spacer */}
                <div style={{ marginBottom: '1rem' }}></div>

                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                <div className="form-actions">
                    <button type="submit" className="btn-save" disabled={saving}>
                        {saving ? 'Verifying & Saving...' : (
                            <>
                                <FaSave /> Save Configuration
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default InfrastructureConfig;
