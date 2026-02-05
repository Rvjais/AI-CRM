import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import ChatWindow from './ChatWindow';
import { IoClose } from 'react-icons/io5';
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
                    sentiment: data.data.whatsapp.sentiment,
                    recentActivity: data.data.recentActivity || [],
                    email: data.data.email, // Store email stats
                    isConnected: true
                });
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
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
                <div className="stat-card">
                    <div className="stat-icon whatsapp">📱</div>
                    <div className="stat-info">
                        <h3>WhatsApp Chats</h3>
                        <p className="stat-value">{stats.chatCount}</p>
                        <div className="sentiment-mini-bar">
                            <div className="s-segment pos" style={{ flex: stats.sentiment?.positive || 1 }} title={`Positive: ${stats.sentiment?.positive}`}></div>
                            <div className="s-segment neu" style={{ flex: stats.sentiment?.neutral || 1 }} title={`Neutral: ${stats.sentiment?.neutral}`}></div>
                            <div className="s-segment neg" style={{ flex: stats.sentiment?.negative || 1 }} title={`Negative: ${stats.sentiment?.negative}`}></div>
                        </div>
                        <small className="stat-subtext">
                            {stats.sentiment?.positive || 0} Positive • {stats.sentiment?.negative || 0} Negative
                        </small>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon email">📧</div>
                    <div className="stat-info">
                        <h3>Email Conversations</h3>
                        {stats.email?.connected ? (
                            <>
                                <p className="stat-value">{stats.email.unread}</p>
                                <p className="stat-subtext">Unread emails</p>
                            </>
                        ) : (
                            <>
                                <p className="stat-value">Not Connected</p>
                                <p className="stat-subtext">Connect Gmail in Email tab</p>
                            </>
                        )}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon ai">🤖</div>
                    <div className="stat-info">
                        <h3>AI Interactions</h3>
                        <p className="stat-value">{stats.aiInteractions}</p>
                        <p className="stat-subtext">Messages sent by assistant</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                    {stats.recentActivity && stats.recentActivity.length > 0 ? (
                        stats.recentActivity.map((chat) => (
                            <div
                                className="activity-item clickable"
                                key={chat._id || chat.chatJid}
                                onClick={() => handleChatClick(chat)}
                            >
                                <div className={`activity-icon sentiment-${chat.sentiment}`}>
                                    {chat.sentiment === 'positive' ? '😊' : chat.sentiment === 'negative' ? '😟' : '💬'}
                                </div>
                                <div className="activity-content">
                                    <p>
                                        <strong>{chat.contactName || chat.phoneNumber || chat.chatJid.split('@')[0]}</strong>
                                    </p>
                                    <p className="activity-sub">
                                        {chat.sentiment && <span className={`tag ${chat.sentiment}`}>{chat.sentiment}</span>}
                                        {chat.unreadCount > 0 && <span className="tag unread">{chat.unreadCount} unread</span>}
                                    </p>
                                </div>
                                <span className="activity-time">
                                    {new Date(chat.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                        ))
                    ) : (
                        <div className="activity-item">
                            <div className="activity-content">
                                <p>No recent activity</p>
                            </div>
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
