import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { FaQrcode, FaRedo } from 'react-icons/fa';
import './QRScanner.css';

function QRScanner({ token, onConnected, onLogout }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('initializing'); // initializing, scaling, exhausted, connected
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        // Initialize socket
        const newSocket = io('http://localhost:3000', {
            auth: { token }
        });

        newSocket.on('connect', () => {
            checkStatus();
        });

        newSocket.on('whatsapp:qr', (data) => {
            setQrCode(data.qrCode);
            setStatus('scanning');
        });

        newSocket.on('whatsapp:connected', () => {
            setStatus('connected');
            onConnected();
        });

        newSocket.on('whatsapp:disconnected', () => {
            setStatus('initializing');
            setQrCode(null);
        });

        newSocket.on('connect_error', (err) => {
            console.error(`Socket error: ${err.message}`);
        });

        setSocket(newSocket);
        checkStatus();
        initiateConnection();

        return () => newSocket.disconnect();
    }, [token]);

    // Helper to handle fetch with auth check
    const authenticatedFetch = async (url, options = {}) => {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.status === 401) {
                if (onLogout) onLogout();
                throw new Error('Unauthorized');
            }
            return response;
        } catch (error) {
            throw error;
        }
    };

    const checkStatus = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:3000/api/whatsapp/status');
            const data = await response.json();
            if (data.data.connected) {
                setStatus('connected');
                onConnected();
            } else if (data.data.status === 'QR_READY' || data.data.status === 'connecting') {
                // Fetch existing QR if available
                fetchQR();
            }
        } catch (error) {
            console.error('Status check failed:', error);
        }
    };

    const fetchQR = async () => {
        try {
            const response = await authenticatedFetch('http://localhost:3000/api/whatsapp/qr');
            const data = await response.json();
            if (data.data.qrCode) {
                setQrCode(data.data.qrCode);
                setStatus('scanning');
            } else {
                initiateConnection();
            }
        } catch (error) {
            console.error('Fetch QR failed:', error);
        }
    };

    const initiateConnection = async () => {
        try {
            await authenticatedFetch('http://localhost:3000/api/whatsapp/connect', {
                method: 'POST'
            });
        } catch (error) {
            console.error('Connection init failed:', error);
        }
    };

    const handleManualRefresh = async () => {
        setStatus('initializing');
        setQrCode(null);

        // Force disconnect first to clear stuck sessions
        try {
            await authenticatedFetch('http://localhost:3000/api/whatsapp/disconnect', {
                method: 'POST'
            });
        } catch (e) {
            console.warn('Disconnect failed, ignoring', e);
        }

        // Then connect
        initiateConnection();
    };

    return (
        <div className="qr-scanner-container">
            <div className="qr-card">
                <div className="qr-header">
                    <h2>Connect WhatsApp</h2>
                    <p>Open WhatsApp on your phone and scan the QR code</p>
                </div>

                <div className="qr-display">
                    {status === 'connected' ? (
                        <div className="status-message success">
                            Connect Successfully! Redirecting...
                        </div>
                    ) : status === 'exhausted' ? (
                        <div className="qr-timeout-overlay">
                            <p>{qrCode ? 'QR Code Expired' : 'Use the button below to generate a QR Code'}</p>
                            <button className="refresh-btn" onClick={handleManualRefresh}>
                                <FaRedo /> Generate QR Code
                            </button>
                        </div>
                    ) : qrCode ? (
                        <img src={qrCode} alt="Scan me" className="qr-image" />
                    ) : (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Generating QR Code... Status: {status}</p>
                        </div>
                    )}
                </div>

                <div className="qr-instructions">
                    <ol>
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Menu or Settings and select <b>Linked Devices</b></li>
                        <li>Tap on <b>Link a Device</b></li>
                        <li>Point your phone to this screen to capture the code</li>
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default QRScanner;
