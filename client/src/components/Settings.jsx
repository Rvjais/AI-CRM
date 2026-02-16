import React, { useState, useEffect } from 'react';
import { FaRobot, FaFileExcel, FaWpforms, FaEnvelope, FaSave, FaCoins } from 'react-icons/fa';
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

    useEffect(() => {
        fetchSettings();
        fetchCredits();
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

    const handleToggle = (key) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const saveSettings = async () => {
        setSaving(true);
        setMessage('');
        try {
            await api.put('/api/user/settings', { featureFlags: settings });
            setMessage('Settings saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error('Failed to save settings:', error);
            setMessage('Failed to save settings.');
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

            <div className="settings-actions">
                {message && <span className="settings-message">{message}</span>}
                <button className="save-btn" onClick={saveSettings} disabled={saving}>
                    <FaSave /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="settings-danger-zone">
                <h3>Account Actions</h3>
                <button className="logout-btn" onClick={onLogout}>
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Settings;
