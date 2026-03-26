import { useState, useEffect, useRef } from 'react';
import { IonPage, IonContent } from '@ionic/react';
import {
    FaPhoneAlt, FaHistory, FaChartBar,
    FaSpinner,
    FaPhoneSlash, FaBackspace, FaSearch,
    FaPhone, FaPhoneVolume, FaTimes
} from 'react-icons/fa';
import { MdDialpad, MdCallMissed, MdCallMade, MdCallReceived } from 'react-icons/md';
import api from '../utils/apiClient';
import './TwilioCalls.css';

function TwilioCalls({ token }) {
    const [activeTab, setActiveTab] = useState('dialer');
    const [twilioConnected, setTwilioConnected] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkTwilioStatus();
    }, []);

    const checkTwilioStatus = async () => {
        try {
            const res = await api.get('/api/user/infrastructure');
            if (res.success && res.data?.twilioConfig?.phoneNumber) {
                setTwilioConnected(true);
            }
        } catch (e) {
            console.error('Error checking Twilio status:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <IonPage>
                <IonContent>
                    <div className="gd-container">
                        <div className="gd-loading">
                            <FaSpinner className="gd-spinner" />
                            <p>Loading...</p>
                        </div>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    if (!twilioConnected) {
        return (
            <IonPage>
                <IonContent>
                    <div className="gd-container">
                        <div className="gd-not-connected">
                            <div className="gd-not-connected-icon">
                                <FaPhoneSlash />
                            </div>
                            <h2>Twilio Not Configured</h2>
                            <p>Go to <strong>Infrastructure Settings</strong> to add your Twilio credentials and phone number.</p>
                        </div>
                    </div>
                </IonContent>
            </IonPage>
        );
    }

    return (
        <IonPage>
            <IonContent scrollY={false}>
                <div className="gd-container">
                    <div className="gd-tab-content">
                        {activeTab === 'dialer' && <DialerTab />}
                        {activeTab === 'recents' && <RecentsTab />}
                        {activeTab === 'analytics' && <AnalyticsTab />}
                    </div>

                    {/* Bottom Tab Bar — Android style */}
                    <div className="gd-bottom-tabs">
                        <button
                            className={`gd-bottom-tab ${activeTab === 'recents' ? 'active' : ''}`}
                            onClick={() => setActiveTab('recents')}
                        >
                            <FaHistory />
                            <span>Recents</span>
                        </button>
                        <button
                            className={`gd-bottom-tab ${activeTab === 'dialer' ? 'active' : ''}`}
                            onClick={() => setActiveTab('dialer')}
                        >
                            <MdDialpad />
                            <span>Keypad</span>
                        </button>
                        <button
                            className={`gd-bottom-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                            onClick={() => setActiveTab('analytics')}
                        >
                            <FaChartBar />
                            <span>Analytics</span>
                        </button>
                    </div>
                </div>
            </IonContent>
        </IonPage>
    );
}

/* ============================================================
   DIALER TAB — Google Dialer Style
   ============================================================ */
const DIALPAD_KEYS = [
    { digit: '1', letters: '' },
    { digit: '2', letters: 'ABC' },
    { digit: '3', letters: 'DEF' },
    { digit: '4', letters: 'GHI' },
    { digit: '5', letters: 'JKL' },
    { digit: '6', letters: 'MNO' },
    { digit: '7', letters: 'PQRS' },
    { digit: '8', letters: 'TUV' },
    { digit: '9', letters: 'WXYZ' },
    { digit: '*', letters: '' },
    { digit: '0', letters: '+' },
    { digit: '#', letters: '' },
];

const DialerTab = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [calling, setCalling] = useState(false);
    const [callResult, setCallResult] = useState(null);
    const numberDisplayRef = useRef(null);

    const handleDialPad = (digit) => {
        setPhoneNumber(prev => prev + digit);
        setCallResult(null);
    };

    const handleBackspace = () => {
        setPhoneNumber(prev => prev.slice(0, -1));
    };

    const handleLongPressZero = () => {
        setPhoneNumber(prev => prev + '+');
    };

    const handleCall = async () => {
        if (!phoneNumber.trim()) return;
        setCalling(true);
        setCallResult(null);

        try {
            const res = await api.post('/api/twilio/call', { to: phoneNumber });
            if (res.success) {
                setCallResult({ type: 'success', message: 'Call initiated!' });
                setPhoneNumber('');
            } else {
                setCallResult({ type: 'error', message: res.message || 'Call failed' });
            }
        } catch (err) {
            setCallResult({ type: 'error', message: err.message || 'Call failed' });
        } finally {
            setCalling(false);
        }
    };

    // Auto-resize font for long numbers
    const getFontSize = () => {
        const len = phoneNumber.length;
        if (len > 18) return '1.4rem';
        if (len > 14) return '1.8rem';
        if (len > 10) return '2.2rem';
        return '2.6rem';
    };

    return (
        <div className="gd-dialer">
            {/* Number Display */}
            <div className="gd-number-display">
                <div
                    className="gd-number-text"
                    ref={numberDisplayRef}
                    style={{ fontSize: getFontSize() }}
                >
                    {phoneNumber || <span className="gd-number-placeholder">Enter a number</span>}
                </div>
            </div>

            {/* Call Result Toast */}
            {callResult && (
                <div className={`gd-toast ${callResult.type}`}>
                    {callResult.message}
                    <button className="gd-toast-close" onClick={() => setCallResult(null)}>
                        <FaTimes />
                    </button>
                </div>
            )}

            {/* Dial Pad Grid */}
            <div className="gd-dialpad">
                {DIALPAD_KEYS.map(({ digit, letters }) => (
                    <button
                        key={digit}
                        className="gd-key"
                        onClick={() => handleDialPad(digit)}
                        onContextMenu={(e) => {
                            if (digit === '0') {
                                e.preventDefault();
                                handleLongPressZero();
                            }
                        }}
                    >
                        <span className="gd-key-digit">{digit}</span>
                        {letters && <span className="gd-key-letters">{letters}</span>}
                    </button>
                ))}
            </div>

            {/* Action Row: Call + Backspace */}
            <div className="gd-action-row">
                <div className="gd-action-spacer" />
                <button
                    className={`gd-call-fab ${calling ? 'calling' : ''}`}
                    onClick={handleCall}
                    disabled={calling || !phoneNumber.trim()}
                >
                    {calling ? <FaPhoneVolume className="gd-calling-icon" /> : <FaPhone />}
                </button>
                <div className="gd-action-right">
                    {phoneNumber && (
                        <button
                            className="gd-backspace"
                            onClick={handleBackspace}
                            onContextMenu={(e) => {
                                e.preventDefault();
                                setPhoneNumber('');
                            }}
                        >
                            <FaBackspace />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   RECENTS TAB — Android Call Log Style
   ============================================================ */
const RecentsTab = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);

    useEffect(() => {
        fetchCalls();
    }, []);

    const fetchCalls = async () => {
        try {
            const res = await api.get('/api/twilio/calls?limit=100');
            if (res.success) setCalls(res.data || []);
        } catch (e) {
            console.error('Error fetching calls:', e);
        } finally {
            setLoading(false);
        }
    };

    const filtered = calls.filter(call => {
        if (filter === 'inbound' && call.direction !== 'inbound') return false;
        if (filter === 'outbound' && !call.direction?.startsWith('outbound')) return false;
        if (filter === 'missed' && call.status !== 'no-answer' && call.status !== 'busy' && call.status !== 'canceled') return false;
        if (search) {
            const s = search.toLowerCase();
            return (call.to || '').toLowerCase().includes(s) || (call.from || '').toLowerCase().includes(s);
        }
        return true;
    });

    // Group calls by date
    const groupedCalls = groupByDate(filtered);

    const isMissed = (call) =>
        call.status === 'no-answer' || call.status === 'busy' || call.status === 'canceled';

    return (
        <div className="gd-recents">
            {/* Header */}
            <div className="gd-recents-header">
                <h1>Call Log</h1>
                <button className="gd-search-toggle" onClick={() => setShowSearch(!showSearch)}>
                    {showSearch ? <FaTimes /> : <FaSearch />}
                </button>
            </div>

            {showSearch && (
                <div className="gd-search-bar">
                    <FaSearch className="gd-search-icon" />
                    <input
                        type="text"
                        placeholder="Search calls..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    {search && (
                        <button className="gd-search-clear" onClick={() => setSearch('')}>
                            <FaTimes />
                        </button>
                    )}
                </div>
            )}

            {/* Filter Chips */}
            <div className="gd-filter-chips">
                {['all', 'missed', 'inbound', 'outbound'].map(f => (
                    <button
                        key={f}
                        className={`gd-chip ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
            </div>

            {/* Call List */}
            <div className="gd-call-list">
                {loading ? (
                    <div className="gd-loading-inline"><FaSpinner className="gd-spinner" /> Loading...</div>
                ) : filtered.length === 0 ? (
                    <div className="gd-empty">
                        <FaHistory className="gd-empty-icon" />
                        <p>No calls found</p>
                    </div>
                ) : (
                    Object.entries(groupedCalls).map(([dateLabel, dayCalls]) => (
                        <div key={dateLabel} className="gd-day-group">
                            <div className="gd-day-label">{dateLabel}</div>
                            {dayCalls.map(call => {
                                const missed = isMissed(call);
                                const number = call.direction === 'inbound'
                                    ? (call.fromFormatted || call.from)
                                    : (call.toFormatted || call.to);
                                return (
                                    <div key={call.sid} className={`gd-call-item ${missed ? 'missed' : ''}`}>
                                        <div className="gd-call-type-icon">
                                            {missed ? (
                                                <MdCallMissed className="gd-icon-missed" />
                                            ) : call.direction === 'inbound' ? (
                                                <MdCallReceived className="gd-icon-inbound" />
                                            ) : (
                                                <MdCallMade className="gd-icon-outbound" />
                                            )}
                                        </div>
                                        <div className="gd-call-info">
                                            <span className={`gd-call-number ${missed ? 'missed' : ''}`}>
                                                {number || 'Unknown'}
                                            </span>
                                            <span className="gd-call-meta">
                                                {call.direction === 'inbound' ? 'Incoming' : 'Outgoing'}
                                                {call.duration ? ` · ${formatDuration(call.duration)}` : ''}
                                            </span>
                                        </div>
                                        <div className="gd-call-right">
                                            <span className="gd-call-time">
                                                {call.dateCreated ? formatTime(call.dateCreated) : ''}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

/* ============================================================
   ANALYTICS TAB
   ============================================================ */
const AnalyticsTab = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/api/twilio/stats');
            if (res.success) setStats(res.data);
        } catch (e) {
            console.error('Error fetching stats:', e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="gd-loading-inline"><FaSpinner className="gd-spinner" /> Loading analytics...</div>;
    }

    if (!stats) {
        return (
            <div className="gd-empty">
                <FaChartBar className="gd-empty-icon" />
                <p>Unable to load analytics</p>
            </div>
        );
    }

    return (
        <div className="gd-analytics">
            <div className="gd-analytics-header">
                <h1>Analytics</h1>
                <p>Call performance overview</p>
            </div>

            {/* Summary Ring */}
            <div className="gd-summary-card">
                <div className="gd-summary-ring">
                    <svg viewBox="0 0 120 120" className="gd-ring-svg">
                        <circle cx="60" cy="60" r="52" className="gd-ring-bg" />
                        <circle
                            cx="60" cy="60" r="52"
                            className="gd-ring-fill"
                            strokeDasharray={`${((stats.completedCalls || 0) / Math.max(stats.totalCalls || 1, 1)) * 327} 327`}
                        />
                    </svg>
                    <div className="gd-ring-label">
                        <span className="gd-ring-value">{stats.totalCalls || 0}</span>
                        <span className="gd-ring-text">Total</span>
                    </div>
                </div>
                <div className="gd-summary-breakdown">
                    <div className="gd-breakdown-item">
                        <div className="gd-breakdown-dot completed" />
                        <span className="gd-breakdown-label">Completed</span>
                        <span className="gd-breakdown-value">{stats.completedCalls || 0}</span>
                    </div>
                    <div className="gd-breakdown-item">
                        <div className="gd-breakdown-dot inbound" />
                        <span className="gd-breakdown-label">Inbound</span>
                        <span className="gd-breakdown-value">{stats.inboundCalls || 0}</span>
                    </div>
                    <div className="gd-breakdown-item">
                        <div className="gd-breakdown-dot outbound" />
                        <span className="gd-breakdown-label">Outbound</span>
                        <span className="gd-breakdown-value">{stats.outboundCalls || 0}</span>
                    </div>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="gd-stat-cards">
                <div className="gd-stat-card">
                    <div className="gd-stat-icon duration">
                        <FaPhoneAlt />
                    </div>
                    <div className="gd-stat-body">
                        <span className="gd-stat-val">{formatDuration(stats.totalDuration)}</span>
                        <span className="gd-stat-lbl">Total Duration</span>
                    </div>
                </div>
                <div className="gd-stat-card">
                    <div className="gd-stat-icon avg">
                        <FaHistory />
                    </div>
                    <div className="gd-stat-body">
                        <span className="gd-stat-val">{formatDuration(stats.avgDuration)}</span>
                        <span className="gd-stat-lbl">Avg Duration</span>
                    </div>
                </div>
                <div className="gd-stat-card">
                    <div className="gd-stat-icon cost">
                        <span className="gd-dollar">$</span>
                    </div>
                    <div className="gd-stat-body">
                        <span className="gd-stat-val">${stats.totalCost || '0.00'}</span>
                        <span className="gd-stat-lbl">Total Cost</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ============================================================
   HELPERS
   ============================================================ */
function formatDuration(seconds) {
    const s = parseInt(seconds || '0', 10);
    if (s === 0) return '0s';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDateLabel(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const callDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    if (callDate.getTime() === today.getTime()) return 'Today';
    if (callDate.getTime() === yesterday.getTime()) return 'Yesterday';
    return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
}

function groupByDate(calls) {
    const groups = {};
    for (const call of calls) {
        const label = call.dateCreated ? formatDateLabel(call.dateCreated) : 'Unknown';
        if (!groups[label]) groups[label] = [];
        groups[label].push(call);
    }
    return groups;
}

export default TwilioCalls;
