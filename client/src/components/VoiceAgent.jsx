import { useState, useEffect } from 'react';
import {
    FaPhoneAlt,
    FaUsers,
    FaMicrophoneAlt,
    FaFileAlt,
    FaDollarSign,
    FaCreditCard,
    FaSignOutAlt,
    FaSyncAlt
} from 'react-icons/fa';
import api from '../utils/apiClient';
import './VoiceAgent.css';

function VoiceAgent({ token }) {
    const [activeTab, setActiveTab] = useState('overview');
    const [user, setUser] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get('/api/auth/me');
                if (res.success && res.data) {
                    setUser(res.data);
                }
            } catch (e) {
                console.error("Failed to fetch user details", e);
            }
        };
        fetchUser();
    }, []);

    const displayName = user?.name || user?.email?.split('@')[0] || 'User';
    const displayInitial = displayName.charAt(0).toUpperCase();

    const sidebarItems = [
        { id: 'overview', icon: FaPhoneAlt, label: 'Overview' },
        { id: 'agents', icon: FaUsers, label: 'Voice Agents' },
        { id: 'history', icon: FaMicrophoneAlt, label: 'Call History' },
        { id: 'transcripts', icon: FaFileAlt, label: 'Transcripts' },
        { id: 'expenses', icon: FaDollarSign, label: 'Expenses' },
    ];

    return (
        <div className="voice-dashboard">
            {/* Inner Sidebar */}
            <div className="v-sidebar">
                <div className="v-sidebar-header">
                    <h2>Altelz</h2>
                    <div className="v-user-profile">
                        <div className="v-avatar">
                            <span>{displayInitial}</span>
                        </div>
                        <span className="v-username">{displayName}</span>
                    </div>
                </div>

                <nav className="v-nav">
                    {sidebarItems.map(item => {
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.id}
                                className={`v-nav-item ${activeTab === item.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(item.id)}
                            >
                                <Icon className="v-nav-icon" />
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="v-main-content">
                {/* Header Top Bar */}
                <header className="v-top-bar">
                    <div className="v-top-left">
                        <h1>{sidebarItems.find(i => i.id === activeTab)?.label}</h1>
                        <p>Welcome back, {displayName}!</p>
                    </div>
                    <div className="v-top-right">
                        <button className="v-currency-btn">
                            <span className="currency-symbol">₹</span> INR
                        </button>
                        <button className="v-refresh-btn">
                            <FaSyncAlt className="refresh-icon" /> Refresh
                        </button>
                    </div>
                </header>

                <div className="v-tab-content">
                    {activeTab === 'overview' && <OverviewTab />}
                    {activeTab === 'history' && <CallHistoryTab />}
                    {activeTab === 'agents' && <VoiceAgentsTab />}
                    {activeTab === 'transcripts' && <TranscriptsTab />}
                    {activeTab === 'expenses' && <ExpensesTab />}
                </div>
            </div>
        </div>
    );
}

// Ensure components are declared before use if not in separate files
const OverviewTab = () => {
    const [stats, setStats] = useState({
        totalCalls: 0,
        totalExpense: 0,
        activeAgentsCount: 0,
        totalTalkTime: 0,
        avgTalkTime: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get('/api/executions/stats');
                if (response.success && response.data) {
                    setStats(response.data);
                }
            } catch (error) {
                console.error('Error fetching stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatTime = (seconds) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    if (loading) return <div className="v-overview">Loading stats...</div>;

    return (
        <div className="v-overview">
            <h2 className="v-section-title">Overview</h2>
            <div className="v-stats-grid">
                <div className="v-stat-card">
                    <div className="v-stat-icon-wrapper black-bg">
                        <FaPhoneAlt />
                    </div>
                    <div className="v-stat-details">
                        <span className="v-stat-label">Total Calls</span>
                        <h3 className="v-stat-value">{stats.totalCalls}</h3>
                        <span className="v-stat-sub">People contacted</span>
                    </div>
                </div>

                <div className="v-stat-card">
                    <div className="v-stat-icon-wrapper gray-bg">
                        <FaDollarSign />
                    </div>
                    <div className="v-stat-details">
                        <span className="v-stat-label">Total Expense</span>
                        <h3 className="v-stat-value">₹{(stats.totalExpense / 100).toFixed(2)}</h3>
                        <span className="v-stat-sub">Add-on costs</span>
                    </div>
                </div>

                <div className="v-stat-card">
                    <div className="v-stat-icon-wrapper black-bg">
                        <FaUsers />
                    </div>
                    <div className="v-stat-details">
                        <span className="v-stat-label">Voice Agents</span>
                        <h3 className="v-stat-value">{stats.activeAgentsCount}</h3>
                        <span className="v-stat-sub">Active agents</span>
                    </div>
                </div>

                <div className="v-stat-card">
                    <div className="v-stat-icon-wrapper black-bg">
                        <FaMicrophoneAlt />
                    </div>
                    <div className="v-stat-details">
                        <span className="v-stat-label">Total Talk Time</span>
                        <h3 className="v-stat-value">{formatTime(stats.totalTalkTime)}</h3>
                        <span className="v-stat-sub">Time on calls</span>
                    </div>
                </div>

                <div className="v-stat-card">
                    <div className="v-stat-icon-wrapper gray-bg">
                        <FaSyncAlt />
                    </div>
                    <div className="v-stat-details">
                        <span className="v-stat-label">Avg Talk Time</span>
                        <h3 className="v-stat-value">{formatTime(stats.avgTalkTime)}</h3>
                        <span className="v-stat-sub">Per call average</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CallHistoryTab = () => {
    const [calls, setCalls] = useState([]);
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [filterAgent, setFilterAgent] = useState('All Agents');

    const fetchExecutionsAndAgents = async () => {
        try {
            const [execRes, agentsRes] = await Promise.all([
                api.get('/api/executions'),
                api.get('/api/agents')
            ]);

            if (execRes.success && execRes.data) {
                setCalls(execRes.data);
            }
            if (agentsRes.success && agentsRes.data) {
                setAgents(agentsRes.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExecutionsAndAgents();
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        try {
            const response = await api.post('/api/executions/sync-history');
            if (response.success) {
                // Refresh data after sync
                await fetchExecutionsAndAgents();
                alert(response.message || 'Sync successful!');
            }
        } catch (error) {
            console.error('Error syncing history:', error);
            alert('Failed to sync history from Bolna.');
        } finally {
            setSyncing(false);
        }
    };

    const formatTime = (seconds) => {
        if (!seconds) return '0s';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return m > 0 ? `${m}m ${s}s` : `${s}s`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const filteredCalls = filterAgent === 'All Agents'
        ? calls
        : calls.filter(call => call.bolna_agent_id === filterAgent); // Need agent names mapped ideally. Wait, agent id.

    return (
        <div className="v-call-history">
            <div className="v-history-header">
                <div className="v-history-title">
                    <FaMicrophoneAlt className="v-title-icon" />
                    <h2>Call History & Transcripts</h2>
                </div>
                <div className="v-filter">
                    <button
                        className={`v-refresh-btn ${syncing ? 'loading' : ''}`}
                        onClick={handleSync}
                        disabled={syncing}
                        style={{ marginRight: '1rem', padding: '0.4rem 0.8rem', fontSize: '14px' }}
                    >
                        <FaSyncAlt className={`refresh-icon ${syncing ? 'fa-spin' : ''}`} />
                        {syncing ? 'Syncing...' : 'Sync AI-telz'}
                    </button>
                    <span>Status:</span>
                    <select className="v-agent-select" value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)}>
                        <option value="All Agents">All</option>
                        {agents.map(agent => (
                            <option key={agent._id} value={agent.bolna_agent_id}>
                                {agent.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="v-call-list">
                {loading ? <div style={{ padding: '2rem', textAlign: 'center' }}>Loading calls...</div> : null}
                {!loading && filteredCalls.length === 0 ? <div style={{ padding: '2rem', textAlign: 'center' }}>No call executions found.</div> : null}

                {filteredCalls.map(call => (
                    <div key={call._id} className="v-call-item">
                        <div className="v-call-info-wrapper">
                            <div className="v-call-main">
                                <FaPhoneAlt className="v-call-phone-icon" />
                                <span className="v-call-number">Call with {call.recipientPhone}</span>
                            </div>
                            <div className="v-call-meta">
                                <span className="v-meta-item v-agent"><FaUsers className="v-meta-icon" /> Agent ID: {(call.bolna_agent_id || '').substring(0, 8)}...</span>
                                <span className="v-meta-item"><FaSyncAlt className="v-meta-icon" /> {formatTime(call.duration)}</span>
                                <span className="v-meta-item v-cost">💰 ₹{(call.cost / 100).toFixed(2)}</span>
                            </div>
                            <div className="v-call-date">
                                📅 {formatDate(call.createdAt)}
                            </div>
                        </div>
                        <div className="v-call-status">
                            <span className={`v-status-badge ${call.status}`}>{call.status.toUpperCase()}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const VoiceAgentsTab = () => {
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    const [newAgent, setNewAgent] = useState({ name: '', bolna_agent_id: '', prompt: '' });

    const [callingAgentId, setCallingAgentId] = useState(null);
    const [phoneNumber, setPhoneNumber] = useState('');
    const [callMessage, setCallMessage] = useState('');
    const [callError, setCallError] = useState(false);

    const fetchAgents = async () => {
        try {
            const response = await api.get('/api/agents');
            if (response.success && response.data) {
                setAgents(response.data);
            }
        } catch (error) {
            console.error('Error fetching agents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const handleAddAgent = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/api/agents', newAgent);
            if (response.success) {
                await fetchAgents();
                setShowAddForm(false);
                setNewAgent({ name: '', bolna_agent_id: '', prompt: '' });
            }
        } catch (error) {
            console.error('Error adding agent:', error);
            alert('Failed to add agent.');
        }
    };

    const handleDeleteAgent = async (agentId) => {
        if (!window.confirm('Are you sure you want to delete this agent?')) return;
        try {
            const response = await api.delete(`/api/agents/${agentId}`);
            if (response.success) {
                await fetchAgents();
            }
        } catch (error) {
            console.error('Error deleting agent:', error);
            alert('Failed to delete agent.');
        }
    };

    const handleCall = async (e, bolnaAgentId) => {
        e.preventDefault();
        setCallingAgentId(bolnaAgentId);
        setCallMessage('');
        setCallError(false);

        try {
            const response = await api.post('/api/bolna/call', {
                agentId: bolnaAgentId,
                recipientPhone: phoneNumber,
            });

            if (response.success || response.success === undefined) {
                setCallMessage('Call initiated successfully!');
                setPhoneNumber('');
            } else {
                setCallError(true);
                setCallMessage(response.message || 'Failed to initiate call.');
            }
        } catch (err) {
            setCallError(true);
            setCallMessage('An error occurred while trying to connect to Bolna APIs.');
        } finally {
            setCallingAgentId(null);
        }
    };

    return (
        <div className="v-voice-agents-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3>Active Voice Agents</h3>
                <button className="v-refresh-btn" onClick={() => setShowAddForm(!showAddForm)}>
                    {showAddForm ? 'Cancel' : '+ Add Agent'}
                </button>
            </div>

            {showAddForm && (
                <div style={{ background: '#1c1c1c', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid #333' }}>
                    <form onSubmit={handleAddAgent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ff6b00' }}>Agent Name</label>
                            <input type="text" value={newAgent.name} onChange={e => setNewAgent({ ...newAgent, name: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} required placeholder="e.g. Sales Bot" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ff6b00' }}>Bolna Agent ID</label>
                            <input type="text" value={newAgent.bolna_agent_id} onChange={e => setNewAgent({ ...newAgent, bolna_agent_id: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white' }} required placeholder="Agent UUID from Bolna" />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ff6b00' }}>System Prompt (Optional)</label>
                            <textarea value={newAgent.prompt} onChange={e => setNewAgent({ ...newAgent, prompt: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid #444', background: '#222', color: 'white', minHeight: '80px' }} placeholder="Context or instructions for this agent" />
                        </div>
                        <button type="submit" className="v-call-btn" style={{ background: '#ff6b00', marginTop: '0.5rem' }}>Save Agent</button>
                    </form>
                </div>
            )}

            {loading ? (
                <p>Loading agents...</p>
            ) : agents.length === 0 ? (
                <p>No agents configured yet. Add one to get started.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {agents.map(agent => (
                        <div key={agent._id} style={{ border: '1px solid #333', borderRadius: '12px', padding: '1.5rem', background: '#111' }}>
                            <h4 style={{ color: 'white', fontSize: '1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <FaUsers style={{ marginRight: '0.5rem', color: '#ff6b00' }} />
                                    {agent.name} <span style={{ fontSize: '0.8rem', marginLeft: '1rem', padding: '0.2rem 0.6rem', background: '#ff6b0033', color: '#ff6b00', borderRadius: '12px' }}>{agent.status}</span>
                                </div>
                                <button onClick={() => handleDeleteAgent(agent._id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}>Remove</button>
                            </h4>
                            <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem' }}>ID: {agent.bolna_agent_id}</p>

                            <div className="voice-agent-dialer" style={{ background: '#1a1a1a', padding: '1rem', borderRadius: '8px' }}>
                                <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: '#ccc' }}>Trigger Outbound Call:</p>
                                <form className="voice-form" onSubmit={(e) => handleCall(e, agent.bolna_agent_id)}>
                                    <div className="form-group v-form-inline">
                                        <div className="v-input-wrapper">
                                            <input
                                                type="tel"
                                                value={callingAgentId === agent.bolna_agent_id ? phoneNumber : ''}
                                                onChange={(e) => setPhoneNumber(e.target.value)}
                                                placeholder="+1234567890 (Include country code)"
                                                required
                                                disabled={callingAgentId === agent.bolna_agent_id}
                                                style={{ border: '1px solid #444' }}
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            className={`call-btn v-call-btn ${callingAgentId === agent.bolna_agent_id ? 'loading' : ''}`}
                                            disabled={callingAgentId === agent.bolna_agent_id || (callingAgentId === agent.bolna_agent_id && !phoneNumber)}
                                        >
                                            {callingAgentId === agent.bolna_agent_id ? 'Dialing...' : 'Call'}
                                        </button>
                                    </div>
                                </form>
                                {callMessage && callingAgentId === agent.bolna_agent_id && (
                                    <div className={`status-message ${callError ? 'error' : 'success'}`} style={{ marginTop: '1rem' }}>
                                        {callMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const TranscriptsTab = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCall, setSelectedCall] = useState(null);

    useEffect(() => {
        const fetchExecutions = async () => {
            try {
                const response = await api.get('/api/executions');
                if (response.success && response.data) {
                    setCalls(response.data.filter(c => c.transcript));
                }
            } catch (error) {
                console.error('Error fetching executions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchExecutions();
    }, []);

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    return (
        <div className="v-transcripts" style={{ display: 'flex', gap: '1.5rem', height: '100%' }}>
            <div style={{ flex: '1', borderRight: '1px solid #e5e7eb', paddingRight: '1rem', overflowY: 'auto', maxHeight: '70vh' }}>
                <h3 style={{ marginBottom: '1rem', color: '#111827' }}>Available Transcripts</h3>
                {loading ? <p style={{ color: '#6b7280' }}>Loading transcripts...</p> : calls.length === 0 ? <p style={{ color: '#6b7280' }}>No transcripts found.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {calls.map(call => (
                            <div
                                key={call._id}
                                onClick={() => setSelectedCall(call)}
                                style={{
                                    padding: '1rem',
                                    background: selectedCall?._id === call._id ? '#e6f7f6' : '#ffffff',
                                    border: `1px solid ${selectedCall?._id === call._id ? '#2B5EA7' : '#e5e7eb'}`,
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.02)'
                                }}
                            >
                                <div style={{ fontWeight: 'bold', marginBottom: '0.2rem', color: '#111827' }}>{call.recipientPhone}</div>
                                <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>{formatDate(call.createdAt)}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <div style={{ flex: '2', paddingLeft: '1rem', overflowY: 'auto', maxHeight: '70vh' }}>
                {selectedCall ? (
                    <div>
                        <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', color: '#111827' }}>Transcript for {selectedCall.recipientPhone}</h3>
                        <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6', color: '#374151' }}>
                            {selectedCall.transcript || 'Transcripts are not available for this call.'}
                        </div>
                    </div>
                ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af' }}>
                        Select a call from the left to view its transcript.
                    </div>
                )}
            </div>
        </div>
    );
};

const ExpensesTab = () => {
    const [calls, setCalls] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchExecutions = async () => {
            try {
                const response = await api.get('/api/executions');
                if (response.success && response.data) {
                    setCalls(response.data);
                }
            } catch (error) {
                console.error('Error fetching executions:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchExecutions();
    }, []);

    const formatDate = (dateString) => new Date(dateString).toLocaleString();

    const totalCost = calls.reduce((acc, curr) => acc + (curr.cost || 0), 0);

    return (
        <div className="v-expenses">
            <h2 className="v-section-title">Expense Report</h2>

            <div style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #f3f4f6', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '2rem', boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)' }}>
                <div style={{ background: '#e6f7f6', padding: '1.5rem', borderRadius: '50%', color: '#2B5EA7' }}>
                    <FaDollarSign size={32} />
                </div>
                <div>
                    <h3 style={{ color: '#6b7280', marginBottom: '0.5rem', fontWeight: '500', fontSize: '1rem' }}>Total Platform Expense</h3>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#111827' }}>₹{(totalCost / 100).toFixed(2)}</div>
                </div>
            </div>

            <div className="v-call-list">
                {loading ? <p style={{ color: '#6b7280' }}>Loading expenses...</p> : calls.length === 0 ? <p style={{ color: '#6b7280' }}>No call executions logged.</p> : (
                    <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #e5e7eb', color: '#6b7280' }}>
                                <th style={{ padding: '1rem 0' }}>Date</th>
                                <th style={{ padding: '1rem 0' }}>Recipient</th>
                                <th style={{ padding: '1rem 0' }}>Duration</th>
                                <th style={{ padding: '1rem 0' }}>Cost</th>
                            </tr>
                        </thead>
                        <tbody>
                            {calls.map(call => (
                                <tr key={call._id} style={{ borderBottom: '1px solid #f3f4f6', color: '#374151' }}>
                                    <td style={{ padding: '1rem 0' }}>{formatDate(call.createdAt)}</td>
                                    <td style={{ padding: '1rem 0' }}>{call.recipientPhone}</td>
                                    <td style={{ padding: '1rem 0' }}>{call.duration}s</td>
                                    <td style={{ padding: '1rem 0', fontWeight: 'bold', color: '#10b981' }}>₹{(call.cost / 100).toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const PlaceholderTab = ({ title }) => (
    <div className="v-placeholder">
        <h3>{title}</h3>
        <p>No data available yet.</p>
    </div>
);

export default VoiceAgent;
