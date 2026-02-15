import { useState, useEffect } from 'react';
import { FaWhatsapp, FaEnvelope, FaMicrophone, FaBrain, FaTachometerAlt, FaCog, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaTable, FaDatabase, FaCoins, FaPaperPlane, FaUsers, FaWpforms } from 'react-icons/fa';
import api from '../utils/apiClient';
import './Sidebar.css';

function Sidebar({ activeView, onViewChange, onLogout, isCollapsed, setIsCollapsed }) {
    const [credits, setCredits] = useState(null);

    useEffect(() => {
        // Fetch credits on mount and periodically
        fetchCredits();
        const interval = setInterval(fetchCredits, 30000); // 30s poll
        return () => clearInterval(interval);
    }, []);

    const fetchCredits = async () => {
        try {
            const res = await api.get('/api/auth/me');
            if (res.success && res.data) {
                setCredits(res.data.credits || 0);
            }
        } catch (e) {
            console.error("Failed to fetch credits", e);
        }
    };

    const navItems = [
        { id: 'dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
        { id: 'whatsapp', icon: FaWhatsapp, label: 'WhatsApp' },
        { id: 'email', icon: FaEnvelope, label: 'Email' },
        { id: 'campaigns', icon: FaPaperPlane, label: 'Campaigns' },
        { id: 'audience', icon: FaUsers, label: 'Audience' },
        { id: 'forms', icon: FaWpforms, label: 'Forms' },
        { id: 'sheets', icon: FaTable, label: 'Sheets' },
        { id: 'infrastructure', icon: FaDatabase, label: 'Infrastructure' },
        { id: 'voiceagent', icon: FaMicrophone, label: 'Voice Agent' },
        { id: 'aiconfig', icon: FaBrain, label: 'AI Config' },
    ];

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
                    {/* Keep existing logo SVG */}
                    <div className="logo-icon">
                        <svg width="48" height="48" viewBox="0 0 60 60" fill="none">
                            <rect width="60" height="60" rx="14" fill="url(#gradient)" />
                            <path d="M30 15L45 22.5V37.5L30 45L15 37.5V22.5L30 15Z" stroke="white" strokeWidth="2.5" strokeLinejoin="round" />
                            <circle cx="30" cy="30" r="6" fill="white" />
                            <defs>
                                <linearGradient id="gradient" x1="0" y1="0" x2="60" y2="60">
                                    <stop stopColor="#667eea" />
                                    <stop offset="1" stopColor="#764ba2" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    {!isCollapsed && (
                        <div className="logo-text">
                            <h1>RainCRM</h1>
                            <p>AI-Powered</p>
                        </div>
                    )}
                </div>
                <button
                    className="sidebar-toggle"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
                >
                    {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
                </button>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                            onClick={() => onViewChange(item.id)}
                        >
                            <Icon className="nav-icon" />
                            {!isCollapsed && <span className="nav-label">{item.label}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                {!isCollapsed && credits !== null && (
                    <div className="credits-display" title="AI Credits Remaining">
                        <FaCoins className="credits-icon" />
                        <span>{credits} Credits</span>
                    </div>
                )}

                <button className="nav-item settings">
                    <FaCog className="nav-icon" />
                    {!isCollapsed && <span className="nav-label">Settings</span>}
                </button>
                <button className="nav-item logout" onClick={onLogout}>
                    <FaSignOutAlt className="nav-icon" />
                    {!isCollapsed && <span className="nav-label">Logout</span>}
                </button>
            </div>
        </div>
    );
}


export default Sidebar;

