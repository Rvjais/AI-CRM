import api from './utils/apiClient';

// ... inside App component ...
// ... inside App component ...
// [We are using replace_file_content so I need to match carefully]
// I will target the imports and renderView function

import { IonApp, IonRouterOutlet, IonSplitPane, IonPage, setupIonicReact } from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import { Route, Redirect } from 'react-router-dom';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';

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
import VoiceAgent from './components/VoiceAgent';
import Login from './components/Login';
import Settings from './components/Settings';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

setupIonicReact();

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Check for Gmail OAuth code in URL
    // (We will handle this better in a Route wrapper later if needed, but keeping original logic for now)
  }, [token]);

  const handleLogin = (newToken) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const handleLogout = () => {
    localStorage.clear(); // Clear ALL cached data so next user sees a clean state
    setToken(null);
  };

  if (!token) {
    return (
      <IonApp>
        <Login onLogin={handleLogin} />
      </IonApp>
    );
  }

  return (
    <IonApp>
      <IonReactRouter>
        <div key={token} className={`app-container with-sidebar ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
          <Sidebar
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
            setIsCollapsed={setIsSidebarCollapsed}
          />
          
          <div className="main-content" id="main-content">
            <ErrorBoundary>
              <IonRouterOutlet id="main-content">
                <Route exact path="/">
                  <Redirect to="/whatsapp" />
                </Route>
                <Route path="/dashboard" exact={true}>
                  <Dashboard />
                </Route>
                <Route path="/whatsapp" exact={true}>
                  <WhatsAppView token={token} onLogout={handleLogout} isActive={true} />
                </Route>
                <Route path="/email" exact={true}>
                  <EmailView token={token} />
                </Route>
                <Route path="/campaigns" exact={true}>
                  <CampaignManager />
                </Route>
                <Route path="/audience" exact={true}>
                  <ImportManager />
                </Route>
                <Route path="/forms" exact={true}>
                  <FormBuilder />
                </Route>
                <Route path="/voiceagent" exact={true}>
                  <VoiceAgent token={token} />
                </Route>
                <Route path="/aiconfig" exact={true}>
                  <AIConfig token={token} />
                </Route>
                <Route path="/sheets" exact={true}>
                  <SheetsConfig />
                </Route>
                <Route path="/infrastructure" exact={true}>
                  <InfrastructureConfig token={token} />
                </Route>
                <Route path="/settings" exact={true}>
                  <Settings onLogout={handleLogout} />
                </Route>
              </IonRouterOutlet>
            </ErrorBoundary>
          </div>
        </div>
      </IonReactRouter>
    </IonApp>
  );
}

export default App;
