import React, { useState, useEffect } from 'react';
import { FaRobot, FaFileExcel, FaWpforms, FaEnvelope, FaSave, FaCoins, FaLock } from 'react-icons/fa';
import api from '../utils/apiClient';
import './Settings.css';

function Settings({ onLogout }) {
    const [settings, setSettings] = useState({
        aiBot: true,
        sheetAutomation: true,
        formNotifications: true,
        emailNotifications: true
    });
    const [credits, setCredits] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    
    // WhatsApp Privacy Settings
    const [privacySettings, setPrivacySettings] = useState({
        readreceipts: 'all',
        profile: 'all',
        status: 'all',
        online: 'all',
        last: 'all',
        groupadd: 'all',
        calladd: 'all'
    });
    const [privacyLoading, setPrivacyLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
        fetchCredits();
        fetchPrivacySettings();
    }, []);

    const fetchCredits = async () => {
        try {
            const res = await api.get('/api/auth/me');
            if (res.success && res.data) {
                setCredits(res.data.credits || 0);
            }
        } catch (e) {
            console.error("Failed to fetch credits", e);
        }
    };

    const fetchSettings = async () => {
        try {
            const res = await api.get('/api/user/settings');
            if (res.success && res.data && res.data.featureFlags) {
                setSettings(res.data.featureFlags);
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchPrivacySettings = async () => {
        setPrivacyLoading(true);
        try {
            const res = await api.get('/api/whatsapp/privacy');
            if (res.success && res.data) {
                setPrivacySettings(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch WhatsApp privacy settings:', error);
        } finally {
            setPrivacyLoading(false);
        }
    };

    const handlePrivacyChange = async (key, value) => {
        const newSettings = { ...privacySettings, [key]: value };
        setPrivacySettings(newSettings);
        
        try {
            await api.put('/api/whatsapp/privacy', { [key]: value });
            setMessage('Privacy setting updated!');
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error('Failed to update privacy:', error);
            setMessage('Failed to update privacy.');
            // Revert
            fetchPrivacySettings();
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleToggle = async (key) => {
        const newValue = !settings[key];
        const newSettings = { ...settings, [key]: newValue };

        // Optimistically update UI
        setSettings(newSettings);

        // Auto-save to backend instantly
        setSaving(true);
        try {
            await api.put('/api/user/settings', { featureFlags: newSettings });
            setMessage('Saved!');
            setTimeout(() => setMessage(''), 2000);
        } catch (error) {
            console.error('Failed to auto-save settings:', error);
            setMessage('Failed to save settings. Reverting...');
            // Revert on failure
            setSettings(settings);
            setTimeout(() => setMessage(''), 3000);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="settings-loading">Loading settings...</div>;

    return (
        <div className="settings-container">
            <header className="settings-header">
                <h2>Feature Settings</h2>
                <p>Manage active features for your account.</p>
            </header>

            <div className="settings-grid">
                {/* Account/Credits Card */}
                <div className="setting-card credits-card">
                    <div className="setting-icon credits">
                        <FaCoins />
                    </div>
                    <div className="setting-info">
                        <h3>AI Credits</h3>
                        <p>{credits !== null ? `${credits} remaining` : 'Loading...'}</p>
                    </div>
                </div>

                <div className="setting-card">
                    <div className="setting-icon ai">
                        <FaRobot />
                    </div>
                    <div className="setting-info">
                        <h3>AI Chatbot</h3>
                        <p>Automatically reply to incoming WhatsApp messages using AI.</p>
                    </div>
                    <div className="setting-toggle">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.aiBot}
                                onChange={() => handleToggle('aiBot')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="setting-card">
                    <div className="setting-icon sheets">
                        <FaFileExcel />
                    </div>
                    <div className="setting-info">
                        <h3>Sheet Automation</h3>
                        <p>Sync extracted data from chats to Google Sheets.</p>
                    </div>
                    <div className="setting-toggle">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.sheetAutomation}
                                onChange={() => handleToggle('sheetAutomation')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="setting-card">
                    <div className="setting-icon forms">
                        <FaWpforms />
                    </div>
                    <div className="setting-info">
                        <h3>Form Notifications</h3>
                        <p>Receive WhatsApp notifications for new form submissions.</p>
                    </div>
                    <div className="setting-toggle">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.formNotifications}
                                onChange={() => handleToggle('formNotifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>

                <div className="setting-card">
                    <div className="setting-icon email">
                        <FaEnvelope />
                    </div>
                    <div className="setting-info">
                        <h3>Email Alerts</h3>
                        <p>Get WhatsApp alerts for high-priority emails.</p>
                    </div>
                    <div className="setting-toggle">
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={settings.emailNotifications}
                                onChange={() => handleToggle('emailNotifications')}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="settings-actions" style={{ justifyContent: 'flex-end', borderTop: 'none', paddingTop: 0 }}>
                {message && <span className="settings-message">{message}</span>}
            </div>

            {/* WhatsApp Privacy Settings */}
            <header className="settings-header" style={{ marginTop: '2rem' }}>
                <h2>WhatsApp Privacy Settings</h2>
                <p>Manage who can see your WhatsApp profile and activity.</p>
            </header>
            
            {privacyLoading ? (
                <div className="settings-loading">Loading privacy settings...</div>
            ) : (
                <div className="settings-grid">
                    <div className="setting-card">
                        <div className="setting-icon" style={{ background: '#e8f5e9', color: '#4caf50' }}>
                            <FaLock />
                        </div>
                        <div className="setting-info">
                            <h3>Read Receipts</h3>
                            <p>Let others know when you've read their messages.</p>
                        </div>
                        <div className="setting-toggle">
                            <select 
                                value={privacySettings.readreceipts} 
                                onChange={(e) => handlePrivacyChange('readreceipts', e.target.value)}
                                className="privacy-select"
                            >
                                <option value="all">Everyone</option>
                                <option value="none">Nobody</option>
                            </select>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-icon" style={{ background: '#e8f5e9', color: '#4caf50' }}>
                            <FaLock />
                        </div>
                        <div className="setting-info">
                            <h3>Last Seen</h3>
                            <p>Who can see your last seen time.</p>
                        </div>
                        <div className="setting-toggle">
                            <select 
                                value={privacySettings.last} 
                                onChange={(e) => handlePrivacyChange('last', e.target.value)}
                                className="privacy-select"
                            >
                                <option value="all">Everyone</option>
                                <option value="contacts">My Contacts</option>
                                <option value="contact_blacklist">My Contacts Except...</option>
                                <option value="none">Nobody</option>
                            </select>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-icon" style={{ background: '#e8f5e9', color: '#4caf50' }}>
                            <FaLock />
                        </div>
                        <div className="setting-info">
                            <h3>Profile Photo</h3>
                            <p>Who can see your profile picture.</p>
                        </div>
                        <div className="setting-toggle">
                            <select 
                                value={privacySettings.profile} 
                                onChange={(e) => handlePrivacyChange('profile', e.target.value)}
                                className="privacy-select"
                            >
                                <option value="all">Everyone</option>
                                <option value="contacts">My Contacts</option>
                                <option value="contact_blacklist">My Contacts Except...</option>
                                <option value="none">Nobody</option>
                            </select>
                        </div>
                    </div>

                    <div className="setting-card">
                        <div className="setting-icon" style={{ background: '#e8f5e9', color: '#4caf50' }}>
                            <FaLock />
                        </div>
                        <div className="setting-info">
                            <h3>Online Status</h3>
                            <p>Who can see when you are online.</p>
                        </div>
                        <div className="setting-toggle">
                            <select 
                                value={privacySettings.online} 
                                onChange={(e) => handlePrivacyChange('online', e.target.value)}
                                className="privacy-select"
                            >
                                <option value="all">Everyone</option>
                                <option value="match_last_seen">Same as Last Seen</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="settings-danger-zone" style={{ marginTop: '2rem' }}>
                <h3>Account Actions</h3>
                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Settings;
