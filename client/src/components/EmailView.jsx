import { useState, useEffect } from 'react';
import { FaGoogle, FaEnvelope, FaSpinner } from 'react-icons/fa';
import api from '../utils/apiClient';
import EmailLayout from './email/EmailLayout';
import './EmailView.css';

function EmailView({ token }) {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authUrl, setAuthUrl] = useState('');
    const [userProfile, setUserProfile] = useState(null);

    useEffect(() => {
        checkConnection();
        // Check for 'code' in URL if we just redirected back
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        if (code) {
            handleCallback(code);
        }
    }, []);

    const checkConnection = async () => {
        try {
            const data = await api.get('/api/auth/me');
            if (data.success && data.data.gmailConnected) {
                setIsConnected(true);
                fetchProfile();
            } else {
                fetchAuthUrl();
            }
        } catch (error) {
            console.error('Error checking Gmail connection:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAuthUrl = async () => {
        try {
            const data = await api.get('/api/auth/google');
            if (data.success) {
                setAuthUrl(data.data.url);
            }
        } catch (error) {
            console.error('Error fetching Auth URL:', error);
        }
    };

    const handleCallback = async (code) => {
        setLoading(true);
        try {
            const data = await api.post('/api/auth/google/callback', { code });
            if (data.success) {
                setIsConnected(true);
                // Clean URL
                window.history.replaceState({}, document.title, window.location.pathname);
                fetchProfile();
            }
        } catch (error) {
            console.error('Error during Google callback:', error);
            alert('Failed to connect Gmail. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const fetchProfile = async () => {
        try {
            const data = await api.get('/api/emails/profile');
            if (data.success) {
                setUserProfile(data.data);
            }
        } catch (error) {
            console.error('Error fetching Gmail profile:', error);
        }
    };

    const handleConnect = () => {
        if (authUrl) {
            window.location.href = authUrl;
        }
    };

    if (loading) {
        return (
            <div className="email-loading">
                <FaSpinner className="spinner" />
                <p>Syncing with Gmail...</p>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="email-connect-container">
                <div className="connect-card">
                    <div className="icon-wrapper">
                        <FaEnvelope className="email-icon" />
                        <FaGoogle className="google-badge" />
                    </div>
                    <h1>Connect your Gmail</h1>
                    <p>Integrate your email directly into RainCRM to manage all customer communications in one place.</p>
                    <button className="connect-btn" onClick={handleConnect}>
                        <FaGoogle /> Connect with Google
                    </button>
                    <div className="feature-list">
                        <div className="feature-item">✓ Send and receive emails</div>
                        <div className="feature-item">✓ Management drafts and trash</div>
                        <div className="feature-item">✓ Unified customer history</div>
                    </div>
                </div>
            </div>
        );
    }

    return <EmailLayout userProfile={userProfile} token={token} />;
}

export default EmailView;
