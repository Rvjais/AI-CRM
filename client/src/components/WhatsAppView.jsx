import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AIInsights from './AIInsights';
import QRScanner from './QRScanner';
import api from '../utils/apiClient';

function WhatsAppView({ token, onLogout }) {
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    // Ref to track selected chat without triggering effect re-runs
    const selectedChatRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        selectedChatRef.current = selectedChat;
    }, [selectedChat]);

    useEffect(() => {
        if (!token) return;

        // Initialize socket
        const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const newSocket = io(socketUrl, {
            auth: { token },
            query: { token }
        });

        socketRef.current = newSocket;

        newSocket.on('connect', () => {
            console.log('🔌 Socket connected');
        });

        newSocket.on('message:new', (data) => {
            const newMessage = data.message;
            console.log('📩 New message received:', newMessage);

            // 1. Update Chat List
            setChats(prevChats => {
                const existingChatIndex = prevChats.findIndex(c => c.jid === newMessage.chatJid);

                if (existingChatIndex === -1) {
                    // New chat: Re-fetch to get full details properly
                    fetchChats();
                    return prevChats;
                }

                let updatedChats = [...prevChats];
                const activeChatId = selectedChatRef.current?.jid;

                // Calculate new unread count
                // If this is the active chat, unread count stays 0 (or marked read)
                // If not active, increment
                const currentUnread = updatedChats[existingChatIndex].unreadCount || 0;
                const newUnread = (activeChatId === newMessage.chatJid) ? 0 : currentUnread + 1;

                const chatUpdate = {
                    ...updatedChats[existingChatIndex],
                    lastMessage: newMessage.content?.text || 'Media message',
                    lastMessageTime: newMessage.timestamp,
                    unreadCount: newUnread
                };

                // Update and move to top
                updatedChats.splice(existingChatIndex, 1);
                updatedChats.unshift(chatUpdate);

                return updatedChats;
            });

            // 2. Update Active Conversation Messages
            const activeChatId = selectedChatRef.current?.jid;
            if (activeChatId && activeChatId === newMessage.chatJid) {
                setMessages(prev => [...prev, newMessage]);
            }
        });

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [token]);

    useEffect(() => {
        checkConnectionStatus();
    }, []);

    const checkConnectionStatus = async () => {
        try {
            const data = await api.get('/api/whatsapp/status');
            if (data.success && data.data.connected) {
                setIsConnected(true);
                fetchChats();
            } else {
                setIsConnected(false);
            }
        } catch (error) {
            console.error('Connection check failed:', error);
            setIsConnected(false);
            if (error.message.includes('Unauthorized')) {
                onLogout();
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchChats = async () => {
        try {
            const data = await api.get('/api/messages');
            console.log('📱 [Frontend] Fetched chats:', data);
            if (data.success) {
                // data.data is the chats array directly
                const rawChats = Array.isArray(data.data) ? data.data : (data.data.chats || []);

                // Map backend format to frontend format
                const formattedChats = rawChats.map(chat => ({
                    _id: chat._id,
                    phone: chat.chatJid.split('@')[0], // Extract phone from JID
                    jid: chat.chatJid,
                    name: chat.contactName || chat.chatJid.split('@')[0],
                    lastMessage: chat.lastMessage?.content?.text || 'Media message',
                    lastMessageTime: chat.lastMessage?.timestamp || chat.updatedAt,
                    unreadCount: chat.unreadCount || 0,
                    profilePicture: chat.profilePicture, // If available
                    isArchived: chat.isArchived || false,
                    isMuted: chat.isMuted || false,
                    isGroup: chat.chatJid.includes('@g.us'),
                    aiEnabled: chat.aiEnabled || false
                }));

                console.log('📱 [Frontend] Setting chats:', formattedChats.length, 'items');
                setChats(formattedChats);
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
