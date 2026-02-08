import { useState } from 'react';
import { FaTimes, FaMinus, FaExpandAlt, FaTrash, FaPaperPlane } from 'react-icons/fa';
import api from '../../utils/apiClient';

function EmailCompose({ onClose, onSuccess }) {
    const [to, setTo] = useState('');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [sending, setSending] = useState(false);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!to) {
            alert('Please specify at least one recipient.');
            return;
        }

        setSending(true);
        try {
            const data = await api.post('/api/emails/send', { to, subject, body });
            if (data.success) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error('Error sending email:', error);
            alert('Failed to send email.');
        } finally {
            setSending(false);
        }
    };

    const handleSaveDraft = async () => {
        try {
            await api.post('/api/emails/drafts', { to, subject, body });
            alert('Draft saved.');
        } catch (error) {
            console.error('Error saving draft:', error);
        }
    };

    return (
        <div className="email-compose-overlay">
            <div className="compose-modal">
                <div className="compose-header">
                    <h3>New Message</h3>
                    <div className="compose-actions">
                        <button className="icon-btn mobile-close-btn" onClick={onClose}>
                            <FaTimes />
                        </button>
                        <button className="icon-btn mobile-send-btn" onClick={handleSend}>
                            <FaPaperPlane />
                        </button>
                        <div className="desktop-actions">
                            <button className="icon-btn"><FaMinus /></button>
                            <button className="icon-btn"><FaExpandAlt /></button>
                        </div>
                        <button className="icon-btn" onClick={onClose}><FaTimes /></button>
                    </div>
                </div>

                <form className="compose-form" onSubmit={handleSend}>
                    <div className="form-field">
                        <input
                            type="text"
                            placeholder="To"
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                        />
                    </div>
                    <div className="form-field">
                        <input
                            type="text"
                            placeholder="Subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                        />
                    </div>
                    <div className="form-body">
                        <textarea
                            placeholder="Write your email here..."
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={15}
                        />
                    </div>

                    <div className="compose-footer">
                        <div className="footer-left">
                            <button className="send-btn" type="submit" disabled={sending}>
                                {sending ? 'Sending...' : 'Send'} <FaPaperPlane />
                            </button>
                        </div>
                        <div className="footer-right">
                            <button className="icon-btn" type="button" onClick={handleSaveDraft} title="Save Draft">
                                <FaTrash />
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default EmailCompose;
