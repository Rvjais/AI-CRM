import { useState, useEffect } from 'react';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AIInsights from './AIInsights';
import QRScanner from './QRScanner';

function WhatsAppView({ token, onLogout }) {
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        checkConnectionStatus();
    }, []);

    const checkConnectionStatus = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/whatsapp/status', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.status === 401) {
                onLogout();
                return;
            }

            const data = await response.json();
            if (data.success && data.data.connected) {
                setIsConnected(true);
                fetchChats();
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    };

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

    const handleConnected = () => {
        setIsConnected(true);
        fetchChats();
    };

    if (isLoading) {
        return <div className="loading">Checking connection...</div>;
    }
    if (!isConnected) {
        return <QRScanner token={token} onConnected={handleConnected} onLogout={onLogout} />;
    }

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
