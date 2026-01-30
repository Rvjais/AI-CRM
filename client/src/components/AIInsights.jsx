import { useState, useEffect } from 'react';
import { FaInfoCircle } from 'react-icons/fa';
import SentimentGauge from './SentimentGauge';
import './AIInsights.css';

function AIInsights({ selectedChat, messages, aiEnabled }) {
    const [sentiment, setSentiment] = useState('neutral');
    const [suggestions, setSuggestions] = useState([]);
    const [summary, setSummary] = useState('');
    const [improvements, setImprovements] = useState([]);
    const [note, setNote] = useState('');

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

    useEffect(() => {
        if (messages.length > 0 && aiEnabled) {
            analyzeSentiment();
            generateSuggestions();
            generateSummary();
            generateImprovements();
        }
    }, [messages, aiEnabled]);

    const analyzeSentiment = () => {
        // Simple sentiment analysis based on keywords
        const messageText = messages.map(m => m.message).join(' ').toLowerCase();

        const positiveWords = ['good', 'great', 'excellent', 'thanks', 'perfect', 'love', 'happy'];
        const negativeWords = ['bad', 'problem', 'issue', 'wrong', 'not', 'disappointed'];

        let positiveCount = 0;
        let negativeCount = 0;

        positiveWords.forEach(word => {
            if (messageText.includes(word)) positiveCount++;
        });

        negativeWords.forEach(word => {
            if (messageText.includes(word)) negativeCount++;
        });

        if (positiveCount > negativeCount) {
            setSentiment('positive');
        } else if (negativeCount > positiveCount) {
            setSentiment('negative');
        } else {
            setSentiment('neutral');
        }
    };

    const generateSuggestions = () => {
        const messageText = messages.map(m => m.message).join(' ').toLowerCase();
        const newSuggestions = [];

        if (messageText.includes('flight') || messageText.includes('travel')) {
            newSuggestions.push('Suggest flights');
        }
        if (messageText.includes('weather') || messageText.includes('temperature')) {
            newSuggestions.push('Check weather');
        }
        if (messageText.includes('book') || messageText.includes('reservation')) {
            newSuggestions.push('Help booking');
        }
        if (messageText.includes('price') || messageText.includes('cost')) {
            newSuggestions.push('Show pricing');
        }

        setSuggestions(newSuggestions.slice(0, 3));
    };

    const generateSummary = () => {
        if (messages.length === 0) {
            setSummary('No conversation yet.');
            return;
        }

        const lastMessages = messages.slice(-3);
        const topics = [];

        if (lastMessages.some(m => m.message.toLowerCase().includes('weekend'))) {
            topics.push('Planning weekend trip');
        }
        if (lastMessages.some(m => m.message.toLowerCase().includes('mountain') || m.message.toLowerCase().includes('hotel'))) {
            topics.push('Discussing accommodation');
        }
        if (lastMessages.some(m => m.message.toLowerCase().includes('flight'))) {
            topics.push('Need to book flights');
        }

        if (topics.length > 0) {
            setSummary(`Conversation summary: ${topics.join('. ')}.`);
        } else {
            setSummary(`Conversation has ${messages.length} messages. Recent topics discussed.`);
        }
    };

    const generateImprovements = () => {
        // Mock improvements based on message patterns
        const tips = [];
        const messageText = messages.map(m => m.message).join(' ').toLowerCase();

        if (messages.length < 5) {
            tips.push("Ask open-ended questions to engage the customer");
        }
        if (!messageText.includes("assist") && !messageText.includes("help")) {
            tips.push("Offer specific assistance to guide the conversation");
        }
        if (sentiment === 'negative') {
            tips.push("Acknowledge frustration and offer a direct solution");
            tips.push("Use empathetic language");
        }

        setImprovements(tips.slice(0, 2));
    };

    return (
        <div className="ai-insights">
            <div className="ai-insights-header">
                <h2>AI INSIGHTS DASHBOARD</h2>
            </div>

            <div className="insights-content">
                <div className="insight-card">
                    <h3>SENTIMENT</h3>
                    <SentimentGauge sentiment={sentiment} />
                    <p className="sentiment-label">
                        {sentiment === 'positive' ? 'Positive' : sentiment === 'negative' ? 'Negative' : 'Neutral'} Overall Sentiment
                    </p>
                </div>

                {aiEnabled && suggestions.length > 0 && (
                    <div className="insight-card">
                        <h3>SUGGESTED ACTIONS</h3>
                        <div className="suggestions">
                            {suggestions.map((suggestion, index) => (
                                <button key={index} className="suggestion-btn">
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="insight-card">
                    <h3>CONTEXT/SUMMARY</h3>
                    <p className="summary-text">
                        {aiEnabled ? summary : 'Enable AI mode to see conversation summary'}
                    </p>
                </div>

                {aiEnabled && improvements.length > 0 && (
                    <div className="insight-card improvement-card">
                        <h3>💡 CONVERSATION TIPS</h3>
                        <ul className="improvement-list">
                            {improvements.map((tip, idx) => (
                                <li key={idx}>{tip}</li>
                            ))}
                        </ul>
                    </div>
                )}

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

                {!aiEnabled && (
                    <div className="ai-disabled-notice">
                        <p><FaInfoCircle /> Enable AI-Enhanced Mode in the sidebar to unlock full insights</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AIInsights;
