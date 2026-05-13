import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaArchive, FaTable, FaSpinner, FaArrowLeft, FaBrain, FaBellSlash, FaThumbtack } from 'react-icons/fa';
import Message from './Message';
import api from '../utils/apiClient';
import ContactInfoModal from './modals/ContactInfoModal';
import './ChatWindow.css';
import Loader from './Loader';

function ChatWindow({ selectedChat, messages, setMessages, token, onUpdateChat, onForward, onBack, onToggleMobileAI, isMobileAIViewOpen, globalAiEnabled }) {
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false); // New state for sync loading
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [isViewOnce, setIsViewOnce] = useState(false);
    const [isGif, setIsGif] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [editingMsg, setEditingMsg] = useState(null);
    const [activeReactionMsgId, setActiveReactionMsgId] = useState(null);
    const [showContactInfo, setShowContactInfo] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevChatIdRef = useRef(null);

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

    const toggleMute = async () => {
        if (!selectedChat) return;

        const newStatus = !selectedChat.isMuted;
        const updatedChat = { ...selectedChat, isMuted: newStatus };

        if (onUpdateChat) onUpdateChat(updatedChat);

        try {
            const jidToUse = selectedChat.jid || (selectedChat.phone.includes('@') ? selectedChat.phone : `${selectedChat.phone}@s.whatsapp.net`);
            await api.post(`/api/messages/${encodeURIComponent(jidToUse)}/mute`, { mute: newStatus });
        } catch (error) {
            console.error('Error toggling mute:', error);
            if (onUpdateChat) onUpdateChat({ ...selectedChat, isMuted: !newStatus });
        }
    };

    const togglePinChat = async () => {
        if (!selectedChat) return;

        const newStatus = !selectedChat.isPinned;
        const updatedChat = { ...selectedChat, isPinned: newStatus };

        if (onUpdateChat) onUpdateChat(updatedChat);

        try {
            const jidToUse = selectedChat.jid || (selectedChat.phone.includes('@') ? selectedChat.phone : `${selectedChat.phone}@s.whatsapp.net`);
            await api.post(`/api/messages/${encodeURIComponent(jidToUse)}/pin`, { pinned: newStatus });
        } catch (error) {
            console.error('Error toggling pin:', error);
            if (onUpdateChat) onUpdateChat({ ...selectedChat, isPinned: !newStatus });
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleMoveToMain = async () => {
        if (!selectedChat) return;

        // Optimistic update
        const updatedChat = { ...selectedChat, category: 'normal' };
        if (onUpdateChat) onUpdateChat(updatedChat);

        try {
            const jidToUse = selectedChat.jid || (selectedChat.phone.includes('@') ? selectedChat.phone : `${selectedChat.phone}@s.whatsapp.net`);
            await api.post(`/api/messages/${encodeURIComponent(jidToUse)}/move`, { category: 'normal' });
        } catch (error) {
            console.error('Error moving chat:', error);
            // Revert on error (optional, but good practice)
            if (onUpdateChat) onUpdateChat({ ...selectedChat });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleReply = (msg) => {
        setReplyingTo(msg);
    };

    const handleReact = (msgId, emoji, action) => {
        const chatJid = selectedChat.jid || selectedChat.phone;
        const updatedMessages = messages.map(msg => {
            if (msg._id === msgId || msg.messageId === msgId) {
                let reactions = [...(msg.reactions || [])];
                if (action === 'remove') {
                    reactions = reactions.filter(r => !(r.emoji === emoji && r.fromMe));
                } else {
                    reactions = reactions.filter(r => !r.fromMe);
                    reactions.push({ emoji, fromMe: true, timestamp: new Date().toISOString() });
                }
                return { ...msg, reactions };
            }
            return msg;
        });
        setMessages(updatedMessages, chatJid);
    };

    const handlePinMessage = async (msg) => {
        try {
            const isPinned = !msg.isPinned;
            await api.post(`/api/messages/${msg._id}/pin`, { pin: isPinned, time: 86400 });
            setMessages(messages.map(m => m._id === msg._id ? { ...m, isPinned } : m), selectedChat.jid || selectedChat.phone);
        } catch (e) { console.error('Pin error', e); }
    };

    const handleStarMessage = async (msg) => {
        try {
            const isStarred = !msg.isStarred;
            await api.post(`/api/messages/${msg._id}/star`, { star: isStarred });
            setMessages(messages.map(m => m._id === msg._id ? { ...m, isStarred } : m), selectedChat.jid || selectedChat.phone);
        } catch (e) { console.error('Star error', e); }
    };

    const handleDeleteMessage = async (msg) => {
        if (!window.confirm('Delete this message for everyone?')) return;
        try {
            await api.delete(`/api/messages/${msg._id}`);
            setMessages(messages.filter(m => m._id !== msg._id), selectedChat.jid || selectedChat.phone);
        } catch (e) { console.error('Delete error', e); }
    };

    const handleEditMessage = (msg) => {
        setEditingMsg(msg);
        setNewMessage(msg.content?.text || msg.text || '');
        setReplyingTo(null);
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

                const uploadRes = await api.post('/api/media/upload', formData);

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
                content
            };

            if (replyingTo) {
                payload.quoted = replyingTo;
            }

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

    const handleEditSubmit = async (e) => {
        e.preventDefault();
        if (!editingMsg || !newMessage.trim() || loading) return;

        setLoading(true);
        try {
            const data = await api.put(`/api/messages/${editingMsg._id}/edit`, { text: newMessage });
            if (data.success) {
                const updatedMessages = messages.map(m => m._id === editingMsg._id ? { ...m, content: { ...m.content, text: newMessage } } : m);
                setMessages(updatedMessages, selectedChat.jid || selectedChat.phone);
                setEditingMsg(null);
                setNewMessage('');
            }
        } catch (e) {
            console.error('Edit error:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSyncToSheet = async () => {
        if (!selectedChat || syncing) return;

        const confirmSync = window.confirm('Extract chat data and sync to Google Sheet?');
        if (!confirmSync) return;

        setSyncing(true);
        try {
            // Use JID if available, fallback to phone logic
            const jidToUse = selectedChat.jid || (selectedChat.phone.includes('@') ? selectedChat.phone : `${selectedChat.phone}@s.whatsapp.net`);

            const response = await api.post('/api/sheets/sync-chat', { chatJid: jidToUse });

            if (response.success) {
                alert('Success! Data synced to Google Sheet.');
            } else {
                alert('Sync failed. Please check your Sheets config.');
            }
        } catch (error) {
            console.error('Error syncing to sheet:', error);
            if (error.response?.status === 403) {
                alert('Permission denied. Please Re-Authorize Google in Sheets Config.');
            } else {
                alert('Error syncing to sheet. See console for details.');
            }
        } finally {
            setSyncing(false);
        }
    };

    // ... existing definitions ...

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
                {onBack && (
                    <button className="back-btn" onClick={onBack} title="Back to chats">
                        <FaArrowLeft />
                    </button>
                )}
                <div className="header-info" onClick={() => setShowContactInfo(true)} style={{ cursor: 'pointer' }}>
                    <div className="avatar-large">
                        {selectedChat.profilePicture ? (
                            <img src={selectedChat.profilePicture} alt="Profile" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                            (selectedChat.contactName || selectedChat.name || selectedChat.phoneNumber || selectedChat.phone || 'U')[0].toUpperCase()
                        )}
                    </div>
                    <div className="user-details">
                        <h3 className="user-name">
                            {selectedChat.contactName || selectedChat.name || selectedChat.phoneNumber || selectedChat.phone || 'Unknown Contact'}
                        </h3>
                        {/* Only show phone if it's different from the name being displayed */}
                        <p className="user-status">
                            {(selectedChat.phoneNumber || selectedChat.phone) !== (selectedChat.contactName || selectedChat.name)
                                ? (selectedChat.phoneNumber || selectedChat.phone)
                                : ''}
                        </p>
                    </div>
                </div>

                <div className="header-actions">
                    <button
                        className={`action-btn ${selectedChat.isMuted ? 'active' : ''}`}
                        onClick={toggleMute}
                        title={selectedChat.isMuted ? "Unmute Chat" : "Mute Chat"}
                    >
                        <FaBellSlash />
                    </button>
                    <button
                        className={`action-btn ${selectedChat.isPinned ? 'active' : ''}`}
                        onClick={togglePinChat}
                        title={selectedChat.isPinned ? "Unpin Chat" : "Pin Chat"}
                    >
                        <FaThumbtack />
                    </button>
                    <button
                        className={`action-btn ${selectedChat.isArchived ? 'active' : ''}`}
                        onClick={toggleArchive}
                        title={selectedChat.isArchived ? "Unarchive Chat" : "Archive Chat"}
                    >
                        <FaArchive />
                    </button>
                    {/* Move to Main Button for Campaign Chats */}
                    {selectedChat.category === 'campaign' && (
                        <button
                            className="action-btn"
                            onClick={handleMoveToMain}
                            title="Move to Main Chat"
                        >
                            <FaPaperPlane /> {/* Or other icon like FaInbox */}
                        </button>
                    )}
                    {/* Mobile AI Toggle - Only visible on mobile via CSS */}
                    <button
                        className={`action-btn mobile-ai-toggle ${isMobileAIViewOpen ? 'active' : ''}`}
                        onClick={onToggleMobileAI}
                        title="Toggle AI Insights"
                    >
                        <FaBrain className="ai-icon-brain" />
                    </button>
                    {/* AI Toggle Switch */}
                    {globalAiEnabled && (
                        <div className="ai-wrapper" onClick={toggleChatAI} title={selectedChat.aiEnabled ? "Disable AI" : "Enable AI"}>
                            <span className={`ai-status-text ${selectedChat.aiEnabled ? 'active' : ''}`}>
                                {selectedChat.aiEnabled ? 'AI Active' : 'AI Offline'}
                            </span>
                            <div className={`ai-switch ${selectedChat.aiEnabled ? 'active' : ''}`}>
                                <div className="ai-knob">
                                    {selectedChat.aiEnabled && <span className="ai-sparkle">✨</span>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="messages-container">
                {messages.length === 0 && !loading ? (
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
                            isGroup={selectedChat.jid ? selectedChat.jid.endsWith('@g.us') : false}
                            onReact={handleReact}
                            activeReactionMsgId={activeReactionMsgId}
                            setActiveReactionMsgId={setActiveReactionMsgId}
                            onPin={handlePinMessage}
                            onStar={handleStarMessage}
                            onDelete={handleDeleteMessage}
                            onEdit={handleEditMessage}
                        />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Editing Preview */}
            {
                editingMsg && (
                    <div className="reply-preview">
                        <div className="reply-content">
                            <span className="reply-bar" style={{ backgroundColor: '#25D366' }}></span>
                            <div style={{ flex: 1 }}>
                                <div className="reply-sender">Editing Message</div>
                                <div className="reply-text">
                                    {editingMsg.content?.text || editingMsg.text}
                                </div>
                            </div>
                            <button className="close-reply" onClick={() => { setEditingMsg(null); setNewMessage(''); }}>×</button>
                        </div>
                    </div>
                )
            }

            {/* Reply Preview */}
            {
                replyingTo && (
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
                )
            }

            {
                mediaFile && (
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
                )
            }

            <form className="message-input-container" onSubmit={editingMsg ? handleEditSubmit : handleSendMessage}>
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

            {showContactInfo && (
                <ContactInfoModal 
                    chat={selectedChat} 
                    onClose={() => setShowContactInfo(false)} 
                    onUpdateChat={onUpdateChat}
                />
            )}
        </div >
    );
}

export default ChatWindow;
