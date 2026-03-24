import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import ChatWindow from './ChatWindow';
import { IoClose } from 'react-icons/io5';
import { FaRegCommentDots, FaExternalLinkAlt } from 'react-icons/fa';
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
    const [sheetLeads, setSheetLeads] = useState({ rows: [], spreadsheetId: null, loading: true });

    useEffect(() => {
        fetchDashboardData();
        fetchSheetLeads();
    }, []);

    const fetchSheetLeads = async () => {
        try {
            const data = await api.get('/api/sheets/recent-rows');
            if (data.success) {
                setSheetLeads({ rows: data.data.rows || [], spreadsheetId: data.data.spreadsheetId, loading: false });
            }
        } catch {
            setSheetLeads(prev => ({ ...prev, loading: false }));
        }
    };

    const fetchDashboardData = async () => {
        try {
            const data = await api.get('/api/dashboard/stats');

            if (data.success) {
                setStats({
                    chatCount: data.data.whatsapp.totalChats || 0,
                    aiInteractions: data.data.ai.interactions || 0,
                    leads: data.data.whatsapp.leads,
                    voiceBot: data.data.voiceBot,
                    forms: data.data.forms,
                    email: data.data.email,
                    isConnected: data.data.whatsapp?.connected || false,
                    auth: data.data.auth
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
    };

    const handleChatClick = (chat) => {
        const normalizedChat = {
            ...chat,
            jid: chat.chatJid,
            name: chat.contactName || chat.phoneNumber || chat.chatJid.split('@')[0],
            phone: chat.phoneNumber
        };
        setActiveChat(normalizedChat);
        setChatMessages([]);
    };

    const handleCloseChat = () => {
        setActiveChat(null);
        setChatMessages([]);
        fetchDashboardData();
    };

    const handleChatUpdate = (updatedChat) => {
        setActiveChat(prev => ({ ...prev, ...updatedChat }));
    };

    const handleMessagesUpdate = (msgs) => {
        setChatMessages(msgs);
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="dashboard-loading">
                    <div className="loader"></div>
                    <p>Analyzing your ecosystem...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <div className="dashboard-view">
                <div className="header-card">
                    <div className="view-header centered">
                        <h1>Dashboard</h1>
                        <p>Overview of your business metrics</p>
                        <div className="header-divider"></div>
                    </div>
                </div>

                <div className="dashboard-grid">
                    {/* Leads Section (WhatsApp Sentiment) */}
                    <div className="stat-card leads-card">
                        <div className="leads-card-inner">
                            <div className="stat-header">
                                <div className="stat-icon whatsapp">📱</div>
                                <div className="stat-info">
                                    <h3>WhatsApp Leads</h3>
                                    {stats.isConnected ? (
                                        <div className="leads-summary">
                                            <span className="lead-tag pos">{stats.leads?.positive || 0} POSITIVE</span>
                                            <span className="lead-tag neg">{stats.leads?.negative || 0} NEGATIVE</span>
                                        </div>
                                    ) : (
                                        <p className="stat-value">Not Connected</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {stats.isConnected && (
                            <div className="leads-lists-container">
                                <div className="lead-column positive-container">
                                    <h4>POSITIVE INTERACTIONS</h4>
                                    <div className="lead-list">
                                        {stats.leads?.positiveList?.length > 0 ? (
                                            stats.leads.positiveList.map(chat => (
                                                <div key={chat._id} className="lead-chat-item" onClick={() => handleChatClick(chat)}>
                                                    <div className="lead-avatar positive">
                                                        {(chat.contactName || chat.phoneNumber || '?').charAt(0)}
                                                    </div>
                                                    <div className="lead-details">
                                                        <span className="lead-name">{chat.contactName || chat.phoneNumber}</span>
                                                        <span className="lead-time">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <button className="lead-chat-btn">
                                                        <FaRegCommentDots />
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="empty-lead-list">No positive leads yet</p>
                                        )}
                                    </div>
                                </div>

                                <div className="lead-column negative-container">
                                    <h4 className="negative-header">NEGATIVE INTERACTIONS</h4>
                                    <div className="lead-list">
                                        {stats.leads?.negativeList?.length > 0 ? (
                                            stats.leads.negativeList.map(chat => (
                                                <div key={chat._id} className="lead-chat-item" onClick={() => handleChatClick(chat)}>
                                                    <div className="negative-indicator"></div>
                                                    <div className="lead-avatar negative">
                                                        {(chat.contactName || chat.phoneNumber || '?').charAt(0)}
                                                    </div>
                                                    <div className="lead-details">
                                                        <span className="lead-name">{chat.contactName || chat.phoneNumber}</span>
                                                        <span className="lead-time">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <button className="lead-chat-btn">
                                                        <FaRegCommentDots />
                                                    </button>
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

                    <div className="stat-cards-row">
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
                                            <p>Connect your Gmail</p>
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
                                            <span className="v-label">Calls:</span>
                                            <span className="v-value">{stats.voiceBot?.totalCalls || 0}</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="connect-prompt">
                                        <p>Not connected</p>
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
                            </div>
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
                                        <div className="score-wrapper">
                                            <div className={`pi-score-circle ${email.score >= 8 ? 'high' : email.score >= 4 ? 'medium' : 'low'}`}>
                                                {email.score}
                                            </div>
                                            {email.score >= 8 && <span className="score-label">Label</span>}
                                        </div>
                                    </div>
                                    <div className="pi-content">
                                        <div className="pi-header">
                                            <span className="pi-subject">{email.subject}</span>
                                            <span className="pi-date">{new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                        </div>
                                        <div className="pi-from">{email.from}</div>
                                        <div className="pi-reason"><strong>{email.score >= 9 ? '❗️' : '💡'} AI Analysis:</strong> {email.reason}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Sheet Leads Section */}
                {sheetLeads.spreadsheetId && (
                    <div className="sheet-leads-section">
                        <div className="sheet-leads-header">
                            <h2>Recent Extracted Leads</h2>
                            <a
                                href={`https://docs.google.com/spreadsheets/d/${sheetLeads.spreadsheetId}/edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="sheet-open-btn"
                            >
                                <FaExternalLinkAlt /> Open Sheet
                            </a>
                        </div>
                        {sheetLeads.loading ? (
                            <div className="sheet-leads-loading">Loading sheet data...</div>
                        ) : sheetLeads.rows.length > 0 ? (
                            <table className="sheet-leads-table">
                                <thead>
                                    <tr>
                                        {Object.keys(sheetLeads.rows[0]).map(header => (
                                            <th key={header}>{header}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {sheetLeads.rows.map((row, i) => (
                                        <tr key={i}>
                                            {Object.values(row).map((val, j) => (
                                                <td key={j} title={val}>{val || '-'}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="sheet-leads-empty">No leads extracted yet. Data will appear here after AI processes conversations.</div>
                        )}
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
                            <ChatWindow
                                selectedChat={activeChat}
                                messages={chatMessages}
                                setMessages={handleMessagesUpdate}
                                onUpdateChat={handleChatUpdate}
                                onForward={() => { }}
                                onBack={handleCloseChat}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
