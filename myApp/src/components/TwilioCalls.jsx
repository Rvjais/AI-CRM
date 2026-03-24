import { useState, useEffect } from 'react';
import {
    FaPhoneAlt, FaPhone, FaHistory, FaChartBar,
    FaArrowUp, FaArrowDown, FaSpinner, FaSearch,
    FaPhoneSlash
} from 'react-icons/fa';
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

    const tabs = [
        { id: 'dialer', icon: FaPhoneAlt, label: 'Dialer' },
        { id: 'history', icon: FaHistory, label: 'Call History' },
        { id: 'stats', icon: FaChartBar, label: 'Analytics' },
    ];

    if (loading) {
        return (
            <div className="tc-container">
                <div className="tc-loading">
                    <FaSpinner className="tc-spinner" />
                    <p>Loading...</p>
                </div>
            </div>
        );
    }

    if (!twilioConnected) {
        return (
            <div className="tc-container">
                <div className="tc-not-connected">
                    <div className="tc-not-connected-icon">
                        <FaPhoneSlash />
                    </div>
                    <h2>Twilio Not Configured</h2>
                    <p>Go to <strong>Infrastructure Settings</strong> to add your Twilio credentials and phone number.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tc-container">
            <div className="tc-header">
                <div className="tc-header-left">
                    <h1>Phone Calls</h1>
                    <p>Make and manage calls via Twilio</p>
                </div>
                <div className="tc-tabs">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                className={`tc-tab ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <Icon />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="tc-content">
                {activeTab === 'dialer' && <DialerTab />}
                {activeTab === 'history' && <CallHistoryTab />}
                {activeTab === 'stats' && <StatsTab />}
            </div>
        </div>
    );
}

const DialerTab = () => {
    const [phoneNumber, setPhoneNumber] = useState('');
    const [calling, setCalling] = useState(false);
    const [callResult, setCallResult] = useState(null);
    const [recentCalls, setRecentCalls] = useState([]);

    useEffect(() => {
        fetchRecentCalls();
    }, []);

    const fetchRecentCalls = async () => {
        try {
            const res = await api.get('/api/twilio/calls?limit=5');
            if (res.success) setRecentCalls(res.data || []);
        } catch (e) { /* ignore */ }
    };

    const handleCall = async (e) => {
        e.preventDefault();
        if (!phoneNumber.trim()) return;
        setCalling(true);
        setCallResult(null);

        try {
            const res = await api.post('/api/twilio/call', { to: phoneNumber });
            if (res.success) {
                setCallResult({ type: 'success', message: `Call initiated! SID: ${res.data?.sid || 'N/A'}` });
                setPhoneNumber('');
                fetchRecentCalls();
            } else {
                setCallResult({ type: 'error', message: res.message || 'Failed to initiate call' });
            }
        } catch (err) {
            setCallResult({ type: 'error', message: err.message || 'Failed to initiate call' });
        } finally {
            setCalling(false);
        }
    };

    const handleDialPad = (digit) => {
        setPhoneNumber(prev => prev + digit);
    };

    const handleBackspace = () => {
        setPhoneNumber(prev => prev.slice(0, -1));
    };

    const dialPadKeys = [
        ['1', '2', '3'],
        ['4', '5', '6'],
        ['7', '8', '9'],
        ['+', '0', 'DEL'],
    ];

    return (
        <div className="tc-dialer-layout">
            <div className="tc-dialer-card">
                <h3>Make a Call</h3>
                <form onSubmit={handleCall}>
                    <div className="tc-phone-input-wrapper">
                        <input
                            type="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            placeholder="+1 (234) 567-8900"
                            className="tc-phone-input"
                        />
                    </div>

                    <div className="tc-dialpad">
                        {dialPadKeys.map((row, i) => (
                            <div key={i} className="tc-dialpad-row">
                                {row.map(key => (
                                    <button
                                        key={key}
                                        type="button"
                                        className="tc-dialpad-key"
                                        onClick={() => key === 'DEL' ? handleBackspace() : handleDialPad(key)}
                                    >
                                        {key === 'DEL' ? '\u232B' : key}
                                    </button>
                                ))}
                            </div>
                        ))}
                    </div>

                    <button
                        type="submit"
                        className="tc-call-btn"
                        disabled={calling || !phoneNumber.trim()}
                    >
                        {calling ? (
                            <><FaSpinner className="tc-spinner" /> Calling...</>
                        ) : (
                            <><FaPhoneAlt /> Call</>
                        )}
                    </button>
                </form>

                {callResult && (
                    <div className={`tc-result ${callResult.type}`}>
                        {callResult.message}
                    </div>
                )}
            </div>

            <div className="tc-recent-sidebar">
                <h3>Recent Calls</h3>
                {recentCalls.length === 0 ? (
                    <p className="tc-empty">No recent calls</p>
                ) : (
                    <div className="tc-recent-list">
                        {recentCalls.map(call => (
                            <div key={call.sid} className="tc-recent-item" onClick={() => setPhoneNumber(call.direction === 'inbound' ? call.from : call.to)}>
                                <div className="tc-recent-icon">
                                    {call.direction === 'inbound' ? (
                                        <FaArrowDown className="tc-inbound" />
                                    ) : (
                                        <FaArrowUp className="tc-outbound" />
                                    )}
                                </div>
                                <div className="tc-recent-info">
                                    <span className="tc-recent-number">
                                        {call.direction === 'inbound' ? (call.fromFormatted || call.from) : (call.toFormatted || call.to)}
                                    </span>
                                    <span className="tc-recent-meta">
                                        {call.status} {call.duration ? `- ${formatDuration(call.duration)}` : ''}
                                    </span>
                                </div>
                                <span className="tc-recent-time">
                                    {call.dateCreated ? formatTimeAgo(call.dateCreated) : ''}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const CallHistoryTab = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

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

    return (
        <div className="tc-history">
            <div className="tc-history-toolbar">
                <div className="tc-search-box">
                    <FaSearch className="tc-search-icon" />
                    <input
                        type="text"
                        placeholder="Search by phone number..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="tc-filter-pills">
                    {['all', 'inbound', 'outbound', 'missed'].map(f => (
                        <button
                            key={f}
                            className={`tc-pill ${filter === f ? 'active' : ''}`}
                            onClick={() => setFilter(f)}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="tc-loading-inline"><FaSpinner className="tc-spinner" /> Loading calls...</div>
            ) : filtered.length === 0 ? (
                <div className="tc-empty-state">
                    <FaHistory className="tc-empty-icon" />
                    <p>No calls found</p>
                </div>
            ) : (
                <div className="tc-call-table">
                    <div className="tc-table-header">
                        <span>Direction</span>
                        <span>Number</span>
                        <span>Status</span>
                        <span>Duration</span>
                        <span>Cost</span>
                        <span>Date</span>
                    </div>
                    {filtered.map(call => (
                        <div key={call.sid} className="tc-table-row">
                            <span className="tc-direction">
                                {call.direction === 'inbound' ? (
                                    <span className="tc-badge inbound"><FaArrowDown /> In</span>
                                ) : (
                                    <span className="tc-badge outbound"><FaArrowUp /> Out</span>
                                )}
                            </span>
                            <span className="tc-number">
                                {call.direction === 'inbound' ? (call.fromFormatted || call.from) : (call.toFormatted || call.to)}
                            </span>
                            <span>
                                <span className={`tc-status-badge ${call.status}`}>
                                    {call.status}
                                </span>
                            </span>
                            <span>{call.duration ? formatDuration(call.duration) : '-'}</span>
                            <span className="tc-cost">{call.price ? `${call.price} ${call.priceUnit || ''}` : '-'}</span>
                            <span className="tc-date">
                                {call.dateCreated ? new Date(call.dateCreated).toLocaleString() : '-'}
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const StatsTab = () => {
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
        return <div className="tc-loading-inline"><FaSpinner className="tc-spinner" /> Loading analytics...</div>;
    }

    if (!stats) {
        return <div className="tc-empty-state"><p>Unable to load analytics</p></div>;
    }

    const statCards = [
        { label: 'Total Calls', value: stats.totalCalls, color: '#2B5EA7' },
        { label: 'Completed', value: stats.completedCalls, color: '#10b981' },
        { label: 'Inbound', value: stats.inboundCalls, color: '#8b5cf6' },
        { label: 'Outbound', value: stats.outboundCalls, color: '#f59e0b' },
        { label: 'Total Duration', value: formatDuration(stats.totalDuration), color: '#06b6d4' },
        { label: 'Avg Duration', value: formatDuration(stats.avgDuration), color: '#ec4899' },
        { label: 'Total Cost', value: `$${stats.totalCost}`, color: '#ef4444' },
    ];

    return (
        <div className="tc-stats">
            <div className="tc-stats-grid">
                {statCards.map((card, i) => (
                    <div key={i} className="tc-stat-card" style={{ borderTopColor: card.color }}>
                        <span className="tc-stat-label">{card.label}</span>
                        <span className="tc-stat-value" style={{ color: card.color }}>{card.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helpers
function formatDuration(seconds) {
    const s = parseInt(seconds || '0', 10);
    if (s === 0) return '0s';
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function formatTimeAgo(dateStr) {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
}

export default TwilioCalls;
