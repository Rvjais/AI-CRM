import './Dashboard.css';

function Dashboard() {
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
                        <p className="stat-value">0</p>
                        <span className="stat-change">+0% from last week</span>
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
                        <p className="stat-value">0</p>
                    </div>
                </div>
            </div>

            <div className="recent-activity">
                <h2>Recent Activity</h2>
                <div className="activity-list">
                    <div className="activity-item">
                        <div className="activity-icon">📱</div>
                        <div className="activity-content">
                            <p>WhatsApp connection ready</p>
                            <span className="activity-time">Just now</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
