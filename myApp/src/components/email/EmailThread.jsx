import { useState, useEffect } from 'react';
import { FaArrowLeft, FaReply, FaTrash, FaStar, FaPrint, FaEllipsisV } from 'react-icons/fa';
import api from '../../utils/apiClient';

function EmailThread({ threadId, onClose, onRefresh }) {
    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchThreadDetail();
    }, [threadId]);

    const fetchThreadDetail = async () => {
        setLoading(true);
        try {
            const data = await api.get(`/api/emails/threads/${threadId}`);
            if (data.success) {
                setThread(data.data);
            }
        } catch (error) {
            console.error('Error fetching thread detail:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleTrash = async () => {
        if (!window.confirm('Move this thread to trash?')) return;
        try {
            await api.delete(`/api/emails/threads/${threadId}`);
            onRefresh();
            onClose();
        } catch (error) {
            console.error('Error trashing thread:', error);
        }
    };

    const getHeader = (message, name) => {
        const header = message.payload.headers.find(h => h.name === name);
        return header ? header.value : '';
    };

    const getBody = (message) => {
        // Gmail API body is complex (multi-part, base64)
        // This is a simplified version to extract text/html
        let part = message.payload;
        if (part.parts) {
            // Find HTML part or first text part
            const htmlPart = part.parts.find(p => p.mimeType === 'text/html');
            const textPart = part.parts.find(p => p.mimeType === 'text/plain');
            part = htmlPart || textPart || part.parts[0];
        }

        if (part && part.body && part.body.data) {
            const decoded = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            return decoded;
        }
        return '(No content)';
    };

    if (loading) {
        return <div className="email-thread-loading">Loading conversation...</div>;
    }

    if (!thread || !thread.messages) {
        return <div className="email-thread-error">Could not load conversation.</div>;
    }

    const messages = thread.messages;
    const subject = getHeader(messages[0], 'Subject');

    return (
        <div className="email-thread">
            <div className="thread-header">
                <button className="back-btn" onClick={onClose}><FaArrowLeft /></button>
                <h2 className="thread-title">{subject}</h2>
                <div className="thread-actions">
                    <button onClick={handleTrash} title="Delete"><FaTrash /></button>
                    <button title="Star"><FaStar /></button>
                    <button title="Print"><FaPrint /></button>
                    <button title="More"><FaEllipsisV /></button>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((msg, index) => (
                    <div key={msg.id} className="message-item">
                        <div className="message-header">
                            <div className="sender-info">
                                <div className="sender-avatar">
                                    {getHeader(msg, 'From').charAt(0).toUpperCase()}
                                </div>
                                <div className="sender-details">
                                    <span className="sender-name">{getHeader(msg, 'From')}</span>
                                    <span className="sender-to">to {getHeader(msg, 'To')}</span>
                                </div>
                            </div>
                            <div className="message-meta">
                                <span className="message-date">{getHeader(msg, 'Date')}</span>
                                <button className="reply-btn"><FaReply /></button>
                            </div>
                        </div>
                        <div
                            className="message-body"
                            dangerouslySetInnerHTML={{ __html: getBody(msg) }}
                        />
                    </div>
                ))}
            </div>

            <div className="quick-reply">
                <div className="reply-box">
                    <p>Click here to <span>Reply</span> or <span>Forward</span></p>
                </div>
            </div>
        </div>
    );
}

export default EmailThread;
