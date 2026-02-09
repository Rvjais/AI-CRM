import { useState } from 'react';
import { FaSearch, FaSignOutAlt } from 'react-icons/fa';
import ChatItem from './ChatItem';
import './ChatList.css';

function ChatList({ chats, selectedChat, onSelectChat, aiEnabled, onToggleAI, onLogout }) {
    const [activeTab, setActiveTab] = useState('CHAT');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredChats = chats.filter(chat => {
        const name = chat.contactName || chat.name || '';
        const phone = chat.phoneNumber || chat.phone || '';

        const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            phone.includes(searchQuery);

        const matchesAI = !aiEnabled || chat.aiEnabled;

        const isBroadcast = (chat.chatJid || chat.jid || '').includes('@broadcast');

        if (activeTab === 'ARCHIVED') {
            return matchesSearch && matchesAI && chat.isArchived;
        }

        // For other tabs, exclude archived
        if (chat.isArchived) return false;

        if (activeTab === 'GROUP') {
            return matchesSearch && matchesAI && (chat.isGroup || isBroadcast);
        } else if (activeTab === 'CAMPAIGN') {
            return matchesSearch && matchesAI && chat.category === 'campaign';
        } else {
            // CHAT tab (Default)
            // Exclude groups, broadcast, and campaigns
            return matchesSearch && matchesAI && !chat.isGroup && !isBroadcast && chat.category !== 'campaign';
        }
    });

    return (
        <div className="chat-list">
            <div className="chat-list-header">
                <h2>CHAT LIST</h2>
                <button className="logout-button" onClick={onLogout} title="Logout">
                    <FaSignOutAlt />
                </button>
            </div>

            <div className="chat-tabs">
                <button
                    className={`tab ${activeTab === 'CHAT' ? 'active' : ''}`}
                    onClick={() => setActiveTab('CHAT')}
                >
                    CHAT
                </button>
                <button
                    className={`tab ${activeTab === 'GROUP' ? 'active' : ''}`}
                    onClick={() => setActiveTab('GROUP')}
                >
                    GROUP
                </button>
                <button
                    className={`tab ${activeTab === 'CAMPAIGN' ? 'active' : ''}`}
                    onClick={() => setActiveTab('CAMPAIGN')}
                >
                    CAMPAIGN
                </button>
                <button
                    className={`tab ${activeTab === 'ARCHIVED' ? 'active' : ''}`}
                    onClick={() => setActiveTab('ARCHIVED')}
                >
                    ARCHIVED
                </button>
            </div>

            <div className="ai-toggle">
                <span>AI enabled chat</span>
                <label className="toggle-switch">
                    <input
                        type="checkbox"
                        checked={aiEnabled}
                        onChange={(e) => onToggleAI(e.target.checked)}
                    />
                    <span className="slider"></span>
                </label>
            </div>

            <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                    type="text"
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>

            <div className="chat-list-items">
                {filteredChats.length === 0 ? (
                    <div className="empty-state">
                        <p>No chats yet</p>
                        <span className="small">Connect WhatsApp to see contacts</span>
                    </div>
                ) : (
                    filteredChats.map((chat) => (
                        <ChatItem
                            key={chat.jid}
                            chat={chat}
                            isSelected={selectedChat?._id === chat._id}
                            onClick={() => onSelectChat(chat)}
                        />
                    ))
                )}
            </div>
        </div>
    );
}

export default ChatList;
