import {
    FaInbox,
    FaPaperPlane,
    FaFileAlt,
    FaTrash,
    FaStar,
    FaTag,
    FaPlus,
    FaExclamationCircle,
    FaTimes,
    FaSignOutAlt
} from 'react-icons/fa';

function EmailSidebar({ labels, activeLabel, onLabelSelect, onComposeClick, isOpen, onClose, onDisconnect }) {
    // Standard Gmail system labels
    const systemLabels = [
        { id: 'INBOX', name: 'Inbox', icon: <FaInbox /> },
        { id: 'STARRED', name: 'Starred', icon: <FaStar /> },
        { id: 'SENT', name: 'Sent', icon: <FaPaperPlane /> },
        { id: 'DRAFT', name: 'Drafts', icon: <FaFileAlt /> },
        { id: 'SPAM', name: 'Spam', icon: <FaExclamationCircle /> },
        { id: 'TRASH', name: 'Trash', icon: <FaTrash /> },
    ];

    // Filter user-created labels
    const userLabels = labels.filter(label => label.type === 'user');

    return (
        <div className={`email-sidebar ${isOpen ? 'open' : ''}`}>
            <div className="email-sidebar-header">
                <h2>EMAIL BOXES</h2>
                <div className="header-actions">
                    <button className="icon-btn close-sidebar-btn" onClick={onClose} title="Close">
                        <FaTimes />
                    </button>
                </div>
            </div>

            <div className="compose-section">
                <button className="primary-compose-btn" onClick={onComposeClick}>
                    <FaPlus /> Compose
                </button>
            </div>

            <nav className="sidebar-nav">
                <div className="nav-group">
                    {systemLabels.map(label => (
                        <button
                            key={label.id}
                            className={`nav-item ${activeLabel === label.id ? 'active' : ''}`}
                            onClick={() => onLabelSelect(label.id)}
                        >
                            <span className="nav-icon">{label.icon}</span>
                            <span className="nav-name">{label.name}</span>
                        </button>
                    ))}
                </div>

                {userLabels.length > 0 && (
                    <div className="nav-group user-labels">
                        <h4 className="group-title">Labels</h4>
                        {userLabels.map(label => (
                            <button
                                key={label.id}
                                className={`nav-item ${activeLabel === label.id ? 'active' : ''}`}
                                onClick={() => onLabelSelect(label.id)}
                            >
                                <span className="nav-icon"><FaTag /></span>
                                <span className="nav-name">{label.name}</span>
                            </button>
                        ))}
                    </div>
                )}

                <div className="nav-group logout-group" style={{ marginTop: 'auto', paddingTop: '16px' }}>
                    <button className="disconnect-btn-sidebar" onClick={onDisconnect} style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', gap: '12px' }}>
                        <FaSignOutAlt /> Disconnect Gmail
                    </button>
                </div>
            </nav>
        </div>
    );
}

export default EmailSidebar;
