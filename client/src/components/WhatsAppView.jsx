import { useState, useEffect } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AIInsights from './AIInsights';

function WhatsAppView({ token, onLogout }) {
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [aiEnabled, setAiEnabled] = useState(false);

    useEffect(() => {
        fetchChats();
    }, []);

    const fetchChats = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/contacts', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                setChats(data.data.contacts || []);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        }
    };

    const handleChatUpdate = (updatedChat) => {
        setChats(prevChats =>
            prevChats.map(c => c._id === updatedChat._id ? updatedChat : c)
        );
        if (selectedChat?._id === updatedChat._id) {
            setSelectedChat(updatedChat);
        }
    };

    return (
        <div className="whatsapp-view">
            <ChatList
                chats={chats}
                selectedChat={selectedChat}
                onSelectChat={setSelectedChat}
                aiEnabled={aiEnabled}
                onToggleAI={setAiEnabled}
                onLogout={onLogout}
            />
            <ChatWindow
                selectedChat={selectedChat}
                messages={messages}
                setMessages={setMessages}
                token={token}
                onUpdateChat={handleChatUpdate}
            />
            <AIInsights
                selectedChat={selectedChat}
                messages={messages}
                aiEnabled={aiEnabled}
            />
        </div>
    );
}

export default WhatsAppView;
