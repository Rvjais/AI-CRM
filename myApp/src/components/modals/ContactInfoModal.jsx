import React, { useState, useEffect } from 'react';
import { FaTimes, FaBan, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../utils/apiClient';
import './ContactInfoModal.css';

function ContactInfoModal({ chat, onClose, onUpdateChat }) {
    const [profilePic, setProfilePic] = useState(chat.profilePicture || null);
    const [statusText, setStatusText] = useState(null);
    const [businessProfile, setBusinessProfile] = useState(null);
    const [onWhatsApp, setOnWhatsApp] = useState(null);
    const [isBlocked, setIsBlocked] = useState(false);
    const [loading, setLoading] = useState(true);

    const jid = chat.jid || (chat.phone.includes('@') ? chat.phone : `${chat.phone}@s.whatsapp.net`);

    useEffect(() => {
        fetchAllInfo();
    }, [jid]);

    const fetchAllInfo = async () => {
        setLoading(true);
        try {
            // 1. Check if on WhatsApp
            const waRes = await api.get(`/api/whatsapp/check/${encodeURIComponent(chat.phone)}`);
            if (waRes.success && waRes.data) {
                setOnWhatsApp(waRes.data.exists);
            }

            // 2. Fetch Profile Picture
            const picRes = await api.get(`/api/whatsapp/profile-picture/${encodeURIComponent(jid)}`);
            if (picRes.success && picRes.data?.url) {
                setProfilePic(picRes.data.url);
                if (onUpdateChat && picRes.data.url !== chat.profilePicture) {
                    onUpdateChat({ ...chat, profilePicture: picRes.data.url });
                }
            }

            // 3. Fetch Status Text
            const statusRes = await api.get(`/api/whatsapp/status-text/${encodeURIComponent(jid)}`);
            if (statusRes.success && statusRes.data?.status) {
                setStatusText(statusRes.data.status);
            }

            // 4. Fetch Business Profile
            const bizRes = await api.get(`/api/whatsapp/business-profile/${encodeURIComponent(jid)}`);
            if (bizRes.success && bizRes.data?.profile) {
                setBusinessProfile(bizRes.data.profile);
            }
            
            // 5. Check if Blocked
            const blockRes = await api.get('/api/whatsapp/blocklist');
            if (blockRes.success && blockRes.data?.blocklist) {
                setIsBlocked(blockRes.data.blocklist.includes(jid));
            }

        } catch (error) {
            console.error('Error fetching contact info:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleBlock = async () => {
        try {
            if (isBlocked) {
                await api.post('/api/whatsapp/unblock', { jid });
                setIsBlocked(false);
            } else {
                if(window.confirm('Are you sure you want to block this user?')) {
                    await api.post('/api/whatsapp/block', { jid });
                    setIsBlocked(true);
                }
            }
        } catch (error) {
            console.error('Error toggling block status:', error);
            alert('Failed to update block status');
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content contact-info-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Contact Info</h2>
                    <button className="close-btn" onClick={onClose}><FaTimes /></button>
                </div>

                <div className="modal-body">
                    {loading ? (
                        <div className="loading-spinner"><div className="spinner"></div></div>
                    ) : (
                        <div className="contact-details">
                            <div className="profile-pic-container">
                                {profilePic ? (
                                    <img src={profilePic} alt="Profile" className="profile-pic-large" />
                                ) : (
                                    <div className="profile-pic-placeholder">
                                        {(chat.contactName || chat.name || chat.phoneNumber || chat.phone || '?')[0].toUpperCase()}
                                    </div>
                                )}
                            </div>

                            <h3 className="contact-name-large">
                                {chat.contactName || chat.name || chat.phoneNumber || chat.phone || 'Unknown Contact'}
                            </h3>
                            <p className="contact-phone-large">
                                {chat.phoneNumber || chat.phone}
                                {onWhatsApp === true && <span className="wa-badge" title="On WhatsApp"><FaCheckCircle /></span>}
                                {onWhatsApp === false && <span className="not-wa-badge" title="Not on WhatsApp"><FaExclamationTriangle /></span>}
                            </p>

                            {statusText && (
                                <div className="info-section">
                                    <h4>About</h4>
                                    <p>{statusText}</p>
                                </div>
                            )}

                            {businessProfile && (
                                <div className="info-section business-info">
                                    <h4>Business Info</h4>
                                    {businessProfile.description && <p><strong>Description:</strong> {businessProfile.description}</p>}
                                    {businessProfile.email && <p><strong>Email:</strong> {businessProfile.email}</p>}
                                    {businessProfile.website && <p><strong>Website:</strong> {businessProfile.website[0]}</p>}
                                </div>
                            )}

                            <div className="info-actions">
                                <button 
                                    className={`btn-block ${isBlocked ? 'unblock' : 'block'}`}
                                    onClick={toggleBlock}
                                >
                                    <FaBan /> {isBlocked ? 'Unblock User' : 'Block User'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ContactInfoModal;
