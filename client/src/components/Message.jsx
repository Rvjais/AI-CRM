import './Message.css';
import api from '../utils/apiClient';

function Message({ message, onForward, onReply }) {
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

        // Sticker
        if (type === 'sticker' || content.mimeType?.includes('webp')) {
            const url = content.sticker?.url || content.url;
            if (url) return <img src={url} alt="Sticker" className="message-sticker" />;
            return (
                <div className="media-placeholder sticker-error">
                    <span className="icon">🧩</span>
                    <span className="text">Sticker unavailable</span>
                </div>
            );
        }

        // Image
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

        // Attempt to parse raw JSON text (fix for broken UI on interactive messages)
        let displayText = content.text || content.caption || message.text || '';

        if (typeof displayText === 'string' && displayText.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(displayText);
                // Extract readable text from common Baileys interactive objects
                displayText = parsed.contentText ||
                    parsed.hydratedTemplate?.hydratedContentText ||
                    parsed.hydratedTemplate?.hydratedTitleText ||
                    parsed.title ||
                    displayText; // Fallback to raw if logic fails
            } catch (e) {
                // Not JSON, ignore
            }
        }

        return <p className="message-text">{displayText}</p>;
    };

    const handleReaction = async (emoji) => {
        try {
            await api.post(`/api/messages/${message._id}/react`, { emoji });
            // Optimistic update could go here, or rely on socket update
            // For now, we rely on the socket update which updates the message list
        } catch (error) {
            console.error('Failed to react:', error);
        }
    };

    const isProtocolMessage = () => {
        const text = message.content?.text || message.content?.caption || message.text || '';
        if (typeof text !== 'string') return false;

        // Filter out technical protocol metadata strings
        const technicalPatterns = [
            'deviceListMetadata',
            'recipientKeyHash',
            'agentId',
            '{"key":'
        ];

        return technicalPatterns.some(pattern => text.includes(pattern));
    };

    if (isProtocolMessage()) {
        return null; // Skip rendering technical protocol junk
    }

    return (
        <div className={`message ${message.fromMe ? 'sent' : 'received'}`}>
            {!message.fromMe && (
                <div className="message-avatar">
                    <div className="avatar-small">
                        {(message.senderName || 'U')[0].toUpperCase()}
                    </div>
                </div>
            )}

            <div className="message-content-wrapper">
                <div className={`message-bubble group ${message.fromMe ? 'sent-bubble' : 'received-bubble'}`}>
                    {/* Quoted Message Preview */}
                    {message.quotedMessage && (
                        <div className="quoted-message-preview">
                            <span className="quoted-sender">
                                {message.quotedMessage.fromMe ? 'You' : (message.quotedMessage.senderName || message.quotedMessage.senderPn || 'Sender')}
                            </span>
                            <span className="quoted-text">
                                {message.quotedMessage.content?.text ||
                                    message.quotedMessage.content?.caption ||
                                    (message.quotedMessage.type === 'image' ? '📷 Photo' : 'Msg')}
                            </span>
                        </div>
                    )}

                    {renderContent()}
                    <span className="message-time">{formatTime(message.timestamp)}</span>

                    {/* Reaction Picker (Hidden by default, shown on hover via CSS group-hover) */}
                    <div className="reaction-actions">
                        <button onClick={() => handleReaction('👍')}>👍</button>
                        <button onClick={() => handleReaction('❤️')}>❤️</button>
                        <button onClick={() => handleReaction('😂')}>😂</button>
                        <button onClick={() => handleReaction('😮')}>😮</button>
                        <button onClick={() => handleReaction('😢')}>😢</button>
                        <button onClick={() => handleReaction('🙏')}>🙏</button>
                        <div style={{ width: '1px', height: '16px', background: 'rgba(0,0,0,0.1)', margin: '0 4px' }}></div>
                        <button onClick={() => onReply && onReply(message)} title="Reply">↩️</button>
                        <button onClick={() => onForward && onForward(message)} title="Forward">↪️</button>
                    </div>
                </div>

                {/* Display Reactions */}
                {message.reactions && message.reactions.length > 0 && (
                    <div className="message-reactions">
                        {message.reactions.map((r, i) => (
                            <span key={i} className="reaction-bubble">{r.emoji}</span>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}


export default Message;
