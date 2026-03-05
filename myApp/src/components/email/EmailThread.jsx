import { useState, useEffect, useRef, useCallback } from 'react';
import { FaArrowLeft, FaTrash, FaStar, FaPrint, FaEllipsisV, FaReply } from 'react-icons/fa';
import api from '../../utils/apiClient';

function EmailThread({ threadId, onClose, onRefresh }) {
    const [thread, setThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const iframeRefs = useRef({});

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

    // Parse "Name <email@example.com>" into { name, email }
    const parseSender = (rawFrom) => {
        const match = rawFrom.match(/^(.*?)\s*<(.+)>$/);
        if (match) return { name: match[1].replace(/"/g, '').trim(), email: match[2] };
        return { name: rawFrom, email: rawFrom };
    };

    const formatDate = (rawDate) => {
        try {
            const d = new Date(rawDate);
            return d.toLocaleString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            });
        } catch {
            return rawDate;
        }
    };

    const getBody = (message) => {
        let part = message.payload;
        if (part.parts) {
            const htmlPart = part.parts.find(p => p.mimeType === 'text/html');
            const textPart = part.parts.find(p => p.mimeType === 'text/plain');
            part = htmlPart || textPart || part.parts[0];
        }
        if (part && part.body && part.body.data) {
            try {
                return atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
            } catch {
                return '<p>(Could not decode email content)</p>';
            }
        }
        return '<p>(No content)</p>';
    };

    // Build srcdoc content that wraps the email HTML in a responsive shell
    const buildIframeSrcdoc = (htmlBody) => `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 12px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #202124;
              word-wrap: break-word;
              overflow-wrap: break-word;
            }
            img { max-width: 100% !important; height: auto !important; }
            table { max-width: 100% !important; width: 100% !important; border-collapse: collapse; }
            td, th { max-width: 100% !important; word-wrap: break-word; overflow-wrap: break-word; }
            a { color: #1a73e8; }
            pre, code { white-space: pre-wrap; word-break: break-all; }
            /* Override common marketing email max-widths */
            [width], [style*="width"] { max-width: 100% !important; }
          </style>
        </head>
        <body>${htmlBody}</body>
        </html>
    `;

    // Auto-resize iframe to fit its content
    const handleIframeLoad = useCallback((msgId, iframe) => {
        if (!iframe) return;
        try {
            const resize = () => {
                const h = iframe.contentDocument?.documentElement?.scrollHeight;
                if (h) iframe.style.height = h + 'px';
            };
            resize();
            iframe.contentWindow?.addEventListener('resize', resize);
        } catch (e) {
            // cross-origin guard
        }
    }, []);

    if (loading) {
        return (
            <div className="email-thread-loading">
                <div className="loading-spinner"></div>
                <p>Loading conversation...</p>
            </div>
        );
    }

    if (!thread || !thread.messages) {
        return <div className="email-thread-error">Could not load conversation.</div>;
    }

    const messages = thread.messages;
    const subject = getHeader(messages[0], 'Subject');

    return (
        <div className="email-thread">
            {/* Gmail-style top bar */}
            <div className="thread-header">
                <button className="back-btn icon-btn" onClick={onClose} title="Back">
                    <FaArrowLeft />
                </button>
                <h2 className="thread-title">{subject}</h2>
                <div className="thread-actions">
                    <button className="icon-btn" onClick={handleTrash} title="Delete"><FaTrash /></button>
                    <button className="icon-btn" title="Star"><FaStar /></button>
                    <button className="icon-btn" title="Print"><FaPrint /></button>
                    <button className="icon-btn" title="More"><FaEllipsisV /></button>
                </div>
            </div>

            <div className="messages-container">
                {messages.map((msg) => {
                    const rawFrom = getHeader(msg, 'From');
                    const { name: senderName, email: senderEmail } = parseSender(rawFrom);
                    const rawDate = getHeader(msg, 'Date');
                    const rawTo = getHeader(msg, 'To');
                    const body = getBody(msg);
                    const srcdoc = buildIframeSrcdoc(body);

                    return (
                        <div key={msg.id} className="message-item">
                            {/* Sender row */}
                            <div className="message-sender-row">
                                <div className="sender-avatar">
                                    {senderName.charAt(0).toUpperCase()}
                                </div>
                                <div className="sender-details">
                                    <div className="sender-name-line">
                                        <span className="sender-name">{senderName}</span>
                                        <span className="sender-email-badge">&lt;{senderEmail}&gt;</span>
                                    </div>
                                    <span className="sender-to-line">to {rawTo}</span>
                                </div>
                                <div className="message-meta">
                                    <span className="message-date">{formatDate(rawDate)}</span>
                                    <button className="icon-btn reply-meta-btn" title="Reply"><FaReply /></button>
                                </div>
                            </div>

                            {/* Email body in iframe */}
                            <iframe
                                ref={el => {
                                    iframeRefs.current[msg.id] = el;
                                    if (el) handleIframeLoad(msg.id, el);
                                }}
                                className="email-body-frame"
                                srcDoc={srcdoc}
                                title={`Email from ${senderName}`}
                                sandbox="allow-same-origin allow-popups"
                                scrolling="no"
                                onLoad={(e) => handleIframeLoad(msg.id, e.target)}
                            />
                        </div>
                    );
                })}
            </div>

            <div className="quick-reply">
                <div className="reply-box">
                    <FaReply className="reply-box-icon" />
                    <p>Click here to <span>Reply</span> or <span>Forward</span></p>
                </div>
            </div>
        </div>
    );
}

export default EmailThread;
