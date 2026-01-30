import './ChatItem.css';

function ChatItem({ chat, isSelected, onClick }) {
    const getAvatar = () => {
        if (chat.profilePicture) {
            return <img src={chat.profilePicture} alt={chat.name} />;
        }

        const initial = (chat.name || chat.phone || '?')[0].toUpperCase();
        return <div className="avatar-placeholder">{initial}</div>;
    };

    const getLastMessageTime = () => {
        if (!chat.lastMessageTime) return '';

        const date = new Date(chat.lastMessageTime);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div
            className={`chat-item ${isSelected ? 'selected' : ''}`}
            onClick={onClick}
        >
            <div className="chat-avatar">
                {getAvatar()}
                {chat.isOnline && <div className="online-indicator" />}
            </div>

            <div className="chat-info">
                <div className="chat-header-row">
                    <div className="name-with-sentiment">
                        <h4 className="chat-name">{chat.name || chat.phone}</h4>
                        {chat.sentiment && (
                            <span
                                className={`sentiment-dot ${chat.sentiment}`}
                                title={`Sentiment: ${chat.sentiment}`}
                            />
                        )}
                        {chat.aiEnabled && <span title="AI Enabled">🤖</span>}
                    </div>
                    <span className="chat-time">{getLastMessageTime()}</span>
                </div>
                <div className="chat-message-row">
                    <p className="last-message">
                        {chat.lastMessage || 'No messages yet'}
                    </p>
                    {chat.unreadCount > 0 && (
                        <span className="unread-badge">{chat.unreadCount}</span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ChatItem;
