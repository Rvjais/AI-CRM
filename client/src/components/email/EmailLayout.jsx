import { useState, useEffect } from 'react';
import EmailSidebar from './EmailSidebar';
import EmailList from './EmailList';
import EmailThread from './EmailThread';
import EmailCompose from './EmailCompose';
import './EmailLayout.css';
import api from '../../utils/apiClient';

function EmailLayout({
    userProfile,
    threads,
    threadsLoading,
    nextPageToken,
    onLoadMore,
    onRefresh,
    onSearch,
    activeLabel,
    onLabelSelect,
    onDisconnect
}) {
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    const [labels, setLabels] = useState([]);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [composeData, setComposeData] = useState(null);

    useEffect(() => {
        fetchLabels();
    }, []);

    const fetchLabels = async () => {
        try {
            const data = await api.get('/api/emails/labels');
            if (data.success) {
                setLabels(data.data.labels || []);
            }
        } catch (error) {
            console.error('Error fetching labels:', error);
        }
    };

    const handleThreadSelect = (threadId) => {
        setSelectedThreadId(threadId);
    };

    const handleRefresh = () => {
        onRefresh();
        fetchLabels();
    };

    const handleLabelSelect = (label) => {
        onLabelSelect(label);
        setIsSidebarOpen(false);
    };

    const handleCompose = () => {
        setComposeData(null);
        setIsComposeOpen(true);
    };

    const handleReply = (replyData) => {
        setComposeData(replyData);
        setIsComposeOpen(true);
    };

    const handleForward = (forwardData) => {
        setComposeData(forwardData);
        setIsComposeOpen(true);
    };

    const handleComposeClose = () => {
        setIsComposeOpen(false);
        setComposeData(null);
    };

    return (
        <div className={`email-layout ${selectedThreadId ? 'thread-active' : ''}`}>
            <div
                className={`sidebar-overlay ${isSidebarOpen ? 'visible' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            <EmailSidebar
                labels={labels}
                activeLabel={activeLabel}
                onLabelSelect={handleLabelSelect}
                onComposeClick={handleCompose}
                isOpen={isSidebarOpen}
                onClose={() => setIsSidebarOpen(false)}
                onDisconnect={onDisconnect}
            />
            <EmailList
                threads={threads}
                loading={threadsLoading}
                selectedThreadId={selectedThreadId}
                onThreadSelect={handleThreadSelect}
                onRefresh={handleRefresh}
                onSearch={onSearch}
                nextPageToken={nextPageToken}
                onLoadMore={onLoadMore}
                onMenuClick={() => setIsSidebarOpen(true)}
            />

            <div className="email-detail-container">
                {selectedThreadId ? (
                    <EmailThread
                        threadId={selectedThreadId}
                        onClose={() => setSelectedThreadId(null)}
                        onRefresh={handleRefresh}
                        onReply={handleReply}
                        onForward={handleForward}
                    />
                ) : (
                    <div className="empty-detail">
                        <div className="empty-content">
                            <h3>Select an email to read</h3>
                            <p>Nothing is selected. Pick one from the list.</p>
                        </div>
                    </div>
                )}
            </div>

            {isComposeOpen && (
                <EmailCompose
                    onClose={handleComposeClose}
                    onSuccess={handleRefresh}
                    replyData={composeData}
                />
            )}
        </div>
    );
}

export default EmailLayout;
