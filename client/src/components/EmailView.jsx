import { useState, useEffect } from 'react';
import { FaGoogle, FaEnvelope, FaSpinner } from 'react-icons/fa';
import api from '../utils/apiClient';
import EmailLayout from './email/EmailLayout';
import './EmailView.css';
import Loader from './Loader';

function EmailView({ token }) {
    const [isConnected, setIsConnected] = useState(false);
    const [loading, setLoading] = useState(true);
    const [authUrl, setAuthUrl] = useState('');
    const [userProfile, setUserProfile] = useState(null);
    const [threads, setThreads] = useState([]);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [currentQuery, setCurrentQuery] = useState('');
    const [activeLabel, setActiveLabel] = useState('INBOX');

    useEffect(() => {
        checkConnection();

        // Handle post-redirect UI feedback if needed
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('gmailConnected')) {
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            // Optionally show a toast here
        }
    }, []);

    const checkConnection = async () => {
        try {
            const data = await api.get('/api/auth/me');
            if (data.success && data.data.gmailConnected) {
                setIsConnected(true);
                fetchProfile();
                fetchThreads();
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

    const fetchThreads = async (pageToken = null, query = currentQuery, isAppend = false, label = activeLabel) => {
        setThreadsLoading(true);
        try {
            // Build Gmail query: label logic + search query
            let gmailQuery = `label:${label}`;
            if (query) {
                gmailQuery = `${query} label:${label}`;
            }

            const endpoint = `/api/emails/threads?maxResults=20${pageToken ? `&pageToken=${pageToken}` : ''}&q=${encodeURIComponent(gmailQuery)}`;
            const data = await api.get(endpoint);
            if (data.success) {
                if (isAppend) {
                    setThreads(prev => [...prev, ...data.data.threads]);
                } else {
                    setThreads(data.data.threads);
                }
                setNextPageToken(data.data.nextPageToken);
            }
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setThreadsLoading(false);
        }
    };

    const handleLoadMore = () => {
        if (nextPageToken && !threadsLoading) {
            fetchThreads(nextPageToken, currentQuery, true);
        }
    };

    const handleSearch = (query) => {
        setCurrentQuery(query);
        fetchThreads(null, query, false);
    };

    const handleRefresh = () => {
        fetchThreads(null, currentQuery, false, activeLabel);
    };

    const handleLabelChange = (newLabel) => {
        setActiveLabel(newLabel);
        fetchThreads(null, currentQuery, false, newLabel);
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
                fetchThreads();
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


    const handleDisconnect = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Gmail account?')) return;

        setLoading(true);
        try {
            const data = await api.post('/api/auth/google/disconnect');
            if (data.success) {
                setIsConnected(false);
                setUserProfile(null);
                setThreads([]);
            }
        } catch (error) {
            console.error('Error disconnecting Gmail:', error);
            alert('Failed to disconnect Gmail.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
                <Loader size="large" />
                <p style={{ marginTop: '16px', color: '#6b7280', fontSize: '14px' }}>Syncing with Gmail...</p>
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

    return (
        <EmailLayout
            userProfile={userProfile}
            token={token}
            threads={threads}
            threadsLoading={threadsLoading}
            nextPageToken={nextPageToken}
            onLoadMore={handleLoadMore}
            onRefresh={handleRefresh}
            onSearch={handleSearch}
            activeLabel={activeLabel}
            onLabelSelect={handleLabelChange}
            onDisconnect={handleDisconnect}
        />
    );
}

export default EmailView;
