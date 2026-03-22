import { useState, useEffect } from 'react';
import {
    FaWhatsapp, FaEnvelope, FaMicrophone, FaBrain,
    FaTachometerAlt, FaCog, FaSignOutAlt, FaChevronLeft,
    FaChevronRight, FaTable, FaDatabase, FaCoins,
    FaPaperPlane, FaUsers, FaWpforms, FaBars, FaTimes
} from 'react-icons/fa';
import api from '../utils/apiClient';
import './Sidebar.css';

function Sidebar({ activeView, onViewChange, onLogout, isCollapsed, setIsCollapsed }) {
    const [credits, setCredits] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);

    const closeDrawer = () => setDrawerOpen(false);

    useEffect(() => {
        fetchCredits();
        const interval = setInterval(fetchCredits, 30000);
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

    const handleNavClick = (viewId) => {
        onViewChange(viewId);
        setDrawerOpen(false);
    };

    return (
        <>
            {/* ── Mobile top bar with hamburger ── */}
            <div className="mobile-topbar">
                <button
                    className="hamburger-btn"
                    onClick={() => setDrawerOpen(true)}
                    aria-label="Open menu"
                >
                    <FaBars />
                </button>
                <div className="mobile-topbar-title">
                    <img
                        src="/aicrmz-transparent.webp"
                        alt="AI CRM"
                        style={{ height: '32px', width: 'auto', objectFit: 'contain' }}
                    />
                </div>
                {/* Credits badge in top bar */}
                {credits !== null && (
                    <div className="mobile-credits-badge">
                        <FaCoins style={{ fontSize: '13px' }} />
                        <span>{credits}</span>
                    </div>
                )}
            </div>

            {/* ── Backdrop (mobile only) ── */}
            {drawerOpen && (
                <div className="sidebar-backdrop" onClick={closeDrawer} />
            )}

            {/* ── Sidebar / Drawer ── */}
            <div className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${drawerOpen ? 'drawer-open' : ''}`}>

                {/* Close button inside drawer (mobile) */}
                <button className="drawer-close-btn" onClick={closeDrawer} aria-label="Close menu">
                    <FaTimes />
                </button>

                <div className="sidebar-header">
                    <div className="logo">
                        <div className="logo-icon">
                            <img
                                src="/aicrmz-transparent.webp"
                                alt="AI CRM Logo"
                                style={{ width: 'auto', height: '60px', borderRadius: '4px', objectFit: 'contain' }}
                            />
                        </div>
                        {!isCollapsed && (
                            <div className="logo-text">
                                <h1>AI Powered</h1>
                                <p>CRM</p>
                            </div>
                        )}
                    </div>
                    {/* Desktop collapse toggle */}
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
                                onClick={() => handleNavClick(item.id)}
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
                    <button
                        className={`nav-item settings ${activeView === 'settings' ? 'active' : ''}`}
                        onClick={() => handleNavClick('settings')}
                    >
                        <FaCog className="nav-icon" />
                        <span className="nav-label">Settings</span>
                    </button>
                    <button className="nav-item logout" onClick={() => { onLogout(); closeDrawer(); }}>
                        <FaSignOutAlt className="nav-icon" />
                        <span className="nav-label">Logout</span>
                    </button>
                </div>
            </div>
        </>
    );
}

export default Sidebar;

