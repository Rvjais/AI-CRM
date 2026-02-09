import { FaSearch, FaSync, FaStar, FaRegStar, FaBars } from 'react-icons/fa';

function EmailList({ threads, loading, onThreadSelect, selectedThreadId, onRefresh, onSearch, nextPageToken, onLoadMore, onMenuClick }) {

    const formatDate = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(parseInt(timestamp));
        const now = new Date();

        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
        if (diffDays < 7) {
            return date.toLocaleDateString([], { weekday: 'short' });
        }

        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const getSenderName = (from) => {
        if (!from) return 'Unknown Sender';
        // Extract name from "Name <email@example.com>"
        const match = from.match(/^(?:"?([^"]*)"?\s)?(?:<?(.+)>?)$/);
        if (match && match[1]) return match[1];
        if (match && match[2]) return match[2].split('@')[0];
        return from.split('<')[0].trim() || from;
    };

    return (
        <div className="email-list">
            <div className="email-list-header">
                <button className="menu-btn" onClick={onMenuClick} title="Menu">
                    <FaBars />
                </button>
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
                {threads.length === 0 && !loading ? (
                    <div className="list-empty">No emails found</div>
                ) : (
                    <>
                        {threads.map(thread => (
                            <div
                                key={thread.id}
                                className={`thread-item ${selectedThreadId === thread.id ? 'active' : ''}`}
                                onClick={() => onThreadSelect(thread.id)}
                            >
                                <div className="thread-meta">
                                    <span className="thread-sender">{getSenderName(thread.from)}</span>
                                    <span className="thread-date">{formatDate(thread.timestamp)}</span>
                                </div>
                                <div className="thread-subject">
                                    <div className="thread-badges">
                                        {thread.sentiment && (
                                            <span className={`sentiment-badge ${thread.sentiment}`}>
                                                {thread.sentiment.charAt(0).toUpperCase() + thread.sentiment.slice(1)}
                                            </span>
                                        )}
                                        {thread.importanceScore && (
                                            <span className="score-badge">
                                                Score: {thread.importanceScore}/10
                                            </span>
                                        )}
                                    </div>
                                    {thread.subject}
                                </div>
                                <div className="thread-snippet">{thread.snippet}</div>
                            </div>
                        ))}

                        {nextPageToken && (
                            <div className="pagination-container">
                                <button
                                    className="load-more-btn"
                                    onClick={onLoadMore}
                                    disabled={loading}
                                >
                                    {loading ? 'Loading...' : 'Load More Messages'}
                                </button>
                            </div>
                        )}

                        {loading && threads.length > 0 && (
                            <div className="list-loading">Loading more...</div>
                        )}
                    </>
                )}

                {loading && threads.length === 0 && (
                    <div className="list-loading">Loading threads...</div>
                )}
            </div>
        </div>
    );
}

export default EmailList;
