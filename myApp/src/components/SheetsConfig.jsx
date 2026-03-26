import { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import api from '../utils/apiClient';
import './SheetsConfig.css';
import { FaPlus, FaTrash, FaSave, FaSync, FaTable, FaLock, FaChevronDown, FaChevronUp, FaLink, FaColumns } from 'react-icons/fa';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';

function SheetsConfig() {
    const [config, setConfig] = useState({
        spreadsheetId: '', sheetName: 'Sheet1', columns: []
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [expandedSection, setExpandedSection] = useState('connection');

    const toggleSection = (s) => setExpandedSection(prev => prev === s ? null : s);

    useEffect(() => { fetchConfig(); }, []);

    const fetchConfig = async () => {
        try {
            const result = await api.get('/api/sheets/config');
            if (result.success && result.data) {
                let columns = result.data.columns || [];
                const phoneIndex = columns.findIndex(c => c.key === 'phone');
                const phoneVar = { key: 'phone', header: 'Phone Number', description: 'Sender Phone Number (Auto-Added)' };
                if (phoneIndex === -1) {
                    columns = [phoneVar, ...columns];
                } else {
                    const existing = columns[phoneIndex];
                    columns.splice(phoneIndex, 1);
                    columns = [existing, ...columns];
                }
                setConfig({
                    spreadsheetId: result.data.spreadsheetId || '',
                    sheetName: result.data.sheetName || 'Sheet1',
                    columns
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
        setConfig({ ...config, columns: [...config.columns, { key: '', header: '', description: '' }] });
    };

    const removeColumn = (index) => {
        setConfig({ ...config, columns: config.columns.filter((_, i) => i !== index) });
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            const result = await api.post('/api/sheets/config', config);
            if (result.success) {
                setMessage('Saved & synced!');
                await api.post('/api/sheets/sync-headers');
            } else {
                setMessage('Failed to save.');
            }
        } catch {
            setMessage('Error saving.');
        } finally {
            setSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const handleReconnect = async () => {
        try {
            const isNative = Capacitor.isNativePlatform();
            const platformQuery = isNative ? '?platform=android' : '';
            const result = await api.get(`/api/auth/google${platformQuery}`);
            if (result.success && result.data.url) {
                if (isNative) {
                    await Browser.open({ url: result.data.url });
                } else {
                    window.location.href = result.data.url;
                }
            }
        } catch {
            setMessage('Error starting authentication.');
        }
    };

    if (loading) {
        return (
            <IonPage><IonContent>
                <div className="sht-loading">Loading config...</div>
            </IonContent></IonPage>
        );
    }

    return (
        <IonPage>
            <IonContent>
                <div className="sht-container">
                    {/* Header */}
                    <div className="sht-header">
                        <div className="sht-header-icon"><FaTable /></div>
                        <div style={{ flex: 1 }}>
                            <h1>Google Sheets</h1>
                            <p>Auto-extract chat data to spreadsheets</p>
                        </div>
                        <button className="sht-auth-btn" onClick={handleReconnect}>
                            <FaSync /> Auth
                        </button>
                    </div>

                    {/* Connection Section */}
                    <div className="sht-section">
                        <button className="sht-section-header" onClick={() => toggleSection('connection')}>
                            <div className="sht-section-left">
                                <div className="sht-icon-wrap link"><FaLink /></div>
                                <div>
                                    <span className="sht-section-title">Spreadsheet Connection</span>
                                    <span className="sht-section-sub">
                                        {config.spreadsheetId ? 'Connected' : 'Not configured'}
                                    </span>
                                </div>
                            </div>
                            {expandedSection === 'connection' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {expandedSection === 'connection' && (
                            <div className="sht-section-body">
                                <label className="sht-label">Spreadsheet ID</label>
                                <input
                                    type="text"
                                    value={config.spreadsheetId}
                                    onChange={(e) => setConfig({ ...config, spreadsheetId: e.target.value })}
                                    placeholder="1BxiMVs0XRA5nFMd..."
                                    className="sht-input"
                                />
                                <div className="sht-hint">From URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit</div>

                                <label className="sht-label">Sheet Name</label>
                                <input
                                    type="text"
                                    value={config.sheetName}
                                    onChange={(e) => setConfig({ ...config, sheetName: e.target.value })}
                                    placeholder="Sheet1"
                                    className="sht-input"
                                />
                            </div>
                        )}
                    </div>

                    {/* Columns Section */}
                    <div className="sht-section">
                        <button className="sht-section-header" onClick={() => toggleSection('columns')}>
                            <div className="sht-section-left">
                                <div className="sht-icon-wrap cols"><FaColumns /></div>
                                <div>
                                    <span className="sht-section-title">Extraction Variables</span>
                                    <span className="sht-section-sub">{config.columns.length} columns defined</span>
                                </div>
                            </div>
                            {expandedSection === 'columns' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>
                        {expandedSection === 'columns' && (
                            <div className="sht-section-body">
                                <p className="sht-desc">Define what AI should extract from each chat.</p>

                                {config.columns.map((col, index) => {
                                    const isPhone = col.key === 'phone';
                                    return (
                                        <div key={index} className={`sht-col-card ${isPhone ? 'locked' : ''}`}>
                                            {isPhone && <div className="sht-lock-badge"><FaLock size={10} /> Default</div>}
                                            {!isPhone && (
                                                <button className="sht-col-delete" onClick={() => removeColumn(index)}>
                                                    <FaTrash />
                                                </button>
                                            )}
                                            <label className="sht-label-sm">Variable Key</label>
                                            <input
                                                type="text"
                                                value={col.key}
                                                onChange={(e) => handleColumnChange(index, 'key', e.target.value)}
                                                placeholder="e.g. customerName"
                                                disabled={isPhone}
                                                className="sht-input-sm"
                                            />
                                            <label className="sht-label-sm">Sheet Header</label>
                                            <input
                                                type="text"
                                                value={col.header}
                                                onChange={(e) => handleColumnChange(index, 'header', e.target.value)}
                                                placeholder="e.g. Customer Name"
                                                disabled={isPhone}
                                                className="sht-input-sm"
                                            />
                                            <label className="sht-label-sm">AI Instruction</label>
                                            <input
                                                type="text"
                                                value={col.description}
                                                onChange={(e) => handleColumnChange(index, 'description', e.target.value)}
                                                placeholder="e.g. Extract the client name"
                                                disabled={isPhone}
                                                className="sht-input-sm"
                                            />
                                        </div>
                                    );
                                })}

                                <button className="sht-add-btn" onClick={addColumn}>
                                    <FaPlus /> Add Variable
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="sht-info">
                        Saving will verify your Sheet ID and sync headers automatically.
                    </div>

                    {/* Save Bar */}
                    <div className="sht-save-bar">
                        {message && <span className="sht-save-msg">{message}</span>}
                        <button className={`sht-btn-save ${saving ? 'saving' : ''} ${message && !saving ? 'saved' : ''}`} onClick={saveConfig} disabled={saving}>
                            <FaSave /> {saving ? 'Saving...' : 'Save & Sync'}
                        </button>
                    </div>
                    <div style={{ height: 80 }} />
                </div>
            </IonContent>
        </IonPage>
    );
}

export default SheetsConfig;
