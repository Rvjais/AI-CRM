import { useState, useEffect } from 'react';
import api from '../utils/apiClient';
import './Dashboard.css';

function Dashboard() {
    const [stats, setStats] = useState({
        chatCount: 0,
        aiInteractions: 0,
        isConnected: false
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            // Fetch WhatsApp status
            const statusData = await api.get('/api/whatsapp/status');
            const isConnected = statusData.success && statusData.data.connected;

            // Fetch chats to get count
            let chatCount = 0;
            if (isConnected) {
                const chatsData = await api.get('/api/messages');
                if (chatsData.success) {
                    chatCount = chatsData.data.chats?.length || 0;
                }
            }

            setStats({
                chatCount,
                aiInteractions: 0, // TODO: Add AI interactions tracking in backend
                isConnected
            });
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setLoading(false);
        }
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
                        <span className="stat-change">
                            {stats.isConnected ? '✅ Connected' : '⚠️ Not Connected'}
                        </span>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon email">📧</div>
                    <div className="stat-info">
                        <h3>Email Conversations</h3>
                        <p className="stat-value">Coming Soon</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon voice">🎤</div>
                    <div className="stat-info">
                        <h3>Voice Calls</h3>
                        <p className="stat-value">Coming Soon</p>
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-icon ai">🤖</div>
                    <div className="stat-info">
                        <h3>AI Interactions</h3>
                        <p className="stat-value">{stats.aiInteractions}</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                    <div className="activity-item">
                        <div className="activity-icon">📱</div>
                        <div className="activity-content">
                            <p>
                                {stats.isConnected
                                    ? `WhatsApp connected - ${stats.chatCount} active chats`
                                    : 'WhatsApp not connected - Connect from WhatsApp view'}
                            </p>
                            <span className="activity-time">Just now</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
