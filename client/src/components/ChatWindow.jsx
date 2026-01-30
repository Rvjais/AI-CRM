import { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaSmile } from 'react-icons/fa';
import Message from './Message';
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

            const response = await fetch(`http://localhost:3000/api/contacts/${jidToUse}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ aiEnabled: newStatus })
            });

            if (!response.ok) {
                console.error('Failed to update AI status');
                // Revert on failure
                if (onUpdateChat) {
                    onUpdateChat({ ...selectedChat, aiEnabled: !newStatus });
                }
            }
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
        if (!selectedChat?.phone) return;

        try {
            const response = await fetch(
                `http://localhost:3000/api/messages/${selectedChat.phone}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );
            const data = await response.json();
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
            const response = await fetch('http://localhost:3000/api/messages/send', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    to: selectedChat.phone,
                    message: newMessage
                })
            });

            const data = await response.json();
            if (data.success) {
                setMessages([...messages, {
                    _id: Date.now(),
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
