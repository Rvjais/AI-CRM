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

    const renderContent = () => {
        if (!message.content) {
            return <p className="message-text">{message.message || message.text || 'Unsupported message type'}</p>;
        }

        const { type, content } = message;

        // Check content type or message type
        if (type === 'image' || content.mimeType?.startsWith('image/')) {
            const url = content.image?.url || content.url || (content.text && content.text.startsWith('http') ? content.text : null);
            if (url) return <img src={url} alt={content.caption || 'Image'} className="message-media" />;
            return (
                <div className="media-placeholder error">
                    <span className="icon">🖼️</span>
                    <span className="text">Image unavailable</span>
                </div>
            );
        }

        if (type === 'video' || content.mimeType?.startsWith('video/')) {
            const url = content.video?.url || content.url;
            if (url) return <video src={url} controls className="message-media" />;
            return (
                <div className="media-placeholder error">
                    <span className="icon">🎬</span>
                    <span className="text">Video unavailable</span>
                </div>
            );
        }

        if (type === 'audio' || content.mimeType?.startsWith('audio/')) {
            const url = content.audio?.url || content.url;
            if (url) return <audio src={url} controls className="message-audio" />;
            return (
                <div className="media-placeholder error">
                    <span className="icon">🎵</span>
                    <span className="text">Audio unavailable</span>
                </div>
            );
        }

        if (type === 'document' || content.mimeType?.startsWith('application/')) {
            const url = content.document?.url || content.url;
            const fileName = content.fileName || 'Document';
            if (url) return (
                <div className="message-document">
                    <span className="doc-icon">📄</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="doc-link">
                        {fileName}
                    </a>
                </div>
            );
            return (
                <div className="message-document error">
                    <span className="doc-icon">📄</span>
                    <span className="doc-link">Document unavailable</span>
                </div>
            );
        }

        return <p className="message-text">{content.text || content.caption || message.text || ''}</p>;
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
                {renderContent()}
                <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
        </div>
    );
}

export default Message;
