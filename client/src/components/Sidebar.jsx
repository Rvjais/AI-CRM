import { FaWhatsapp, FaEnvelope, FaMicrophone, FaBrain, FaTachometerAlt, FaCog, FaSignOutAlt, FaChevronLeft, FaChevronRight, FaTable } from 'react-icons/fa';
import './Sidebar.css';

function Sidebar({ activeView, onViewChange, onLogout, isCollapsed, setIsCollapsed }) {
    const navItems = [
        { id: 'dashboard', icon: FaTachometerAlt, label: 'Dashboard' },
        { id: 'whatsapp', icon: FaWhatsapp, label: 'WhatsApp' },
        { id: 'email', icon: FaEnvelope, label: 'Email' },
        { id: 'sheets', icon: FaTable, label: 'Sheets' },
        { id: 'voiceagent', icon: FaMicrophone, label: 'Voice Agent' },
        { id: 'aiconfig', icon: FaBrain, label: 'AI Config' },
    ];

    return (
        <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="logo">
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
