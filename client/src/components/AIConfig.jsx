import { useState, useEffect } from 'react';
import { FaRobot, FaSave, FaUndo, FaCheckCircle, FaExclamationTriangle, FaPen, FaTimes } from 'react-icons/fa';
import api from '../utils/apiClient';
import './AIConfig.css';

function AIConfig({ token }) {
    const [systemPrompt, setSystemPrompt] = useState(
        "You are a helpful customer support assistant for RainCRM. Be professional, concise, and friendly."
    );
    // Provider state
    const [provider, setProvider] = useState('openai');
    const [providers, setProviders] = useState([
        { id: 'openai', name: 'OpenAI (GPT-3.5/4)' },
        { id: 'gemini', name: 'Google Gemini' },
        { id: 'anthropic', name: 'Anthropic Claude' },
        { id: 'openrouter', name: 'OpenRouter (All Models)' }
    ]);

    // API Keys state
    const [apiKeysInput, setApiKeysInput] = useState({
        openai: '',
        gemini: '',
        anthropic: '',
        openrouter: ''
    });

    // Configured state - which keys are actually set on backend
    const [keysConfigured, setKeysConfigured] = useState({
        openai: false,
        gemini: false,
        anthropic: false,
        openrouter: false
    });

    const [isEditingKey, setIsEditingKey] = useState(true);

    const [temperature, setTemperature] = useState(0.7);
    const [maxTokens, setMaxTokens] = useState(150);
    const [saved, setSaved] = useState(false);
    const [saveMessage, setSaveMessage] = useState('Save Configuration');
    const [loading, setLoading] = useState(true);
    const [autoReply, setAutoReply] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, [token]);

    // Update editing state when provider changes
    useEffect(() => {
        // If key is configured, default to NOT editing (show "Change" button)
        // If key is missing, default to editing (show input)
        setIsEditingKey(!keysConfigured[provider]);
        // Also reset input for this provider if we are switching away? 
        // Actually best to keep input state if user typed but didn't save, but for simplicity:
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
                    setKeysConfigured(data.data.keysConfigured);
                } else if (data.data.hasApiKey) {
                    // Fallback regarding legacy key
                    setKeysConfigured(prev => ({ ...prev, openai: true }));
                }

                if (data.data.provider) {
                    setProvider(data.data.provider);
                }
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
                systemPrompt,
                temperature,
                maxTokens,
                enabled: true, // Always true blindly, as we don't expose a master kill switch anymore
                autoReply,
                provider,
                apiKeys: {}
            };


            // Only send keys that have been typed in
            Object.keys(apiKeysInput).forEach(key => {
                if (apiKeysInput[key] && apiKeysInput[key].trim() !== '') {
                    payload.apiKeys[key] = apiKeysInput[key].trim();
                }
            });

            const data = await api.put('/api/ai/config', payload);

            if (data.success) {
                setSaved(true);
                const providerName = providers.find(p => p.id === provider)?.name || provider;
                setSaveMessage(`API Key for ${providerName} Saved!`);

                // Update local configured state based on response
                if (data.data.keysConfigured) {
                    setKeysConfigured(data.data.keysConfigured);
                }

                // Clear inputs for security
                setApiKeysInput({
                    openai: '',
                    gemini: '',
                    anthropic: '',
                    openrouter: ''
                });

                // Exit edit mode if we just saved a key for the current provider
                if (payload.apiKeys[provider]) {
                    setIsEditingKey(false);
                }

                setTimeout(() => {
                    setSaved(false);
                    setSaveMessage('Save Configuration');
                }, 3000);
            } else {
                console.error('Failed to save AI config');
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
        if (!window.confirm(`Are you sure you want to ${enabled ? 'enable' : 'disable'} AI for ALL existing chats? This will also ${enabled ? 'enable' : 'disable'} auto-reply for new chats.`)) {
            return;
        }

        setBulkLoading(true);
        try {
            const data = await api.post('/api/messages/bulk-toggle-ai', { enabled });
            if (data.success) {
                alert(`AI successfully ${enabled ? 'enabled' : 'disabled'} for all chats.`);
                // Sync local state
                setAutoReply(enabled);
            }
        } catch (error) {
            console.error('Error bulk toggling AI:', error);
            alert('Failed to update all chats.');
        } finally {
            setBulkLoading(false);
        }
    };

    const handleKeyChange = (providerId, value) => {
        setApiKeysInput(prev => ({
            ...prev,
            [providerId]: value
        }));
    };

    if (loading) {
        return <div className="loading">Loading configuration...</div>;
    }

    const currentProviderName = providers.find(p => p.id === provider)?.name;

    return (
        <div className="ai-config-view">
            <div className="view-header">
                <h1>AI Configuration</h1>
                <p>Configure how your AI bot interacts with customers</p>
            </div>

            <div className="config-container">
                <div className="config-left">
                    <div className="config-card">
                        <div className="card-header">
                            <FaRobot className="card-icon" />
                            <h2>Bot Settings</h2>
                        </div>

                        <p className="description">
                            Define the persona, provider, and behavior of your AI agent.
                        </p>

                        <div className="form-group">
                            <label>AI Provider</label>
                            <select
                                value={provider}
                                onChange={(e) => setProvider(e.target.value)}
                                className="provider-select"
                            >
                                {providers.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                API Key for {currentProviderName}
                                {keysConfigured[provider] && (
                                    <span className="key-status configured">
                                        <FaCheckCircle /> Configured
                                    </span>
                                )}
                                {!keysConfigured[provider] && (
                                    <span className="key-status missing">
                                        <FaExclamationTriangle /> Not Configured
                                    </span>
                                )}
                            </label>

                            {!isEditingKey && keysConfigured[provider] ? (
                                <div className="configured-key-view">
                                    <div className="key-masked-display">
                                        ••••••••••••••••••••
                                    </div>
                                    <button
                                        className="btn-change-key"
                                        onClick={() => setIsEditingKey(true)}
                                    >
                                        <FaPen size={12} /> Change API Key
                                    </button>
                                </div>
                            ) : (
                                <div className="key-input-wrapper">
                                    <input
                                        type="password"
                                        value={apiKeysInput[provider]}
                                        onChange={(e) => handleKeyChange(provider, e.target.value)}
                                        placeholder={keysConfigured[provider] ? "Enter new key to update..." : `Enter ${currentProviderName} API Key`}
                                        className="api-key-input"
                                        autoFocus={isEditingKey && keysConfigured[provider]}
                                    />
                                    {keysConfigured[provider] && (
                                        <button
                                            className="btn-cancel-edit"
                                            onClick={() => {
                                                setIsEditingKey(false);
                                                handleKeyChange(provider, ''); // Clear input on cancel
                                            }}
                                            title="Cancel changing key"
                                        >
                                            <FaTimes />
                                        </button>
                                    )}
                                </div>
                            )}

                            <small className="field-hint">
                                {isEditingKey
                                    ? "Enter your API key above. It will be encrypted and stored securely."
                                    : "API key is configured and active."}
                            </small>
                        </div>

                        <div className="form-group checkbox-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={autoReply}
                                    onChange={(e) => setAutoReply(e.target.checked)}
                                />
                                <span className="label-text">Enable Auto-Reply for New Chats</span>
                            </label>
                            <p className="description-small">
                                If enabled, the AI will automatically reply to the first message in new conversations.
                            </p>
                        </div>


                        <div className="controls">
                            <div className="slider-group">
                                <label>Creativity (Temperature): {temperature}</label>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    value={temperature}
                                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                                />
                                <div className="slider-labels">
                                    <span>Precise</span>
                                    <span>Creative</span>
                                </div>
                            </div>

                            <div className="slider-group">
                                <label>Max Reply Length (Tokens): {maxTokens}</label>
                                <input
                                    type="range"
                                    min="50"
                                    max="1000"
                                    step="50"
                                    value={maxTokens}
                                    onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                                />
                                <div className="slider-labels">
                                    <span>Short</span>
                                    <span>Long</span>
                                </div>
                            </div>
                        </div>


                        <div className="action-buttons">
                            <button className="btn-secondary" onClick={handleReset}>
                                <FaUndo /> Reset to Default
                            </button>
                            <button className="btn-primary" onClick={handleSave}>
                                <FaSave /> {saved ? saveMessage : 'Save Configuration'}
                            </button>
                        </div>

                        <div className="bulk-actions-section">
                            <div className="divider"></div>
                            <h3>Bulk Actions</h3>
                            <p className="description">
                                Apply AI settings to your <strong>existing</strong> chat history.
                            </p>
                            <div className="bulk-buttons">
                                <button
                                    className="btn-bulk btn-enable-all"
                                    onClick={() => handleBulkToggle(true)}
                                    disabled={bulkLoading}
                                >
                                    {bulkLoading ? 'Processing...' : 'Turn On AI for Existing Chats'}
                                </button>
                                <button
                                    className="btn-bulk btn-disable-all"
                                    onClick={() => handleBulkToggle(false)}
                                    disabled={bulkLoading}
                                >
                                    {bulkLoading ? 'Processing...' : 'Turn Off AI for Existing Chats'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="config-right">
                    <div className="config-card full-height-card">
                        <label className="section-label">System Prompt</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="e.g., You are a sales representative..."
                            className="prompt-textarea"
                        />
                    </div>

                    <div className="info-card">
                        <h3>Tips for effective prompts</h3>
                        <ul>
                            <li><strong>Be specific:</strong> Define the role clearly (e.g., "Senior Sales Agent").</li>
                            <li><strong>Set boundaries:</strong> Tell the AI what NOT to do (e.g., "Do not promise delivery dates").</li>
                            <li><strong>Tone:</strong> Specify the desired tone (e.g., "Friendly but professional").</li>
                            <li><strong>Context:</strong> Provide key business details the AI should know.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AIConfig;
