import { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import { FaRobot, FaSave, FaUndo, FaCheckCircle, FaExclamationTriangle, FaPen, FaTimes, FaChevronDown, FaChevronUp, FaMagic, FaKey, FaCog, FaLightbulb } from 'react-icons/fa';
import api from '../utils/apiClient';
import './AIConfig.css';

function AIConfig({ token }) {
    const [systemPrompt, setSystemPrompt] = useState(
        "You are a helpful customer support assistant for RainCRM. Be professional, concise, and friendly."
    );
    const [provider, setProvider] = useState('openai');
    const [providers] = useState([
        { id: 'openai', name: 'OpenAI (GPT-3.5/4)', icon: '🤖' },
        { id: 'gemini', name: 'Google Gemini', icon: '✨' },
        { id: 'anthropic', name: 'Anthropic Claude', icon: '🧠' },
        { id: 'openrouter', name: 'OpenRouter (All Models)', icon: '🔀' },
        { id: 'ollama', name: 'Self-Hosted AI (Ollama)', icon: '🖥️' }
    ]);

    const [apiKeysInput, setApiKeysInput] = useState({
        openai: '', gemini: '', anthropic: '', openrouter: '', ollama: ''
    });

    const [keysConfigured, setKeysConfigured] = useState({
        openai: false, gemini: false, anthropic: false, openrouter: false, ollama: false
    });

    const [isEditingKey, setIsEditingKey] = useState(true);
    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(150);
    const [saved, setSaved] = useState(false);
    const [saveMessage, setSaveMessage] = useState('Save Configuration');
    const [loading, setLoading] = useState(true);
    const [autoReply, setAutoReply] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Collapsible sections for mobile
    const [expandedSection, setExpandedSection] = useState('provider');

    const toggleSection = (section) => {
        setExpandedSection(prev => prev === section ? null : section);
    };

    useEffect(() => { fetchConfig(); }, [token]);

    useEffect(() => {
        setIsEditingKey(!keysConfigured[provider]);
    }, [provider, keysConfigured]);

    const fetchConfig = async () => {
        if (!token) return;
        try {
            const data = await api.get('/api/ai/config');
            if (data.success && data.data) {
                setSystemPrompt(data.data.systemPrompt || "You are a helpful customer support assistant for RainCRM. Be professional, concise, and friendly.");
                setTemperature(data.data.temperature || 0.7);
                setMaxTokens(data.data.maxTokens || 150);
                setAutoReply(data.data.autoReply || false);
                if (data.data.keysConfigured) {
                    setKeysConfigured(prev => ({ ...prev, ...data.data.keysConfigured }));
                }
                if (data.data.provider) setProvider(data.data.provider);
            }
        } catch (error) {
            console.error('Error fetching AI config:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            const payload = {
                systemPrompt, temperature, maxTokens,
                enabled: true, autoReply, provider,
                apiKeys: {}
            };
            Object.keys(apiKeysInput).forEach(key => {
                if (apiKeysInput[key] && apiKeysInput[key].trim() !== '') {
                    payload.apiKeys[key] = apiKeysInput[key].trim();
                }
            });

            const data = await api.put('/api/ai/config', payload);
            if (data.success) {
                setSaved(true);
                setSaveMessage('Configuration Saved!');
                if (data.data.keysConfigured) {
                    setKeysConfigured(prev => ({ ...prev, ...data.data.keysConfigured }));
                }
                setApiKeysInput({ openai: '', gemini: '', anthropic: '', openrouter: '', ollama: '' });
                if (payload.apiKeys[provider]) setIsEditingKey(false);
                setTimeout(() => { setSaved(false); setSaveMessage('Save Configuration'); }, 3000);
            }
        } catch (error) {
            console.error('Error saving AI config:', error);
        }
    };

    const handleReset = () => {
        setSystemPrompt("You are a helpful customer support assistant for RainCRM. Be professional, concise, and friendly.");
        setTemperature(0.7);
        setMaxTokens(150);
        setProvider('openai');
    };

    const handleBulkToggle = async (enabled) => {
        if (!window.confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} AI for ALL existing chats?`)) return;
        setBulkLoading(true);
        try {
            const data = await api.post('/api/messages/bulk-toggle-ai', { enabled });
            if (data.success) {
                alert(`AI successfully ${enabled ? 'enabled' : 'disabled'} for all chats.`);
                setAutoReply(enabled);
            }
        } catch (error) {
            alert('Failed to update all chats.');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleKeyChange = (providerId, value) => {
        setApiKeysInput(prev => ({ ...prev, [providerId]: value }));
    };

    if (loading) {
        return (
            <IonPage>
                <IonContent>
                    <div className="aic-loading">Loading configuration...</div>
                </IonContent>
            </IonPage>
        );
    }

    const currentProvider = providers.find(p => p.id === provider);

    return (
        <IonPage>
            <IonContent>
                <div className="aic-container">
                    {/* Header */}
                    <div className="aic-header">
                        <div className="aic-header-icon"><FaRobot /></div>
                        <div>
                            <h1>AI Configuration</h1>
                            <p>Configure your AI assistant</p>
                        </div>
                    </div>

                    {/* Section 1: Provider & API Key */}
                    <div className="aic-section">
                        <button className="aic-section-header" onClick={() => toggleSection('provider')}>
                            <div className="aic-section-left">
                                <FaKey className="aic-section-icon" />
                                <div>
                                    <span className="aic-section-title">Provider & API Key</span>
                                    <span className="aic-section-subtitle">
                                        {currentProvider?.name}
                                        {keysConfigured[provider]
                                            ? <span className="aic-badge configured">Active</span>
                                            : <span className="aic-badge missing">Not Set</span>
                                        }
                                    </span>
                                </div>
                            </div>
                            {expandedSection === 'provider' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>

                        {expandedSection === 'provider' && (
                            <div className="aic-section-body">
                                {/* Provider Selector */}
                                <label className="aic-label">AI Provider</label>
                                <div className="aic-provider-grid">
                                    {providers.map(p => (
                                        <button
                                            key={p.id}
                                            className={`aic-provider-chip ${provider === p.id ? 'active' : ''}`}
                                            onClick={() => setProvider(p.id)}
                                        >
                                            <span className="aic-provider-emoji">{p.icon}</span>
                                            <span className="aic-provider-name">{p.name}</span>
                                            {keysConfigured[p.id] && <FaCheckCircle className="aic-provider-check" />}
                                        </button>
                                    ))}
                                </div>

                                {/* API Key */}
                                <label className="aic-label" style={{ marginTop: 16 }}>
                                    {provider === 'ollama' ? 'Status' : `API Key`}
                                </label>

                                {provider === 'ollama' ? (
                                    <div className="aic-ollama-status">
                                        <span>Runs locally on VPS — no API key required</span>
                                    </div>
                                ) : !isEditingKey && keysConfigured[provider] ? (
                                    <div className="aic-key-configured">
                                        <div className="aic-key-mask">
                                            <FaCheckCircle className="aic-key-check" />
                                            <span>API key is configured and active</span>
                                        </div>
                                        <button className="aic-btn-outline" onClick={() => setIsEditingKey(true)}>
                                            <FaPen size={11} /> Change Key
                                        </button>
                                    </div>
                                ) : (
                                    <div className="aic-key-input-row">
                                        <input
                                            type="password"
                                            value={apiKeysInput[provider]}
                                            onChange={(e) => handleKeyChange(provider, e.target.value)}
                                            placeholder={keysConfigured[provider] ? "Enter new key..." : `Paste your ${currentProvider?.name} key`}
                                            className="aic-input"
                                        />
                                        {keysConfigured[provider] && (
                                            <button className="aic-btn-icon" onClick={() => { setIsEditingKey(false); handleKeyChange(provider, ''); }}>
                                                <FaTimes />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Section 2: Behavior */}
                    <div className="aic-section">
                        <button className="aic-section-header" onClick={() => toggleSection('behavior')}>
                            <div className="aic-section-left">
                                <FaCog className="aic-section-icon" />
                                <div>
                                    <span className="aic-section-title">Behavior</span>
                                    <span className="aic-section-subtitle">Auto-reply, creativity, length</span>
                                </div>
                            </div>
                            {expandedSection === 'behavior' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>

                        {expandedSection === 'behavior' && (
                            <div className="aic-section-body">
                                {/* Auto Reply Toggle */}
                                <div className="aic-toggle-row">
                                    <div>
                                        <span className="aic-toggle-label">Auto-Reply for New Chats</span>
                                        <span className="aic-toggle-desc">AI replies automatically to first message</span>
                                    </div>
                                    <label className="aic-switch">
                                        <input type="checkbox" checked={autoReply} onChange={(e) => setAutoReply(e.target.checked)} />
                                        <span className="aic-switch-slider" />
                                    </label>
                                </div>

                                {/* Temperature */}
                                <div className="aic-slider-group">
                                    <div className="aic-slider-header">
                                        <span className="aic-label">Creativity</span>
                                        <span className="aic-slider-value">{temperature}</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="1" step="0.1"
                                        value={temperature}
                                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                        className="aic-range"
                                    />
                                    <div className="aic-slider-labels">
                                        <span>Precise</span><span>Creative</span>
                                    </div>
                                </div>

                                {/* Max Tokens */}
                                <div className="aic-slider-group">
                                    <div className="aic-slider-header">
                                        <span className="aic-label">Max Reply Length</span>
                                        <span className="aic-slider-value">{maxTokens} tokens</span>
                                    </div>
                                    <input
                                        type="range" min="50" max="1000" step="50"
                                        value={maxTokens}
                                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                        className="aic-range"
                                    />
                                    <div className="aic-slider-labels">
                                        <span>Short</span><span>Long</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 3: System Prompt */}
                    <div className="aic-section">
                        <button className="aic-section-header" onClick={() => toggleSection('prompt')}>
                            <div className="aic-section-left">
                                <FaMagic className="aic-section-icon" />
                                <div>
                                    <span className="aic-section-title">System Prompt</span>
                                    <span className="aic-section-subtitle">Define your AI's personality</span>
                                </div>
                            </div>
                            {expandedSection === 'prompt' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>

                        {expandedSection === 'prompt' && (
                            <div className="aic-section-body">
                                <textarea
                                    value={systemPrompt}
                                    onChange={(e) => setSystemPrompt(e.target.value)}
                                    placeholder="e.g., You are a sales representative..."
                                    className="aic-textarea"
                                    rows={6}
                                />
                                <div className="aic-tips">
                                    <FaLightbulb className="aic-tips-icon" />
                                    <div>
                                        <strong>Tips:</strong> Be specific about the role, set boundaries (what NOT to do), specify tone, and provide business context.
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Section 4: Bulk Actions */}
                    <div className="aic-section">
                        <button className="aic-section-header" onClick={() => toggleSection('bulk')}>
                            <div className="aic-section-left">
                                <FaRobot className="aic-section-icon" />
                                <div>
                                    <span className="aic-section-title">Bulk Actions</span>
                                    <span className="aic-section-subtitle">Apply AI to existing chats</span>
                                </div>
                            </div>
                            {expandedSection === 'bulk' ? <FaChevronUp /> : <FaChevronDown />}
                        </button>

                        {expandedSection === 'bulk' && (
                            <div className="aic-section-body">
                                <button
                                    className="aic-bulk-btn enable"
                                    onClick={() => handleBulkToggle(true)}
                                    disabled={bulkLoading}
                                >
                                    {bulkLoading ? 'Processing...' : 'Enable AI for All Chats'}
                                </button>
                                <button
                                    className="aic-bulk-btn disable"
                                    onClick={() => handleBulkToggle(false)}
                                    disabled={bulkLoading}
                                >
                                    {bulkLoading ? 'Processing...' : 'Disable AI for All Chats'}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Sticky Save Bar */}
                    <div className="aic-save-bar">
                        <button className="aic-btn-reset" onClick={handleReset}>
                            <FaUndo /> Reset
                        </button>
                        <button className={`aic-btn-save ${saved ? 'saved' : ''}`} onClick={handleSave}>
                            <FaSave /> {saved ? saveMessage : 'Save'}
                        </button>
                    </div>

                    {/* Bottom spacer for save bar */}
                    <div style={{ height: 80 }} />
                </div>
            </IonContent>
        </IonPage>
    );
}

export default AIConfig;
