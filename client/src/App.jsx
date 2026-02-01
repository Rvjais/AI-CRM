import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import WhatsAppView from './components/WhatsAppView';
import AIConfig from './components/AIConfig';
import EmailView from './components/EmailView';
import ComingSoon from './components/ComingSoon';
import Login from './components/Login';
import './App.css';

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
  }, []);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />;
      case 'whatsapp':
        return <WhatsAppView token={token} onLogout={handleLogout} />;
      case 'email':
        return <EmailView token={token} />;
      case 'voiceagent':
        return <ComingSoon title="Voice Agent" icon="🎤" />;
      case 'aiconfig':
        return <AIConfig token={token} />;
      default:
        return <WhatsAppView token={token} onLogout={handleLogout} />;
    }
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
