import { useState, useEffect } from 'react';
import EmailSidebar from './EmailSidebar';
import EmailList from './EmailList';
import EmailThread from './EmailThread';
import EmailCompose from './EmailCompose';
import './EmailLayout.css';
import api from '../../utils/apiClient';

function EmailLayout({ userProfile }) {
    const [threads, setThreads] = useState([]);
    const [labels, setLabels] = useState([]);
    const [activeLabel, setActiveLabel] = useState('INBOX');
    const [selectedThread, setSelectedThread] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchLabels();
        fetchThreads();
    }, [activeLabel]);

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

    const fetchThreads = async () => {
        setLoading(true);
        try {
            const q = activeLabel === 'INBOX' ? 'label:INBOX' : `label:${activeLabel}`;
            const data = await api.get(`/api/emails/threads?q=${q}${searchQuery ? ' ' + searchQuery : ''}`);
            if (data.success) {
                setThreads(data.data.threads || []);
            }
        } catch (error) {
            console.error('Error fetching threads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleThreadSelect = (threadId) => {
        setSelectedThread(threadId);
    };

    const handleRefresh = () => {
        fetchThreads();
        fetchLabels();
    };

    return (
        <div className="email-layout">
            <EmailSidebar
                labels={labels}
                activeLabel={activeLabel}
                onLabelSelect={setActiveLabel}
                onComposeClick={() => setIsComposeOpen(true)}
            />

            <EmailList
                threads={threads}
                loading={loading}
                onThreadSelect={handleThreadSelect}
                selectedThreadId={selectedThread}
                onRefresh={handleRefresh}
                onSearch={setSearchQuery}
            />

            <div className="email-detail-container">
                {selectedThread ? (
                    <EmailThread
                        threadId={selectedThread}
                        onClose={() => setSelectedThread(null)}
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
