import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSmile } from 'react-icons/fa';
import Message from './Message';
import api from '../utils/apiClient';
import './ChatWindow.css';

function ChatWindow({ selectedChat, messages, setMessages, token, onUpdateChat }) {
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

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

            await api.put(`/api/contacts/${jidToUse}`, { aiEnabled: newStatus });
        } catch (error) {
            console.error('Error toggling AI:', error);
            // Revert on error
            if (onUpdateChat) {
                onUpdateChat({ ...selectedChat, aiEnabled: !newStatus });
            }
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (selectedChat) {
            fetchMessages();
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
                setMessages(data.data.messages || []);
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat || loading) return;

        setLoading(true);
        try {
            // Use new format with full JID for correct routing (LID support)
            const payload = {
                chatJid: selectedChat.jid || selectedChat.phone,
                type: 'text',
                content: { text: newMessage }
            };

            const data = await api.post('/api/messages/send', payload);

            if (data.success) {
                setMessages([...messages, {
                    _id: Date.now(),
                    content: { text: newMessage },
                    // fallback so it works with Message component legacy check too
                    message: newMessage,
                    fromMe: true,
                    timestamp: new Date().toISOString()
                }]);
                setNewMessage('');
            }
        } catch (error) {
            console.error('Error sending message:', error);
        } finally {
            setLoading(false);
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
                    <p>{selectedChat.phone}</p>
                </div>

                <button
                    className={`ai-enable-btn ${selectedChat.aiEnabled ? 'active' : ''}`}
                    onClick={toggleChatAI}
                >
                    {selectedChat.aiEnabled ? 'Disable AI' : 'Enable AI'}
                </button>
            </div>

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="no-messages">
                        <p>No messages yet. Start the conversation!</p>
                    </div>
                ) : (
                    messages.map((message, index) => (
                        <Message key={message._id || index} message={message} />
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form className="message-input-container" onSubmit={handleSendMessage}>
                <button type="button" className="emoji-button">
                    <FaSmile />
                </button>
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    disabled={loading}
                    className="message-input"
                />
                <button
                    type="submit"
                    className="send-button"
                    disabled={loading || !newMessage.trim()}
                >
                    <FaPaperPlane />
                </button>
            </form>
        </div>
    );
}

export default ChatWindow;
