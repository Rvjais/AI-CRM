import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSmile, FaArchive } from 'react-icons/fa';
import Message from './Message';
import api from '../utils/apiClient';
import './ChatWindow.css';

function ChatWindow({ selectedChat, messages, setMessages, token, onUpdateChat, onForward }) {
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [isViewOnce, setIsViewOnce] = useState(false);
    const [isGif, setIsGif] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const toggleChatAI = async () => {
        if (!selectedChat) return;

        const newStatus = !selectedChat.aiEnabled;

        // Optimistically update UI
        const updatedChat = {
            ...selectedChat,
            aiEnabled: newStatus
        };

        if (onUpdateChat) {
            onUpdateChat(updatedChat);
        }

        try {
            // Use JID if available, fallback to phone logic
            const jidToUse = selectedChat.jid || (selectedChat.phone.includes('@') ? selectedChat.phone : `${selectedChat.phone}@s.whatsapp.net`);

            // Use the toggle-ai endpoint
            await api.post(`/api/messages/${encodeURIComponent(jidToUse)}/toggle-ai`, { enabled: newStatus });
        } catch (error) {
            console.error('Error toggling AI:', error);
            // Revert on error
            if (onUpdateChat) {
                onUpdateChat({ ...selectedChat, aiEnabled: !newStatus });
            }
        }
    };

    const toggleArchive = async () => {
        if (!selectedChat) return;

        const newStatus = !selectedChat.isArchived;
        const updatedChat = { ...selectedChat, isArchived: newStatus };

        if (onUpdateChat) onUpdateChat(updatedChat);

        try {
            const jidToUse = selectedChat.jid || (selectedChat.phone.includes('@') ? selectedChat.phone : `${selectedChat.phone}@s.whatsapp.net`);
            await api.post(`/api/messages/${encodeURIComponent(jidToUse)}/archive`, { archived: newStatus });
        } catch (error) {
            console.error('Error toggling archive:', error);
            if (onUpdateChat) onUpdateChat({ ...selectedChat, isArchived: !newStatus });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const prevChatIdRef = useRef(null);

    const handleReply = (msg) => {
        setReplyingTo(msg);
    };

    useEffect(() => {
        // Use a stable identifier for comparison (JID or Phone)
        const chatId = selectedChat ? (selectedChat.jid || selectedChat.phone) : null;

        if (chatId) {
            fetchMessages();
            // Only reset reply if the chat actually CHANGED
            if (prevChatIdRef.current !== chatId) {
                setReplyingTo(null);
            }
            prevChatIdRef.current = chatId;
        } else {
            setReplyingTo(null);
        }
    }, [selectedChat]);

    const fetchMessages = async () => {
        if (!selectedChat) return;

        // Use JID if available (preferred for LID support), otherwise construct it
        const chatIdentifier = selectedChat.jid || selectedChat.phone;
        if (!chatIdentifier) return;

        try {
            // Encode the identifier to handle @ characters safely in URL
            const encodedId = encodeURIComponent(chatIdentifier);
            const data = await api.get(`/api/messages/${encodedId}`);
            if (data.success) {
                setMessages(data.data.messages || [], chatIdentifier);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));

        // Reset options
        setIsViewOnce(false);
        setIsGif(false);

        // Upload immediately to get URL (or simplified: upload on send)
        // For smoother UX, let's just hold the file and upload on send
        // to avoid complexity with cancelling uploads here. 
    };

    const cancelMedia = () => {
        setMediaFile(null);
        setMediaPreview(null);
        setIsViewOnce(false);
        setIsGif(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();

        if ((!newMessage.trim() && !mediaFile) || !selectedChat || loading || uploading) return;

        setLoading(true);
        try {
            // Use new format with full JID for correct routing (LID support)
            const chatJid = selectedChat.jid || selectedChat.phone;
            let type = 'text';
            let content = { text: newMessage };

            if (mediaFile) {
                setUploading(true);
                // Upload file
                const formData = new FormData();
                formData.append('file', mediaFile);

                const uploadRes = await api.post('/api/media/upload', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' } // axios/fetch handles this usually but good to be explicit or let generic handler do it
                });

                if (!uploadRes.success) throw new Error('Upload failed');

                const { url, type: mediaType, mimetype } = uploadRes.data;

                type = mediaType;
                if (isGif && mediaType === 'video') type = 'gif';

                content = {
                    mediaUrl: url,
                    caption: newMessage, // Text becomes caption for media
                    mimetype: mimetype,
                    isViewOnce: isViewOnce
                };
            }

            const payload = {
                chatJid,
                type,
                content,
                quoted: replyingTo // Pass the quoted message object (or ID)
            };

            const data = await api.post('/api/messages/send', payload);

            if (data.success) {
                // Optimistic update (simplified)
                const sentMsg = data.data || {
                    _id: Date.now(),
                    content: content,
                    type: type,
                    fromMe: true,
                    timestamp: new Date().toISOString()
                };

                setMessages([...messages, sentMsg], chatJid);
                setNewMessage('');
                cancelMedia();
                setReplyingTo(null); // Clear reply after sending
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    if (!selectedChat) {
        return (
            <div className="chat-window">
                <div className="empty-chat">
                    <div className="empty-chat-icon">💬</div>
                    <h3>Select a chat to start messaging</h3>
                    <p>Choose a conversation from the list</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-window">
            <div className="chat-window-header">
                <div className="header-avatar">
                    {selectedChat.profilePicture ? (
                        <img src={selectedChat.profilePicture} alt={selectedChat.name} />
                    ) : (
                        <div className="avatar-placeholder">
                            {(selectedChat.name || selectedChat.phone || '?')[0].toUpperCase()}
                        </div>
                    )}
                </div>
                <div className="header-info">
                    <div className="header-name-row" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3>{selectedChat.name || 'Unknown'}</h3>
                        {selectedChat.aiEnabled && (
                            <span className="ai-status-badge">
                                🤖 AI Active
                            </span>
                        )}
                    </div>
                    <p>{(() => {
                        const jid = selectedChat.jid || '';

                        // Handle Special Types based on JID
                        if (jid.includes('@broadcast')) return 'Broadcast List';
                        if (jid === 'status@broadcast') return 'Status';
                        if (jid.includes('@g.us')) return 'Group Chat';

                        // For standard users (LID or normal), prefer the phone property
                        // which contains the resolved real number from the backend
                        const displayPhone = selectedChat.phone || jid.replace('@s.whatsapp.net', '').replace('@c.us', '').replace('@lid', '');

                        // Basic formatting
                        return displayPhone.startsWith('+') ? displayPhone : `+${displayPhone}`;
                    })()}</p>
                </div>

                <div className="header-actions">
                    <button
                        className={`action-btn ${selectedChat.isArchived ? 'active' : ''}`}
                        onClick={toggleArchive}
                        title={selectedChat.isArchived ? "Unarchive Chat" : "Archive Chat"}
                    >
                        <FaArchive />
                    </button>
                    <button
                        className={`ai-enable-btn ${selectedChat.aiEnabled ? 'active' : ''}`}
                        onClick={toggleChatAI}
                    >
                        {selectedChat.aiEnabled ? 'Disable AI' : 'Enable AI'}
                    </button>
                </div>
            </div>

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="no-messages">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <Message
                            key={message._id || index}
                            message={message}
                            onForward={onForward}
                            onReply={handleReply}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview */}
            {replyingTo && (
                <div className="reply-preview">
                    <div className="reply-content">
                        <span className="reply-bar"></span>
                        <div style={{ flex: 1 }}>
                            <div className="reply-sender">
                                {replyingTo.fromMe ? 'You' : (replyingTo.senderName || selectedChat.name || 'Sender')}
                            </div>
                            <div className="reply-text">
                                {replyingTo.content?.text || replyingTo.content?.caption || (replyingTo.type === 'image' ? '📷 Photo' : 'Msg')}
                            </div>
                        </div>
                        <button className="close-reply" onClick={() => setReplyingTo(null)}>×</button>
                    </div>
                </div>
            )}

            {mediaFile && (
                <div className="media-preview-container">
                    <div className="media-preview-content">
                        {mediaFile.type.startsWith('image/') ? (
                            <img src={mediaPreview} alt="Preview" />
                        ) : (
                            <video src={mediaPreview} controls />
                        )}
                        <button className="close-preview" onClick={cancelMedia}>×</button>
                    </div>
                    <div className="media-options">
                        <label className={`option-pill ${isViewOnce ? 'active' : ''}`}>
                            <input
                                type="checkbox"
                                checked={isViewOnce}
                                onChange={(e) => setIsViewOnce(e.target.checked)}
                            />
                            ⏱️ View Once
                        </label>
                        {mediaFile.type.startsWith('video/') && (
                            <label className={`option-pill ${isGif ? 'active' : ''}`}>
                                <input
                                    type="checkbox"
                                    checked={isGif}
                                    onChange={(e) => setIsGif(e.target.checked)}
                                />
                                🎞️ Send as GIF
                            </label>
                        )}
                    </div>
                </div>
            )}

            <form className="message-input-container" onSubmit={handleSendMessage}>
                <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                    accept="image/*,video/*,audio/*,application/pdf"
                />
                <button
                    type="button"
                    className="attach-button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                >
                    📎
                </button>
                <button type="button" className="emoji-button">
                    <FaSmile />
                </button>
                <input
                    type="text"
                    placeholder={mediaFile ? "Add a caption..." : "Type a message..."}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={loading || uploading}
                    className="message-input"
                />
                <button
                    type="submit"
                    className="send-button"
                    disabled={loading || uploading || (!newMessage.trim() && !mediaFile)}
                >
                    <FaPaperPlane />
                </button>
            </form>
        </div>
    );
}

export default ChatWindow;
