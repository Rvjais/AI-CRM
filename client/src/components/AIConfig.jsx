import { useState, useEffect } from 'react';
import { FaRobot, FaSave, FaUndo } from 'react-icons/fa';
import './AIConfig.css';

function AIConfig({ token }) {
    const [systemPrompt, setSystemPrompt] = useState(
        "You are a helpful customer support assistant for RainCRM. Be professional, concise, and friendly."
    );
    const [temperature, setTemperature] = useState(0.7);
    const [saved, setSaved] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConfig();
    }, [token]);

    const fetchConfig = async () => {
        if (!token) return;
        try {
            const response = await fetch('http://localhost:3000/api/ai/config', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data) {
                    setSystemPrompt(data.data.systemPrompt || "You are a helpful customer support assistant for RainCRM. Be professional, concise, and friendly.");
                    // Assume we might add temperature later to backend, for now just local state or mock
                    // setTemperature(data.data.temperature || 0.7);
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
            const response = await fetch('http://localhost:3000/api/ai/config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    systemPrompt,
                    temperature,
                    enabled: true // Always ensure enabled if we are saving config
                })
            });

            if (response.ok) {
                setSaved(true);
                setTimeout(() => setSaved(false), 3000);
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
    };

    if (loading) {
        return <div className="loading">Loading configuration...</div>;
    }

    return (
        <div className="ai-config-view">
            <div className="view-header">
                <h1>AI Configuration</h1>
                <p>Configure how your AI bot interacts with customers</p>
            </div>

            <div className="config-container">
                <div className="config-card">
                    <div className="card-header">
                        <FaRobot className="card-icon" />
                        <h2>System Prompt</h2>
                    </div>
                    <p className="description">
                        Define the persona and behavior of your AI agent. This instruction will be sent to the AI model for every response.
                    </p>

                    <div className="form-group">
                        <label>Bot Persona & Instructions</label>
                        <textarea
                            value={systemPrompt}
                            onChange={(e) => setSystemPrompt(e.target.value)}
                            placeholder="e.g., You are a sales representative..."
                            className="prompt-textarea"
                            rows={12}
                        />
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
                    </div>

                    <div className="action-buttons">
                        <button className="btn-secondary" onClick={handleReset}>
                            <FaUndo /> Reset to Default
                        </button>
                        <button className="btn-primary" onClick={handleSave}>
                            <FaSave /> {saved ? 'Saved!' : 'Save Configuration'}
                        </button>
                    </div>
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
    );
}

export default AIConfig;
