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
    onLabelSelect
}) {
    const [selectedThreadId, setSelectedThreadId] = useState(null);
    const [labels, setLabels] = useState([]);
    const [isComposeOpen, setIsComposeOpen] = useState(false);

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

    return (
        <div className="email-layout">
            <EmailSidebar
                labels={labels}
                activeLabel={activeLabel}
                onLabelSelect={onLabelSelect}
                onComposeClick={() => setIsComposeOpen(true)}
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
            />

            <div className="email-detail-container">
                {selectedThreadId ? (
                    <EmailThread
                        threadId={selectedThreadId}
                        onClose={() => setSelectedThreadId(null)}
                        onRefresh={handleRefresh}
                    />
                ) : (
                    <div className="empty-detail">
                        <div className="empty-content">
                            <img src="/email-empty.svg" alt="No selection" style={{ width: '200px', opacity: 0.5 }} />
                            <h3>Select an email to read</h3>
                            <p>Nothing is selected. Pick one from the list.</p>
                        </div>
                    </div>
                )}
            </div>

            {isComposeOpen && (
                <EmailCompose
                    onClose={() => setIsComposeOpen(false)}
                    onSuccess={handleRefresh}
                />
            )}
        </div>
    );
}

export default EmailLayout;
