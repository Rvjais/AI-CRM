import { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { FaQrcode, FaRedo } from 'react-icons/fa';
import api from '../utils/apiClient';
import './QRScanner.css';

function QRScanner({ token, onConnected, onLogout }) {
    const [qrCode, setQrCode] = useState(null);
    const [status, setStatus] = useState('initializing'); // initializing, idle, scanning, connected, exhausted
    const [socket, setSocket] = useState(null);
    const [usePairingCode, setUsePairingCode] = useState(false);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [pairingCode, setPairingCode] = useState('');
    const [requestingCode, setRequestingCode] = useState(false);
    const isCheckingRef = useRef(false);

    useEffect(() => {
        // Initialize socket with dynamic URL
        const newSocket = io(api.getBaseURL(), {
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
            setStatus('idle');
            setQrCode(null);
            setPairingCode('');
        });

        newSocket.on('connect_error', (err) => {
            console.error(`Socket error: ${err.message}`);
            if (err.message && err.message.includes('Authentication')) {
                const freshToken = localStorage.getItem('token');
                if (freshToken && freshToken !== newSocket.auth.token) {
                    newSocket.auth = { token: freshToken };
                    newSocket.connect();
                }
            }
        });

        setSocket(newSocket);
        checkStatus();

        return () => {
            if (newSocket) newSocket.disconnect();
        };
    }, [token]);

    const checkStatus = async () => {
        if (isCheckingRef.current) return;
        isCheckingRef.current = true;

        try {
            const data = await api.get('/api/whatsapp/status');
            if (data.data.connected) {
                setStatus('connected');
                onConnected();
            } else {
                // Force manual generation for all other states
                // This ensures the button is always shown initially
                setStatus('idle');
                setQrCode(null);
            }
        } catch (error) {
            console.error('Status check failed:', error);
            if (error.message === 'Unauthorized' && onLogout) {
                onLogout();
            }
            setStatus('idle');
            setQrCode(null);
        } finally {
            isCheckingRef.current = false;
        }
    };

    const fetchQR = async () => {
        try {
            const data = await api.get('/api/whatsapp/qr');
            if (data.data.qrCode) {
                setQrCode(data.data.qrCode);
                setStatus('scanning');
            } else {
                // If it claimed to be ready but no code, go to idle
                setStatus('idle');
            }
        } catch (error) {
            console.error('Fetch QR failed:', error);
            setStatus('idle');
        }
    };

    const initiateConnection = async () => {
        setStatus('initializing');
        setQrCode(null);
        try {
            await api.post('/api/whatsapp/connect');
        } catch (error) {
            console.error('Connection init failed:', error);
            setStatus('idle');
        }
    };

    const handleGenerateQR = async () => {
        setStatus('initializing');
        setQrCode(null);

        // Force disconnect first to clear stuck sessions if any
        try {
            await api.post('/api/whatsapp/disconnect');
        } catch (e) {
            console.warn('Disconnect check failed, ignoring', e);
        }

        // Then connect
        initiateConnection();
    };

    const handleRequestPairingCode = async () => {
        if (!phoneNumber) {
            alert('Please enter your phone number with country code (e.g., +1234567890)');
            return;
        }
        setRequestingCode(true);
        setStatus('initializing');
        setPairingCode('');
        
        try {
            // Initiate connection first, then request code
            await api.post('/api/whatsapp/connect');
            
            // Wait a brief moment for socket to initialize
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const res = await api.post('/api/whatsapp/pairing-code', { phoneNumber });
            if (res.success && res.data && res.data.code) {
                setPairingCode(res.data.code);
                setStatus('scanning');
            } else {
                alert('Failed to get pairing code');
                setStatus('idle');
            }
        } catch (error) {
            console.error('Pairing code request failed:', error);
            alert(error.response?.data?.message || 'Error requesting pairing code');
            setStatus('idle');
        } finally {
            setRequestingCode(false);
        }
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
                            Connected Successfully! Redirecting...
                        </div>
                    ) : usePairingCode ? (
                        <div className="pairing-code-container">
                            {pairingCode ? (
                                <div className="pairing-code-display">
                                    <h3>Your Pairing Code</h3>
                                    <div className="code-box">
                                        {pairingCode.split('').map((char, index) => (
                                            <span key={index} className="code-char">{char}</span>
                                        ))}
                                    </div>
                                    <p className="code-instruction">Enter this code on your phone when prompted.</p>
                                </div>
                            ) : (
                                <div className="qr-action-container">
                                    <p className="qr-status-text">Enter phone number with country code</p>
                                    <input 
                                        type="text" 
                                        placeholder="+1234567890" 
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="phone-input"
                                        disabled={requestingCode}
                                    />
                                    <button 
                                        className="generate-btn" 
                                        onClick={handleRequestPairingCode}
                                        disabled={requestingCode || !phoneNumber}
                                    >
                                        {requestingCode ? 'Requesting...' : 'Get Pairing Code'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (status === 'idle' || status === 'exhausted') ? (
                        <div className="qr-action-container">
                            <div className="qr-placeholder">
                                <FaQrcode size={64} className="qr-icon-placeholder" />
                            </div>
                            <p className="qr-status-text">
                                {status === 'exhausted' ? 'QR Code Expired' : 'Ready to Connect'}
                            </p>
                            <button className="generate-btn" onClick={handleGenerateQR}>
                                {status === 'exhausted' ? 'Generate New QR Code' : 'Generate QR Code'}
                            </button>
                        </div>
                    ) : qrCode ? (
                        <img src={qrCode} alt="Scan me" className="qr-image" />
                    ) : (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>Generating QR Code...</p>
                        </div>
                    )}
                </div>

                <div className="toggle-method-container" style={{ textAlign: 'center', marginTop: '1rem' }}>
                    <button 
                        className="text-btn toggle-method-btn" 
                        onClick={() => setUsePairingCode(!usePairingCode)}
                        style={{ background: 'none', border: 'none', color: '#128C7E', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                        {usePairingCode ? 'Link with QR Code instead' : 'Link with phone number instead'}
                    </button>
                </div>

                <div className="qr-instructions">
                    <ol>
                        <li>Open WhatsApp on your phone</li>
                        <li>Tap Menu or Settings and select <b>Linked Devices</b></li>
                        <li>Tap on <b>Link a Device</b></li>
                        {usePairingCode ? (
                            <li>Tap <b>Link with phone number instead</b> and enter the code above</li>
                        ) : (
                            <li>Point your phone to this screen to capture the code</li>
                        )}
                    </ol>
                </div>
            </div>
        </div>
    );
}

export default QRScanner;
