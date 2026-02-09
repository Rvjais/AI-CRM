import api from './utils/apiClient';

// ... inside App component ...
// [We are using replace_file_content so I need to match carefully]
// I will target the imports and renderView function

// Actually, I need to add state for infrastructureReady as well
// And fetching it.

// Let's do this in chunks or replace the whole file if it's small enough (85 lines).
// It is small enough. I'll replace the whole file for safety and clarity.

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WhatsAppView from './components/WhatsAppView';
import AIConfig from './components/AIConfig';
import EmailView from './components/EmailView';
import SheetsConfig from './components/SheetsConfig';
import InfrastructureConfig from './components/InfrastructureConfig';
import CampaignManager from './components/CampaignManager';
import ImportManager from './components/ImportManager';
import ComingSoon from './components/ComingSoon';
import Login from './components/Login';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeView, setActiveView] = useState('whatsapp');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [infrastructureReady, setInfrastructureReady] = useState(null); // null = loading

  useEffect(() => {
    // Check for Gmail OAuth code in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      setActiveView('email');
    }

    if (token) {
      checkInfrastructure();
    }
  }, [token]);

  const checkInfrastructure = async () => {
    try {
      const data = await api.get('/api/user/infrastructure');
      if (data.success && data.data) {
        setInfrastructureReady(data.data.infrastructureReady);
      }
    } catch (err) {
      console.error("Failed to check infrastructure", err);
    }
  };

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const renderView = () => {
    // Show loader while checking infrastructure
    if (infrastructureReady === null && token) {
      return (
        <div className="view-loading">
          <div className="spinner"></div>
          <p>Loading application...</p>
        </div>
      );
    }

    // blocked views if infrastructure not ready
    const isBlocked = !infrastructureReady;

    return (
      <ErrorBoundary>
        <div className={activeView === 'dashboard' ? 'view-active' : 'view-hidden'}>
          <Dashboard />
        </div>

        <div className={activeView === 'whatsapp' ? 'view-active' : 'view-hidden'}>
          {isBlocked ? (
            <div className="view-blocked">
              <h2>Infrastructure Setup Required</h2>
              <p>Please connect your Database and Cloudinary to use WhatsApp features.</p>
              <button className="btn-primary" onClick={() => setActiveView('infrastructure')}>
                Go to Settings
              </button>
            </div>
          ) : (
            <WhatsAppView token={token} onLogout={handleLogout} />
          )}
        </div>

        <div className={activeView === 'email' ? 'view-active' : 'view-hidden'}>
          <EmailView token={token} />
        </div>

        <div className={activeView === 'campaigns' ? 'view-active' : 'view-hidden'}>
          <CampaignManager />
        </div>

        <div className={activeView === 'audience' ? 'view-active' : 'view-hidden'}>
          <ImportManager />
        </div>

        <div className={activeView === 'voiceagent' ? 'view-active' : 'view-hidden'}>
          <ComingSoon title="Voice Agent" icon="🎤" />
        </div>
        <div className={activeView === 'aiconfig' ? 'view-active' : 'view-hidden'}>
          <AIConfig token={token} />
        </div>
        <div className={activeView === 'sheets' ? 'view-active' : 'view-hidden'}>
          <SheetsConfig />
        </div>
        <div className={activeView === 'infrastructure' ? 'view-active' : 'view-hidden'}>
          <InfrastructureConfig token={token} onConfigSaved={() => checkInfrastructure()} />
        </div>
      </ErrorBoundary>
    );
  };


  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      <div className={`app-container with-sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          onLogout={handleLogout}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />
        <div className="main-content">
          {renderView()}
        </div>
      </div>
    </div>
  );
}

export default App;
