import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import ChatWindow from './ChatWindow';
import { IoClose } from 'react-icons/io5';
import './Dashboard.css';
import Loader from './Loader';

function Dashboard() {
    const [stats, setStats] = useState({
        chatCount: 0,
        aiInteractions: 0,
        isConnected: false
    });
    const [loading, setLoading] = useState(true);
    const [activeChat, setActiveChat] = useState(null);
    const [chatMessages, setChatMessages] = useState([]);
    const [expandedForm, setExpandedForm] = useState(null);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const data = await api.get('/api/dashboard/stats');

            if (data.success) {
                setStats({
                    chatCount: data.data.whatsapp.totalChats || 0,
                    aiInteractions: data.data.ai.interactions || 0,
                    leads: data.data.whatsapp.leads, // Leads stats
                    voiceBot: data.data.voiceBot, // Dummy voice bot stats
                    forms: data.data.forms, // Forms stats
                    email: data.data.email,
                    isConnected: data.data.whatsapp?.connected || false
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFormExpand = (formId) => {
        setExpandedForm(prev => prev === formId ? null : formId);
    };

    const handleSubmissionClick = (submission) => {
        console.log("Clicked submission:", submission);
        // Placeholder for navigation or modal
        // For now, maybe just alert or log
    };

    const handleChatClick = (chat) => {
        // Normalize chat object for ChatWindow
        const normalizedChat = {
            ...chat,
            jid: chat.chatJid,
            name: chat.contactName || chat.phoneNumber || chat.chatJid.split('@')[0],
            phone: chat.phoneNumber
        };
        setActiveChat(normalizedChat);
        setChatMessages([]); // ChatWindow will fetch messages itself via useEffect when selectedChat changes
    };

    const handleCloseChat = () => {
        setActiveChat(null);
        setChatMessages([]);
        // Refresh dashboard stats when closing to show updated unread counts/sentiment
        fetchDashboardData();
    };

    const handleChatUpdate = (updatedChat) => {
        // Update the active chat state locally
        setActiveChat(prev => ({ ...prev, ...updatedChat }));
    };

    // Dummy handler for message updates from ChatWindow (it fetches its own, but we pass setter)
    // Actually ChatWindow calls setMessages(data, chatId). We just update our local state.
    const handleMessagesUpdate = (msgs) => {
        setChatMessages(msgs);
    };

    if (loading) {
        return <div className="loading">Loading dashboard...</div>;
    }

    return (
        <div className="dashboard-view">
            <div className="view-header">
                <h1>Dashboard</h1>
                <p>Overview of your business metrics</p>
            </div>

            <div className="dashboard-grid">
                {/* Leads Section (WhatsApp Sentiment) */}
                <div className="stat-card leads-card">
                    <div className="stat-header">
                        <div className="stat-icon whatsapp">📱</div>
                        <div className="stat-info">
                            <h3>WhatsApp Leads</h3>
                            {stats.isConnected ? (
                                <div className="leads-summary">
                                    <span className="lead-tag pos">{stats.leads?.positive || 0} Positive</span>
                                    <span className="lead-tag neg">{stats.leads?.negative || 0} Negative</span>
                                </div>
                            ) : (
                                <p className="stat-value">Not Connected</p>
                            )}
                        </div>
                    </div>

                    {stats.isConnected && (
                        <div className="leads-lists-container">
                            <div className="lead-column positive-col">
                                <h4>Positive Interactions</h4>
                                <div className="lead-list">
                                    {stats.leads?.positiveList?.length > 0 ? (
                                        stats.leads.positiveList.map(chat => (
                                            <div key={chat._id} className="lead-chat-item" onClick={() => handleChatClick(chat)}>
                                                <div className="lead-avatar">
                                                    {(chat.contactName || chat.phoneNumber || '?').charAt(0)}
                                                </div>
                                                <div className="lead-details">
                                                    <span className="lead-name">{chat.contactName || chat.phoneNumber}</span>
                                                    <span className="lead-time">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                                                </div>
                                                <button className="lead-chat-btn">💬</button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="empty-lead-list">No positive leads yet</p>
                                    )}
                                </div>
                            </div>

                            <div className="lead-column negative-col">
                                <h4>Negative Interactions</h4>
                                <div className="lead-list">
                                    {stats.leads?.negativeList?.length > 0 ? (
                                        stats.leads.negativeList.map(chat => (
                                            <div key={chat._id} className="lead-chat-item" onClick={() => handleChatClick(chat)}>
                                                <div className="lead-avatar">
                                                    {(chat.contactName || chat.phoneNumber || '?').charAt(0)}
                                                </div>
                                                <div className="lead-details">
                                                    <span className="lead-name">{chat.contactName || chat.phoneNumber}</span>
                                                    <span className="lead-time">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                                                </div>
                                                <button className="lead-chat-btn">💬</button>
                                            </div>
                                        ))
                                    ) : (
                                        <p className="empty-lead-list">No negative leads yet</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Email Insights Section */}
                <div className="stat-card email-card">
                    <div className="stat-header">
                        <div className="stat-icon email">📧</div>
                        <div className="stat-info">
                            <h3>Email Insights</h3>
                            {stats.email?.connected ? (
                                <div className="email-stats-row">
                                    <div className="estat">
                                        <span className="estat-val">{stats.email.unread}</span>
                                        <span className="estat-label">Unread</span>
                                    </div>
                                    <div className="estat">
                                        <span className="estat-val">{stats.email.total}</span>
                                        <span className="estat-label">Total</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="connect-prompt">
                                    <p>Connect your Gmail to see AI insights.</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Voice AI Agent Section */}
                <div className="stat-card">
                    <div className="stat-icon voice">🎙️</div>
                    <div className="stat-info">
                        <h3>Voice AI Agent</h3>
                        {stats.voiceBot?.connected ? (
                            <div className="voice-stats">
                                <div className="voice-row">
                                    <span className="v-label">Total Executions:</span>
                                    <span className="v-value">{stats.voiceBot?.totalCalls || 0}</span>
                                </div>
                                <div className="voice-row">
                                    <span className="v-label">Time Talked:</span>
                                    <span className="v-value">{stats.voiceBot?.totalDurationFormatted || '0m 0s'}</span>
                                </div>
                                <div className="voice-row">
                                    <span className="v-label">Total Cost:</span>
                                    <span className="v-value highlight-red">{stats.voiceBot?.cost || '$0.00'}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="connect-prompt">
                                <p>Agent isn't connected</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* AI Interactions */}
                <div className="stat-card">
                    <div className="stat-icon ai">🤖</div>
                    <div className="stat-info">
                        <h3>AI Interactions</h3>
                        <p className="stat-value">{stats.aiInteractions}</p>
                        <p className="stat-subtext">Messages sent by assistant</p>
                    </div>
                </div>
            </div>

            {/* Priority Inbox Section */}
            {stats.email?.connected && stats.email?.priorityList?.length > 0 && (
                <div className="priority-section">
                    <h2>Priority Email Inbox</h2>
                    <div className="priority-list-scroll">
                        {stats.email.priorityList.map((email) => (
                            <div key={email.id} className="priority-item">
                                <div className="pi-left">
                                    <div className={`pi-score-circle ${email.score >= 8 ? 'high' : email.score >= 4 ? 'medium' : 'low'}`}>
                                        {email.score}
                                    </div>
                                </div>
                                <div className="pi-content">
                                    <div className="pi-header">
                                        <span className="pi-subject">{email.subject}</span>
                                        <span className="pi-date">{new Date(email.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="pi-from">{email.from}</div>
                                    <div className="pi-reason"><strong>AI Analysis:</strong> {email.reason}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Forms Section */}
            <div className="forms-section">
                <h2>Forms Overview</h2>
                <div className="forms-list">
                    {stats.forms && stats.forms.length > 0 ? (
                        stats.forms.map((form) => (
                            <div className="form-card" key={form._id}>
                                <div className="form-header" onClick={() => toggleFormExpand(form._id)}>
                                    <div className="form-title-row">
                                        <h3>{form.title}</h3>
                                        <span className="form-count-badge">{form.totalSubmissions} Submissions</span>
                                    </div>
                                    <span className="expand-icon">{expandedForm === form._id ? '▼' : '▶'}</span>
                                </div>

                                {expandedForm === form._id && (
                                    <div className="form-submissions-list">
                                        <h4>Last 5 Submissions</h4>
                                        {form.recentSubmissions && form.recentSubmissions.length > 0 ? (
                                            <ul className="submissions-list">
                                                {form.recentSubmissions.map(sub => (
                                                    <li key={sub._id} onClick={() => handleSubmissionClick(sub)} className="submission-item">
                                                        <div className="sub-info">
                                                            {sub.data ? (
                                                                <div className="sub-data-grid">
                                                                    {Object.entries(sub.data).map(([key, value]) => (
                                                                        <div key={key} className="sub-field">
                                                                            <span className="sub-key">{key}:</span>
                                                                            <span className="sub-value">{String(value)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="sub-email">{sub.email}</span>
                                                            )}
                                                        </div>
                                                        <span className="sub-date">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="no-subs">No submissions yet.</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="no-forms">
                            <p>No forms created yet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Chat Modal */}
            {activeChat && (
                <div className="modal-overlay" onClick={handleCloseChat}>
                    <div className="quick-chat-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="close-modal-btn" onClick={handleCloseChat}>
                            <IoClose />
                        </button>
                        <ChatWindow
                            selectedChat={activeChat}
                            messages={chatMessages}
                            setMessages={handleMessagesUpdate}
                            onUpdateChat={handleChatUpdate}
                            // No token needed, API client handles it
                            onForward={() => { }} // Forwarding disabled in quick chat for now
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;
