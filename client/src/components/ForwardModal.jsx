import { useState } from 'react';
import { FaSearch, FaTimes, FaPaperPlane } from 'react-icons/fa';
import './ForwardModal.css';

function ForwardModal({ isOpen, onClose, chats, onForward }) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedChatId, setSelectedChatId] = useState(null);
    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const filteredChats = chats.filter(chat => {
        const query = searchQuery.toLowerCase();
        return (chat.name && chat.name.toLowerCase().includes(query)) ||
            (chat.phone && chat.phone.includes(query));
    });

    const handleForward = async () => {
        if (!selectedChatId) return;

        setIsSending(true);
        const targetChat = chats.find(c => c._id === selectedChatId);
        // Fallback JID logic same as elsewhere
        const targetJid = targetChat.jid || targetChat.phone;

        await onForward(targetJid);
        setIsSending(false);
        onClose();
        setSelectedChatId(null);
    };

    return (
        <div className="forward-modal-overlay">
            <div className="forward-modal">
                <div className="forward-header">
                    <h3>Forward Message</h3>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="search-container">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="search-input"
                    />
                </div>

                <div className="chat-selection-list">
                    {filteredChats.map(chat => (
                        <div
                            key={chat._id}
                            className={`chat-option ${selectedChatId === chat._id ? 'selected' : ''}`}
                            onClick={() => setSelectedChatId(chat._id)}
                        >
                            <div className="chat-avatar-small">
                                {chat.profilePicture ?
                                    <img src={chat.profilePicture} alt={chat.name} /> :
                                    <div className="placeholder">{(chat.name || '?')[0].toUpperCase()}</div>
                                }
                            </div>
                            <div className="chat-details">
                                <span className="chat-name">{chat.name || chat.phone}</span>
                                {chat.isGroup && <span className="group-badge">Group</span>}
                            </div>
                            {selectedChatId === chat._id && <div className="check-mark">✓</div>}
                        </div>
                    ))}
                </div>

                <div className="forward-footer">
                    <button
                        className="send-btn"
                        disabled={!selectedChatId || isSending}
                        onClick={handleForward}
                    >
                        {isSending ? 'Sending...' : <><FaPaperPlane /> Send</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default ForwardModal;
