import { useState, useEffect } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import api from '../utils/apiClient';
import ChatWindow from './ChatWindow';
import { FaRegCommentDots, FaExternalLinkAlt, FaWhatsapp, FaEnvelope, FaPhone, FaRobot, FaWpforms, FaArrowUp, FaArrowDown, FaLock } from 'react-icons/fa';
import './Dashboard.css';

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
    const [aiConfigured, setAiConfigured] = useState(true);

    useEffect(() => {
        fetchDashboardData();
        fetchSheetLeads();
        checkAiStatus();
    }, []);

    const checkAiStatus = async () => {
        try {
            const res = await api.get('/api/ai/config');
            if (res.success && res.data) {
                const hasKey = res.data.keysConfigured?.[res.data.provider];
                setAiConfigured(!!hasKey);
            }
        } catch {
            setAiConfigured(false);
        }
    };

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
                    twilio: data.data.twilio,
                    forms: data.data.forms,
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
            <IonPage>
                <IonContent className="ion-padding">
                    <div className="dash-loading">
                        <div className="dash-loading-spinner"></div>
                        <p>Loading dashboard...</p>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonContent className="ion-padding">
                <div className="dash-inner">
                    <header className="dash-header">
                        <div>
                            <h1>Dashboard</h1>
                            <p>Overview of your business metrics</p>
                        </div>
                    </header>

                    <div className="dash-stats-row">
                        <div className="dash-stat-card">
                            <div className="dash-stat-icon whatsapp"><FaWhatsapp /></div>
                            <div className="dash-stat-body">
                                <span className="dash-stat-label">WhatsApp</span>
                                <span className="dash-stat-value">{stats.isConnected ? stats.chatCount : '--'}</span>
                                <span className="dash-stat-sub">{stats.isConnected ? 'Total chats' : 'Not connected'}</span>
                            </div>
                        </div>

                        <div className="dash-stat-card">
                            <div className="dash-stat-icon email"><FaEnvelope /></div>
                            <div className="dash-stat-body">
                                <span className="dash-stat-label">Email</span>
                                <span className="dash-stat-value">{stats.email?.connected ? stats.email.total : '--'}</span>
                                <span className="dash-stat-sub">{stats.email?.connected ? `${stats.email.unread} priority` : 'Not connected'}</span>
                            </div>
                        </div>

                        <div className="dash-stat-card">
                            <div className="dash-stat-icon calls"><FaPhone /></div>
                            <div className="dash-stat-body">
                                <span className="dash-stat-label">Phone Calls</span>
                                <span className="dash-stat-value">{stats.twilio?.connected ? stats.twilio.totalCalls : '--'}</span>
                                <span className="dash-stat-sub">{stats.twilio?.connected ? `${stats.twilio.completedCalls} completed` : 'Not connected'}</span>
                            </div>
                        </div>

                        <div className={`dash-stat-card ${!aiConfigured ? 'dash-disabled-card' : ''}`}>
                            {!aiConfigured && (
                                <div className="dash-card-overlay">
                                    <FaLock />
                                    <span>AI not configured</span>
                                </div>
                            )}
                            <div className="dash-stat-icon ai"><FaRobot /></div>
                            <div className="dash-stat-body">
                                <span className="dash-stat-label">AI Messages</span>
                                <span className="dash-stat-value">{stats.isConnected ? stats.aiInteractions : '--'}</span>
                                <span className="dash-stat-sub">{stats.isConnected ? 'Auto-replies sent' : 'Not connected'}</span>
                            </div>
                        </div>
                    </div>

                    {stats.isConnected && (
                        <div className={`dash-leads-section ${!aiConfigured ? 'dash-disabled-section' : ''}`}>
                            {!aiConfigured && (
                                <div className="dash-section-overlay">
                                    <FaLock className="dash-overlay-icon" />
                                    <span className="dash-overlay-title">AI Not Configured</span>
                                    <span className="dash-overlay-sub">Configure your AI provider in AI Config to enable sentiment analysis.</span>
                                </div>
                            )}
                            <div className="dash-section-header">
                                <h2>WhatsApp Leads</h2>
                                <div className="dash-leads-tags">
                                    <span className="dash-tag positive">{stats.leads?.positive || 0} Positive</span>
                                    <span className="dash-tag negative">{stats.leads?.negative || 0} Negative</span>
                                </div>
                            </div>
                            <div className="dash-leads-grid">
                                <div className="dash-lead-column positive">
                                    <h4><FaArrowUp /> Positive</h4>
                                    <div className="dash-lead-list">
                                        {stats.leads?.positiveList?.length > 0 ? (
                                            stats.leads.positiveList.map(chat => (
                                                <div key={chat._id} className="dash-lead-item" onClick={() => handleChatClick(chat)}>
                                                    <div className="dash-lead-avatar positive">
                                                        {(chat.contactName || chat.phoneNumber || '?').charAt(0)}
                                                    </div>
                                                    <div className="dash-lead-info">
                                                        <span className="dash-lead-name">{chat.contactName || chat.phoneNumber}</span>
                                                        <span className="dash-lead-time">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <FaRegCommentDots className="dash-lead-action" />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="dash-empty-text">No positive leads yet</p>
                                        )}
                                    </div>
                                </div>

                                <div className="dash-lead-column negative">
                                    <h4><FaArrowDown /> Negative</h4>
                                    <div className="dash-lead-list">
                                        {stats.leads?.negativeList?.length > 0 ? (
                                            stats.leads.negativeList.map(chat => (
                                                <div key={chat._id} className="dash-lead-item" onClick={() => handleChatClick(chat)}>
                                                    <div className="dash-lead-avatar negative">
                                                        {(chat.contactName || chat.phoneNumber || '?').charAt(0)}
                                                    </div>
                                                    <div className="dash-lead-info">
                                                        <span className="dash-lead-name">{chat.contactName || chat.phoneNumber}</span>
                                                        <span className="dash-lead-time">{new Date(chat.lastMessageAt).toLocaleDateString()}</span>
                                                    </div>
                                                    <FaRegCommentDots className="dash-lead-action" />
                                                </div>
                                            ))
                                        ) : (
                                            <p className="dash-empty-text">No negative leads yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {stats.email?.connected && stats.email?.priorityList?.length > 0 && (
                        <div className="dash-section">
                            <div className="dash-section-header">
                                <h2>Priority Emails</h2>
                            </div>
                            <div className="dash-priority-list">
                                {stats.email.priorityList.map((email) => (
                                    <div key={email.id} className="dash-priority-item">
                                        <div className={`dash-priority-score ${email.score >= 8 ? 'high' : email.score >= 4 ? 'medium' : 'low'}`}>
                                            {email.score}
                                        </div>
                                        <div className="dash-priority-content">
                                            <div className="dash-priority-top">
                                                <span className="dash-priority-subject">{email.subject}</span>
                                                <span className="dash-priority-date">{new Date(email.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                                            </div>
                                            <span className="dash-priority-from">{email.from}</span>
                                            <span className="dash-priority-reason">{email.reason}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {sheetLeads.spreadsheetId && (
                        <div className="dash-section">
                            <div className="dash-section-header">
                                <h2>Recent Extracted Leads</h2>
                                <a href={`https://docs.google.com/spreadsheets/d/${sheetLeads.spreadsheetId}/edit`} target="_blank" rel="noopener noreferrer" className="dash-link-btn">
                                    <FaExternalLinkAlt /> Open Sheet
                                </a>
                            </div>
                            {sheetLeads.loading ? (
                                <p className="dash-empty-text">Loading sheet data...</p>
                            ) : sheetLeads.rows.length > 0 ? (
                                <div className="dash-table-wrap">
                                    <table className="dash-table">
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
                                </div>
                            ) : (
                                <p className="dash-empty-text">No leads extracted yet.</p>
                            )}
                        </div>
                    )}

                    {stats.forms && stats.forms.length > 0 && (
                        <div className="dash-section">
                            <div className="dash-section-header">
                                <h2>Forms</h2>
                            </div>
                            <div className="dash-forms-list">
                                {stats.forms.map((form) => (
                                    <div className="dash-form-card" key={form._id}>
                                        <div className="dash-form-header" onClick={() => toggleFormExpand(form._id)}>
                                            <div className="dash-form-title">
                                                <FaWpforms className="dash-form-icon" />
                                                <h3>{form.title}</h3>
                                            </div>
                                            <div className="dash-form-right">
                                                <span className="dash-form-badge">{form.totalSubmissions}</span>
                                                <span className="dash-expand">{expandedForm === form._id ? '\u25BC' : '\u25B6'}</span>
                                            </div>
                                        </div>
                                        {expandedForm === form._id && (
                                            <div className="dash-form-submissions">
                                                {form.recentSubmissions && form.recentSubmissions.length > 0 ? (
                                                    <div className="dash-submissions-list">
                                                        {form.recentSubmissions.map(sub => (
                                                            <div key={sub._id} className="dash-submission-item">
                                                                <div className="dash-sub-data">
                                                                    {sub.data ? (
                                                                        Object.entries(sub.data).map(([key, value]) => (
                                                                            <div key={key} className="dash-sub-field">
                                                                                <span className="dash-sub-key">{key}:</span>
                                                                                <span className="dash-sub-val">{String(value)}</span>
                                                                            </div>
                                                                        ))
                                                                    ) : (
                                                                        <span>{sub.email}</span>
                                                                    )}
                                                                </div>
                                                                <span className="dash-sub-date">{new Date(sub.submittedAt).toLocaleDateString()}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="dash-empty-text">No submissions yet.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeChat && (
                        <div className="dash-modal-overlay" onClick={handleCloseChat}>
                            <div className="dash-chat-modal" onClick={(e) => e.stopPropagation()}>
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
            </IonContent>
        </IonPage>
    );
}

export default Dashboard;
