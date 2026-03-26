import { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { FaDatabase, FaCloud, FaSave, FaCheckCircle, FaExclamationTriangle, FaLock, FaPhone, FaChevronDown, FaChevronUp, FaServer } from 'react-icons/fa';
import api from '../utils/apiClient';
import './InfrastructureConfig.css';

function InfrastructureConfig({ token, onConfigSaved }) {
    const [mongoURI, setMongoURI] = useState('');
    const [cloudinaryConfig, setCloudinaryConfig] = useState({
        cloudName: '', apiKey: '', apiSecret: ''
    });
    const [twilioConfig, setTwilioConfig] = useState({
        accountSid: '', authToken: '', phoneNumber: ''
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [infrastructureReady, setInfrastructureReady] = useState(false);
    const [expandedSection, setExpandedSection] = useState('mongo');

    const toggleSection = (s) => setExpandedSection(prev => prev === s ? null : s);

    useEffect(() => { fetchConfig(); }, [token]);

    const fetchConfig = async () => {
        try {
            const data = await api.get('/api/user/infrastructure');
            if (data.success && data.data) {
                if (data.data.mongoURI) setMongoURI(data.data.mongoURI);
                if (data.data.cloudinaryConfig) {
                    setCloudinaryConfig({
                        cloudName: data.data.cloudinaryConfig.cloudName || '',
                        apiKey: data.data.cloudinaryConfig.apiKey || '',
                        apiSecret: data.data.cloudinaryConfig.apiSecret || ''
                    });
                }
                if (data.data.twilioConfig) {
                    setTwilioConfig({
                        accountSid: data.data.twilioConfig.accountSid || '',
                        authToken: data.data.twilioConfig.authToken || '',
                        phoneNumber: data.data.twilioConfig.phoneNumber || ''
                    });
                }
                setInfrastructureReady(data.data.infrastructureReady);
            }
        } catch (err) {
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
            const payload = { mongoURI, cloudinaryConfig };
            if (twilioConfig.accountSid || twilioConfig.authToken || twilioConfig.phoneNumber) {
                payload.twilioConfig = twilioConfig;
            }
            const data = await api.put('/api/user/infrastructure', payload);
            if (data.success) {
                setSuccess('Infrastructure settings saved and verified!');
                setInfrastructureReady(true);
                if (onConfigSaved) onConfigSaved();
            } else {
                setError(data.message || 'Failed to save settings.');
            }
        } catch (err) {
            setError(err.message || 'Failed to save. Check your credentials.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <IonPage><IonContent>
                <div className="inf-loading">Loading settings...</div>
            </IonContent></IonPage>
        );
    }

    const hasMongo = !!mongoURI;
    const hasCloudinary = !!(cloudinaryConfig.cloudName && cloudinaryConfig.apiKey);
    const hasTwilio = !!twilioConfig.phoneNumber;

    return (
        <IonPage>
            <IonContent>
                <form onSubmit={handleSave} className="inf-container">
                    {/* Header */}
                    <div className="inf-header">
                        <div className="inf-header-icon"><FaServer /></div>
                        <div>
                            <h1>Infrastructure</h1>
                            <p>Connect your database, storage & telephony</p>
                        </div>
                    </div>

                    {/* Status Banner */}
                    <div className={`inf-status ${infrastructureReady ? 'connected' : 'pending'}`}>
                        {infrastructureReady ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        <span>{infrastructureReady ? 'System connected and ready' : 'Configuration required to enable features'}</span>
                    </div>

                    {/* MongoDB Section */}
                    <div className="inf-section">
                        <button type="button" className="inf-section-header" onClick={() => toggleSection('mongo')}>
                            <div className="inf-section-left">
                                <div className="inf-icon-wrap mongo"><FaDatabase /></div>
                                <div>
                                    <span className="inf-section-title">MongoDB</span>
                                    <span className="inf-section-sub">
                                        {hasMongo ? <span className="inf-dot green" /> : <span className="inf-dot red" />}
                                        {hasMongo ? 'Connected' : 'Not configured'}
                                    </span>
                                </div>
                            </div>
                            {expandedSection === 'mongo' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {expandedSection === 'mongo' && (
                            <div className="inf-section-body">
                                <label className="inf-label">Connection URI</label>
                                <input
                                    type="password"
                                    value={mongoURI}
                                    onChange={(e) => setMongoURI(e.target.value)}
                                    placeholder="mongodb+srv://user:pass@cluster..."
                                    required
                                    className="inf-input"
                                />
                                <div className="inf-hint"><FaLock size={10} /> Encrypted at rest</div>
                            </div>
                        )}
                    </div>

                    {/* Cloudinary Section */}
                    <div className="inf-section">
                        <button type="button" className="inf-section-header" onClick={() => toggleSection('cloud')}>
                            <div className="inf-section-left">
                                <div className="inf-icon-wrap cloud"><FaCloud /></div>
                                <div>
                                    <span className="inf-section-title">Cloudinary</span>
                                    <span className="inf-section-sub">
                                        {hasCloudinary ? <span className="inf-dot green" /> : <span className="inf-dot red" />}
                                        {hasCloudinary ? 'Connected' : 'Not configured'}
                                    </span>
                                </div>
                            </div>
                            {expandedSection === 'cloud' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {expandedSection === 'cloud' && (
                            <div className="inf-section-body">
                                <label className="inf-label">Cloud Name</label>
                                <input
                                    type="text"
                                    value={cloudinaryConfig.cloudName}
                                    onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, cloudName: e.target.value })}
                                    placeholder="my-cloud-name"
                                    required
                                    className="inf-input"
                                />
                                <label className="inf-label">API Key</label>
                                <input
                                    type="text"
                                    value={cloudinaryConfig.apiKey}
                                    onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, apiKey: e.target.value })}
                                    placeholder="123456789012"
                                    required
                                    className="inf-input"
                                />
                                <label className="inf-label">API Secret</label>
                                <input
                                    type="password"
                                    value={cloudinaryConfig.apiSecret}
                                    onChange={(e) => setCloudinaryConfig({ ...cloudinaryConfig, apiSecret: e.target.value })}
                                    placeholder="Enter API Secret"
                                    required
                                    className="inf-input"
                                />
                            </div>
                        )}
                    </div>

                    {/* Twilio Section */}
                    <div className="inf-section">
                        <button type="button" className="inf-section-header" onClick={() => toggleSection('twilio')}>
                            <div className="inf-section-left">
                                <div className="inf-icon-wrap twilio"><FaPhone /></div>
                                <div>
                                    <span className="inf-section-title">Twilio</span>
                                    <span className="inf-section-sub">
                                        {hasTwilio ? <span className="inf-dot green" /> : <span className="inf-dot gray" />}
                                        {hasTwilio ? twilioConfig.phoneNumber : 'Optional'}
                                    </span>
                                </div>
                            </div>
                            {expandedSection === 'twilio' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {expandedSection === 'twilio' && (
                            <div className="inf-section-body">
                                <label className="inf-label">Account SID</label>
                                <input
                                    type="text"
                                    value={twilioConfig.accountSid}
                                    onChange={(e) => setTwilioConfig({ ...twilioConfig, accountSid: e.target.value })}
                                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                                    className="inf-input"
                                />
                                <label className="inf-label">Auth Token</label>
                                <input
                                    type="password"
                                    value={twilioConfig.authToken}
                                    onChange={(e) => setTwilioConfig({ ...twilioConfig, authToken: e.target.value })}
                                    placeholder="Enter Auth Token"
                                    className="inf-input"
                                />
                                <div className="inf-hint"><FaLock size={10} /> Encrypted at rest</div>
                                <label className="inf-label">Phone Number</label>
                                <input
                                    type="tel"
                                    value={twilioConfig.phoneNumber}
                                    onChange={(e) => setTwilioConfig({ ...twilioConfig, phoneNumber: e.target.value })}
                                    placeholder="+1234567890"
                                    className="inf-input"
                                />
                                <div className="inf-hint">E.164 format (e.g. +1234567890)</div>
                            </div>
                        )}
                    </div>

                    {/* Alerts */}
                    {error && <div className="inf-alert error">{error}</div>}
                    {success && <div className="inf-alert success">{success}</div>}

                    {/* Save Bar */}
                    <div className="inf-save-bar">
                        <button type="submit" className={`inf-btn-save ${saving ? 'saving' : ''}`} disabled={saving}>
                            <FaSave /> {saving ? 'Verifying...' : 'Save Configuration'}
                        </button>
                    </div>
                    <div style={{ height: 80 }} />
                </form>
            </IonContent>
        </IonPage>
    );
}

export default InfrastructureConfig;
