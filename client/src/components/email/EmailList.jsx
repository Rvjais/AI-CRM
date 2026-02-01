import { FaSearch, FaSync, FaStar, FaRegStar } from 'react-icons/fa';

function EmailList({ threads, loading, onThreadSelect, selectedThreadId, onRefresh, onSearch }) {

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(parseInt(dateString));
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getSender = (thread) => {
        // Gmail threads don't have a single sender, but for the list we usually show the last message sender
        // For simplicity, we just look at the head of the thread or snippet
        // Actually thread object from list only has id and snippet
        // We'd need to fetch detail to get real sender for EVERY thread, which is slow
        // Gmail list API doesn't return sender. But snippet often contains "Sender Name - snippet"
        // Wait, listMessages actually returns message objects with threadId.
        // Let's assume we'll improve this with a better API call or just parse snippet/id for now
        return "Gmail Thread"; // Placeholder until we refine the backend fetch
    };

    return (
        <div className="email-list">
            <div className="email-list-header">
                <h2>MAIL BOX</h2>
                <button className="refresh-btn" onClick={onRefresh} title="Refresh">
                    <FaSync className={loading ? 'spinning' : ''} />
                </button>
            </div>

            <div className="search-container">
                <FaSearch className="search-icon" />
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search messages..."
                    onChange={(e) => onSearch(e.target.value)}
                />
            </div>

            <div className="list-content">
                {loading ? (
                    <div className="list-loading">Loading threads...</div>
                ) : threads.length === 0 ? (
                    <div className="list-empty">No emails found</div>
                ) : (
                    threads.map(thread => (
                        <div
                            key={thread.id}
                            className={`thread-item ${selectedThreadId === thread.id ? 'active' : ''}`}
                            onClick={() => onThreadSelect(thread.id)}
                        >
                            <div className="thread-meta">
                                <span className="thread-sender">{getSender(thread)}</span>
                                <span className="thread-date">{formatDate(thread.historyId)}</span>
                            </div>
                            <div className="thread-subject">Thread {thread.id.substring(0, 8)}</div>
                            <div className="thread-snippet">{thread.snippet}</div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default EmailList;
