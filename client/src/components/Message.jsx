import './Message.css';

function Message({ message }) {
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className={`message ${message.fromMe ? 'sent' : 'received'}`}>
            {!message.fromMe && (
                <div className="message-avatar">
                    <div className="avatar-small">
                        {(message.senderName || 'U')[0].toUpperCase()}
                    </div>
                </div>
            )}

            <div className="message-bubble">
                <p className="message-text">
                    {message.content?.text || message.message || message.text || 'Unsupported message type'}
                </p>
                <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
        </div>
    );
}

export default Message;
