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
                        <img src="/aicrmz-transparent.webp" alt="AI CRM Logo" style={{ width: 'auto', height: '60px', borderRadius: '4px', objectFit: 'contain' }} />
                    </div>
                    {!isCollapsed && (
                        <div className="logo-text">
                            <h1>AI Powered</h1>
                            <p>CRM</p>
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
                            <span className="nav-label">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            <div className="sidebar-footer">
                {credits !== null && (
                    <div className="credits-display" title="AI Credits Remaining">
                        <FaCoins className="credits-icon" />
                        <span className="credits-text">{credits} Credits</span>
                    </div>
                )}

                <button className={`nav-item settings ${activeView === 'settings' ? 'active' : ''}`} onClick={() => onViewChange('settings')}>
                    <FaCog className="nav-icon" />
                    <span className="nav-label">Settings</span>
                </button>
                <button className="nav-item logout" onClick={onLogout}>
                    <FaSignOutAlt className="nav-icon" />
                    <span className="nav-label">Logout</span>
                </button>
            </div>
        </div >
    );
}


export default Sidebar;

