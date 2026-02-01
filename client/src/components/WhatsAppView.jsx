import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ChatList from './ChatList';
import ChatWindow from './ChatWindow';
import AIInsights from './AIInsights';
import QRScanner from './QRScanner';
import api from '../utils/apiClient';
import ForwardModal from './ForwardModal';

function WhatsAppView({ token, onLogout }) {
    const [selectedChat, setSelectedChat] = useState(null);
    const [chats, setChats] = useState([]);
    const [messages, setMessages] = useState([]);
    const [aiEnabled, setAiEnabled] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isForwardModalOpen, setIsForwardModalOpen] = useState(false);
    const [msgToForward, setMsgToForward] = useState(null);

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
            let existingChatIndex = chatsRef.current.findIndex(c => c.jid === newMessage.chatJid);

            // If not found by JID, try matching by Phone Number (handles LID vs Phone JID)
            const senderPn = newMessage.senderPn ? newMessage.senderPn.split('@')[0] : null;

            if (existingChatIndex === -1 && senderPn) {
                existingChatIndex = chatsRef.current.findIndex(c => c.phone === senderPn);
            }

            if (existingChatIndex === -1) {
                // New chat: Re-fetch to get full details properly
                fetchChats();
                return;
            }

            // 2. Update existing chat
            setChats(prevChats => {
                // Find index again in the latest state (though it should be sync usually)
                let index = prevChats.findIndex(c => c.jid === newMessage.chatJid);
                // Use the normalized senderPn from outer scope
                if (index === -1 && senderPn) {
                    index = prevChats.findIndex(c => c.phone === senderPn);
                }

                if (index === -1) return prevChats;

                let updatedChats = [...prevChats];
                const activeChatId = selectedChatRef.current?.jid;

                // If the active chat matches either JID or Phone, reset unread
                // We need to be careful: selectedChat might be the Phone JID version
                const isActive = (activeChatId === newMessage.chatJid) ||
                    (selectedChatRef.current?.phone === senderPn);

                const currentUnread = updatedChats[index].unreadCount || 0;
                // Calculate new unread count
                const newUnread = isActive ? 0 : currentUnread + 1;

                const chatUpdate = {
                    ...updatedChats[index],
                    lastMessage: newMessage.content?.text || 'Media message',
                    lastMessageTime: newMessage.timestamp,
                    unreadCount: newUnread
                };

                // Update name and phone if provided and not currently set (or if we want to trust the latest)
                if (senderPn) {
                    chatUpdate.phone = senderPn;
                    // If the current name is just the JID-based number, update it to the phone number or pushname
                    const isGenericName = chatUpdate.name === chatUpdate.jid.split('@')[0] || chatUpdate.name === updatedChats[index].phone;
                    if (isGenericName || newMessage.senderName) {
                        chatUpdate.name = newMessage.senderName || senderPn;
                    }
                }

                // Update and move to top
                updatedChats.splice(index, 1);
                updatedChats.unshift(chatUpdate);

                return updatedChats;
            });

            // 3. Update Active Conversation Messages
            const activeChatId = selectedChatRef.current?.jid;
            const activeChatPhone = selectedChatRef.current?.phone;

            const isMatch = (activeChatId && activeChatId === newMessage.chatJid) ||
                (activeChatPhone && activeChatPhone === senderPn);

            if (isMatch) {
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
                const formattedChats = rawChats.map(chat => {
                    // Normalize phone number: use explicit phone, or extract from JID as fallback (but strip suffix)
                    let phone = chat.phoneNumber;
                    if (!phone && chat.chatJid) {
                        const parts = chat.chatJid.split('@');
                        phone = parts[0];
                    }

                    return {
                        _id: chat._id || chat.chatJid, // Fallback to JID if no ID
                        phone: phone,
                        jid: chat.chatJid,
                        name: chat.contactName || phone, // Fallback to phone/id if no name
                        lastMessage: chat.lastMessage?.content?.text || 'Media message',
                        lastMessageTime: chat.lastMessage?.timestamp || chat.updatedAt,
                        unreadCount: chat.unreadCount || 0,
                        profilePicture: chat.profilePicture, // If available
                        isArchived: chat.isArchived || false,
                        isMuted: chat.isMuted || false,
                        isGroup: chat.chatJid.includes('@g.us'),
                        aiEnabled: chat.aiEnabled || false
                    };
                });

                console.log('📱 [Frontend] Setting chats:', formattedChats.length, 'items');

                // Deduplicate chats based on phone number
                // If we have an LID chat and a Phone chat for the same person, we only show the most recent one
                const dedupedChats = [];
                const seenPhones = new Set();

                // Sort by time desc first to ensure we keep the latest
                formattedChats.sort((a, b) => new Date(b.lastMessageTime) - new Date(a.lastMessageTime));

                formattedChats.forEach(chat => {
                    const uniqueKey = chat.phone; // This should be the real number for both LID and Phone JID chats

                    if (chat.isGroup || chat.jid.includes('@broadcast') || chat.jid === 'status@broadcast') {
                        // Skip status broadcast for now if not needed, or treat them separately
                        if (chat.jid !== 'status@broadcast') {
                            dedupedChats.push(chat);
                        }
                    } else if (uniqueKey && !seenPhones.has(uniqueKey)) {
                        // Only dedupe if it looks like a real phone number (digits only, length > 5 roughly)
                        // LIDs might be random IDs, so deduping them blindly might collapse distinct chats if logic is flawed
                        // But here we assume uniqueKey is the user identity.
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

    const handleForwardRequest = (message) => {
        setMsgToForward(message);
        setIsForwardModalOpen(true);
    };

    const handleForwardAction = async (targetJid) => {
        if (!msgToForward) return;
        try {
            await api.post(`/api/messages/${msgToForward._id}/forward`, { toJid: targetJid });
            console.log('Message forwarded');
            setIsForwardModalOpen(false);
        } catch (error) {
            console.error('Forwarding failed:', error);
            alert('Failed to forward message');
        }
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
                onForward={handleForwardRequest}
            />
            <AIInsights
                selectedChat={selectedChat}
                messages={messages}
                aiEnabled={aiEnabled}
            />

            <ForwardModal
                isOpen={isForwardModalOpen}
                onClose={() => setIsForwardModalOpen(false)}
                chats={chats}
                onForward={handleForwardAction}
            />
        </div>
    );
}

export default WhatsAppView;
