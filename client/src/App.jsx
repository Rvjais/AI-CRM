import api from './utils/apiClient';

// ... inside App component ...
// ... inside App component ...
// [We are using replace_file_content so I need to match carefully]
// I will target the imports and renderView function

import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WhatsAppView from './components/WhatsAppView';
import AIConfig from './components/AIConfig';
import EmailView from './components/EmailView';
import SheetsConfig from './components/SheetsConfig';
import CampaignManager from './components/CampaignManager';
import ImportManager from './components/ImportManager';
import FormBuilder from './components/FormBuilder';
import InfrastructureConfig from './components/InfrastructureConfig';
import ComingSoon from './components/ComingSoon';
import TwilioCalls from './components/TwilioCalls';
import Login from './components/Login';
import Settings from './components/Settings';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [activeView, setActiveView] = useState('whatsapp');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check for Gmail OAuth code in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('code')) {
      setActiveView('email');
    }
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.clear(); // Clear ALL cached data so next user sees a clean state
    setToken(null);
  };

  // Listen for forced logout from apiClient (e.g. refresh token expired)
  useEffect(() => {
    const onForceLogout = () => setToken(null);
    window.addEventListener('auth:forceLogout', onForceLogout);
    return () => window.removeEventListener('auth:forceLogout', onForceLogout);
  }, []);

  const renderView = () => {
    return (
      <ErrorBoundary>
        <div className={activeView === 'dashboard' ? 'view-active' : 'view-hidden'}>
          <Dashboard />
        </div>

        <div className={activeView === 'whatsapp' ? 'view-active' : 'view-hidden'}>
          <WhatsAppView token={token} onLogout={handleLogout} isActive={activeView === 'whatsapp'} />
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

        <div className={activeView === 'forms' ? 'view-active' : 'view-hidden'}>
          <FormBuilder />
        </div>

        <div className={activeView === 'calls' ? 'view-active' : 'view-hidden'}>
          <TwilioCalls token={token} />
        </div>
        <div className={activeView === 'aiconfig' ? 'view-active' : 'view-hidden'}>
          <AIConfig token={token} />
        </div>
        <div className={activeView === 'sheets' ? 'view-active' : 'view-hidden'}>
          <SheetsConfig />
        </div>
        <div className={activeView === 'infrastructure' ? 'view-active' : 'view-hidden'}>
          <InfrastructureConfig token={token} />
        </div>
        <div className={activeView === 'settings' ? 'view-active' : 'view-hidden'}>
          <Settings onLogout={handleLogout} />
        </div>
      </ErrorBoundary>
    );
  };


  if (!token) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app">
      {/* key={token} forces ALL child components to fully remount when the user changes,
          preventing stale data from a previous session from showing to a new user */}
      <div key={token} className={`app-container with-sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
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
