import { useState } from 'react';
import { FaDownload, FaTimes } from 'react-icons/fa';
import './Message.css';
import api from '../utils/apiClient';

function Message({ message, onForward, onReply, isGroup, onReact, activeReactionMsgId, setActiveReactionMsgId, onPin, onStar, onDelete, onEdit }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMediaUrl, setModalMediaUrl] = useState('');
    const msgId = message._id || message.messageId;
    const showReactions = activeReactionMsgId === msgId;
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const [swipeOffset, setSwipeOffset] = useState(0);
    const [touchStartX, setTouchStartX] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);

    const handleTouchStart = (e) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchMove = (e) => {
        const diff = e.touches[0].clientX - touchStartX;
        if (diff > 0 && diff < 80) { // Swipe right
            setSwipeOffset(diff);
            setIsSwiping(true);
        }
    };

    const handleTouchEnd = () => {
        if (swipeOffset > 50) {
            onReply && onReply(message);
        }
        setSwipeOffset(0);
        setIsSwiping(false);
    };

    const renderStatus = () => {
        if (!message.fromMe) return null;
        if (message.status === 'read') return <span className="message-status read">✓✓</span>;
        if (message.status === 'delivered') return <span className="message-status delivered">✓✓</span>;
        if (message.status === 'sent') return <span className="message-status sent">✓</span>;
        return <span className="message-status pending">⌛</span>;
    };

    const ensureHttps = (url) => {
        if (!url) return null;
        if (url.startsWith('http://')) {
            return url.replace('http://', 'https://');
        }
        return url;
    };

    const renderContent = () => {
        if (!message.content) {
            return <p className="message-text">{message.message || message.text || 'Unsupported message type'}</p>;
        }

        const { type, content } = message;

        // Sticker
        if (type === 'sticker' || content.mimeType?.includes('webp')) {
            const url = ensureHttps(content.sticker?.url || content.url);
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
            let url = content.image?.url || content.url || (content.text && content.text.startsWith('http') ? content.text : null);
            url = ensureHttps(url);

            if (url) {
                return (
                    <img
                        src={url}
                        alt={content.caption || 'Image'}
                        className="message-media message-media-clickable"
                        onClick={(e) => {
                            e.stopPropagation();
                            setModalMediaUrl(url);
                            setIsModalOpen(true);
                        }}
                    />
                );
            }
            return (
                <div className="media-placeholder error">
                    <span className="icon">🖼️</span>
                    <span className="text">Image unavailable</span>
                </div>
            );
        }

        if (type === 'video' || content.mimeType?.startsWith('video/')) {
            const url = ensureHttps(content.video?.url || content.url);
            if (url) return <video src={url} controls className="message-media" />;
            return (
                <div className="media-placeholder error">
                    <span className="icon">🎬</span>
                    <span className="text">Video unavailable</span>
                </div>
            );
        }

        if (type === 'audio' || content.mimeType?.startsWith('audio/')) {
            const url = ensureHttps(content.audio?.url || content.url);
            if (url) return <audio src={url} controls className="message-audio" />;
            return (
                <div className="media-placeholder error">
                    <span className="icon">🎵</span>
                    <span className="text">Audio unavailable</span>
                </div>
            );
        }

        if (type === 'document' || content.mimeType?.startsWith('application/')) {
            const url = ensureHttps(content.document?.url || content.url);
            const fileName = content.fileName || 'Document';
            if (url) return (
                <div className="message-document">
                    <span className="doc-icon">📄</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="doc-link" onClick={(e) => e.stopPropagation()}>
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
        setActiveReactionMsgId(null);

        // Check if user already reacted with the same emoji (toggle off)
        const existingReaction = message.reactions?.find(
            r => r.emoji === emoji && r.fromMe
        );
        const isRemoving = !!existingReaction;

        // Optimistic update
        if (onReact) {
            if (isRemoving) {
                onReact(message._id || message.messageId, emoji, 'remove');
            } else {
                onReact(message._id || message.messageId, emoji, 'add');
            }
        }

        try {
            await api.post(`/api/messages/${message._id}/react`, {
                emoji: isRemoving ? '' : emoji
            });
        } catch (error) {
            console.error('Failed to react:', error);
            // Revert optimistic update on failure
            if (onReact) {
                if (isRemoving) {
                    onReact(message._id || message.messageId, emoji, 'add');
                } else {
                    onReact(message._id || message.messageId, emoji, 'remove');
                }
            }
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
        <div 
            className={`message ${message.fromMe ? 'sent' : 'received'} ${isSwiping ? 'swiping' : ''}`}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {!message.fromMe && (
                <div className="message-avatar">
                    <div className="avatar-small">
                        {(message.senderName || 'U')[0].toUpperCase()}
                    </div>
                </div>
            )}

            <div className="message-content-wrapper" style={{ transform: `translateX(${swipeOffset}px)` }}>
                {swipeOffset > 20 && (
                    <div className="swipe-reply-indicator" style={{ opacity: swipeOffset / 50 }}>
                        ↩️
                    </div>
                )}
                <div
                    className={`message-bubble group ${message.fromMe ? 'sent-bubble' : 'received-bubble'}`}
                    onClick={() => setActiveReactionMsgId(showReactions ? null : msgId)}
                >
                    {/* Show Sender Name in Group Chats */}
                    {isGroup && !message.fromMe && message.senderName && (
                        <div className="message-sender-name">
                            {message.senderName}
                        </div>
                    )}

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
                    {/* Indicators */}
                    <div className="message-indicators">
                        {message.isPinned && <span className="pin-indicator">📌</span>}
                        {message.isStarred && <span className="star-indicator">⭐</span>}
                        <span className="message-time">{formatTime(message.timestamp)}</span>
                        {renderStatus()}
                    </div>

                    {/* Reaction & Action Picker */}
                    {showReactions && (
                        <div className="reaction-actions show" onClick={(e) => e.stopPropagation()}>
                            <div className="reaction-row">
                                <button onClick={() => handleReaction('👍')}>👍</button>
                                <button onClick={() => handleReaction('❤️')}>❤️</button>
                                <button onClick={() => handleReaction('😂')}>😂</button>
                                <button onClick={() => handleReaction('😮')}>😮</button>
                                <button onClick={() => handleReaction('😢')}>😢</button>
                                <button onClick={() => handleReaction('🙏')}>🙏</button>
                            </div>
                            <div className="reaction-divider"></div>
                            <div className="action-row">
                                <button onClick={() => { setActiveReactionMsgId(null); onReply && onReply(message); }} title="Reply">↩️</button>
                                <button onClick={() => { setActiveReactionMsgId(null); onForward && onForward(message); }} title="Forward">↪️</button>
                                <button onClick={() => { setActiveReactionMsgId(null); onPin && onPin(message); }} title={message.isPinned ? "Unpin" : "Pin"}>{message.isPinned ? '📌❌' : '📌'}</button>
                                <button onClick={() => { setActiveReactionMsgId(null); onStar && onStar(message); }} title={message.isStarred ? "Unstar" : "Star"}>{message.isStarred ? '⭐❌' : '⭐'}</button>
                                {message.fromMe && message.type === 'text' && (
                                    <button onClick={() => { setActiveReactionMsgId(null); onEdit && onEdit(message); }} title="Edit">✏️</button>
                                )}
                                {message.fromMe && (
                                    <button onClick={() => { setActiveReactionMsgId(null); onDelete && onDelete(message); }} title="Delete for everyone">🗑️</button>
                                )}
                            </div>
                        </div>
                    )}
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

            {/* Fullscreen Media Modal */}
            {isModalOpen && modalMediaUrl && (
                <div className="fullscreen-media-modal" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-header" onClick={(e) => e.stopPropagation()}>
                        <button className="modal-btn" onClick={() => setIsModalOpen(false)} title="Close">
                            <FaTimes />
                        </button>
                        <a
                            href={modalMediaUrl}
                            download={`image-${message._id || Date.now()}.jpg`}
                            className="modal-btn"
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            title="Download"
                        >
                            <FaDownload />
                        </a>
                    </div>
                    <div className="modal-content">
                        <img
                            src={modalMediaUrl}
                            alt="Fullscreen display"
                            className="modal-image"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

export default Message;
