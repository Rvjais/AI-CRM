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
    const chatsRef = useRef(chats);
    const selectedChatRef = useRef(null);
    const socketRef = useRef(null);

    useEffect(() => {
        chatsRef.current = chats;
    }, [chats]);

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

            // 1. Check if we need to fetch new chats (using ref to avoid stale closure or impure updater)
            const existingChat = chatsRef.current.find(c => c.jid === newMessage.chatJid);

            if (!existingChat) {
                // New chat: Re-fetch to get full details properly
                fetchChats();
                return;
            }

            // 2. Update existing chat
            setChats(prevChats => {
                const existingChatIndex = prevChats.findIndex(c => c.jid === newMessage.chatJid);
                if (existingChatIndex === -1) return prevChats; // Should be handled above, but safety check

                let updatedChats = [...prevChats];
                const activeChatId = selectedChatRef.current?.jid;

                // Calculate new unread count
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

            // 3. Update Active Conversation Messages
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
                    _id: chat._id || chat.chatJid, // Fallback to JID if no ID
                    phone: chat.phoneNumber || chat.chatJid.split('@')[0], // Use stored phone or extract
                    jid: chat.chatJid,
                    name: chat.contactName || chat.phoneNumber || chat.chatJid.split('@')[0],
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

                // Deduplicate chats based on phone number
                // If we have an LID chat and a Phone chat for the same person, we only show the most recent one
                const dedupedChats = [];
                const seenPhones = new Set();

                // Sort by time desc first to ensure we keep the latest
                formattedChats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

                formattedChats.forEach(chat => {
                    const uniqueKey = chat.phone; // This should be the real number for both LID and Phone JID chats

                    if (chat.isGroup || chat.jid.includes('@broadcast')) {
                        dedupedChats.push(chat); // Always keep groups/broadcasts
                    } else if (uniqueKey && !seenPhones.has(uniqueKey)) {
                        seenPhones.add(uniqueKey);
                        dedupedChats.push(chat);
                    } else if (!uniqueKey) {
                        dedupedChats.push(chat);
                    }
                });

                setChats(dedupedChats);
            }
        } catch (error) {
            console.error('Error fetching chats:', error);
        }
    };

    const handleChatUpdate = (updatedChat) => {
        setChats(prevChats => {
            const newChats = prevChats.map(c => c._id === updatedChat._id ? updatedChat : c);
            return newChats;
        });
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
