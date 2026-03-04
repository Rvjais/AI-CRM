import { useState, useEffect } from 'react';
import { FaInfoCircle, FaSync, FaChevronLeft, FaChevronRight, FaBrain, FaUser, FaEnvelope, FaPhone, FaMoneyBillWave, FaMapMarkerAlt, FaTag, FaCalendarAlt } from 'react-icons/fa';
import SentimentGauge from './SentimentGauge';
import './AIInsights.css';

function AIInsights({ selectedChat, messages, aiEnabled, isCollapsed, setIsCollapsed, onCloseMobile }) {
    const [note, setNote] = useState('');

    const [isRegenerating, setIsRegenerating] = useState(false);

    useEffect(() => {
        // Load saved note for this chat
        if (selectedChat) {
            const savedNote = localStorage.getItem(`note_${selectedChat._id}`);
            setNote(savedNote || '');
        }
    }, [selectedChat]);

    const handleSaveNote = () => {
        if (selectedChat) {
            localStorage.setItem(`note_${selectedChat._id}`, note);
        }
    };

    const handleRegenerate = async () => {
        if (!selectedChat || isRegenerating) return;

        setIsRegenerating(true);
        try {
            const api = (await import('../utils/apiClient')).default;
            await api.post(`/api/messages/${selectedChat.jid}/summarize`);
            // The socket update will handle refreshing the state if connected
            // But we can also show a small success indicator if needed
        } catch (error) {
            console.error('Regeneration failed:', error);
            alert('Failed to regenerate summary. Please try again later.');
        } finally {
            setIsRegenerating(false);
        }
    };

    // Improvements logic can still be deterministic for UI guidance
    const getImprovementTips = () => {
        const tips = [];
        const sentiment = selectedChat?.sentiment || 'neutral';

        if (sentiment === 'negative') {
            tips.push("Acknowledge concerns promptly to de-escalate.");
            tips.push("Use softening language like 'I understand' or 'I apologize'.");
        } else if (sentiment === 'neutral') {
            tips.push("Try asking open-ended questions to drive engagement.");
            tips.push("Offer a specific value proposition or next step.");
        } else if (sentiment === 'positive') {
            tips.push("Encourage the customer to share their positive experience.");
            tips.push("Check if there are any other ways you can help.");
        }

        if (messages.length > 0 && !messages[messages.length - 1].fromMe) {
            tips.push("Respond quickly to maintain momentum.");
        }

        return tips;
    };

    const improvements = getImprovementTips();

    return (
        <div className={`ai-insights ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="ai-insights-header">
                <button
                    className="ai-toggle-btn"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand AI Panel" : "Collapse AI Panel"}
                >
                    {isCollapsed ? <FaChevronLeft /> : <FaChevronRight />}
                </button>
                {!isCollapsed ? (
                    <h2>AI INSIGHTS DASHBOARD</h2>
                ) : (
                    <FaBrain className="ai-collapsed-icon" />
                )}
                <button className="mobile-close-btn" onClick={onCloseMobile}>×</button>
            </div>

            {!isCollapsed && (
                <div className="insights-content">
                    <div className="insights-card">
                        <h3>LEAD DATA</h3>
                        {selectedChat?.extractedData && Object.keys(selectedChat.extractedData).length > 0 ? (
                            <div className="extracted-data-grid">
                                {Object.entries(selectedChat.extractedData).map(([key, value]) => {
                                    const getIcon = (k) => {
                                        k = k.toLowerCase();
                                        if (k.includes('name')) return <FaUser className="data-icon" />;
                                        if (k.includes('email')) return <FaEnvelope className="data-icon" />;
                                        if (k.includes('phone') || k.includes('contact')) return <FaPhone className="data-icon" />;
                                        if (k.includes('budget') || k.includes('price') || k.includes('cost')) return <FaMoneyBillWave className="data-icon" />;
                                        if (k.includes('location') || k.includes('address') || k.includes('city')) return <FaMapMarkerAlt className="data-icon" />;
                                        if (k.includes('service') || k.includes('product')) return <FaTag className="data-icon" />;
                                        if (k.includes('age')) return <FaCalendarAlt className="data-icon" />;
                                        return <FaInfoCircle className="data-icon" />;
                                    };

                                    return (
                                        <div key={key} className="data-item">
                                            <div className="data-icon-wrapper">
                                                {getIcon(key)}
                                            </div>
                                            <div className="data-content">
                                                <span className="data-label">{key.replace(/_/g, ' ')}</span>
                                                <span className="data-value">{value || '-'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="no-data-placeholder">
                                <p>No data extracted yet.</p>
                                <span className="sentiment-tag" data-sentiment={selectedChat?.sentiment || 'neutral'}>
                                    {selectedChat?.sentiment || 'Neutral'} Sentiment
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Suggestions Section - Shown if AI is enabled or if data exists */}
                    {((selectedChat?.suggestions && selectedChat.suggestions.length > 0)) && (
                        <div className="insight-card">
                            <h3>SUGGESTED ACTIONS</h3>
                            <div className="suggestions">
                                {selectedChat.suggestions.map((suggestion, index) => (
                                    <button key={index} className="suggestion-btn">
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Summary Section - Always show real backend summary */}
                    <div className="insight-card summary-card">
                        <div className="card-header">
                            <h3>CONTEXT/SUMMARY</h3>
                            <button
                                className={`regen-btn ${isRegenerating ? 'spinning' : ''}`}
                                onClick={handleRegenerate}
                                disabled={isRegenerating || !selectedChat}
                                title="Regenerate Summary"
                            >
                                <FaSync />
                            </button>
                        </div>
                        {selectedChat?.lastSummaryAt && (
                            <p className="summary-timestamp" style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                                Last updated: {new Date(selectedChat.lastSummaryAt).toLocaleString('en-IN', {
                                    dateStyle: 'medium',
                                    timeStyle: 'short'
                                })}
                            </p>
                        )}
                        <p className="summary-text">
                            {selectedChat?.summary || 'No summary available yet. Continue the conversation to generate insights.'}
                        </p>
                    </div>

                    {/* New Section: Conversation Improvement Tips */}
                    <div className="insight-card improvement-card">
                        <h3>💡 AI IMPROVEMENT TIPS</h3>
                        <ul className="improvement-list">
                            {improvements.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                            ))}
                        </ul>
                    </div>

                    <div className="insight-card notes-card">
                        <h3>📝 NOTES</h3>
                        <textarea
                            className="notes-input"
                            placeholder="Add notes about this customer..."
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            onBlur={handleSaveNote}
                        />
                    </div>

                    {!aiEnabled && !selectedChat?.summary && (
                        <div className="ai-disabled-notice">
                            <p><FaInfoCircle /> Auto-Reply is disabled for this chat. Analysis continues in the background.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default AIInsights;
