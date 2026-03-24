import api from './utils/apiClient';

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
import TwilioCalls from './components/TwilioCalls';
import Login from './components/Login';
import Settings from './components/Settings';
import Loader from './components/Loader';
import './App.css';

import ErrorBoundary from './components/ErrorBoundary';

setupIonicReact();

import { App as CapApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Preferences } from '@capacitor/preferences';

function App() {
  const [token, setToken] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Load token on startup
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { value } = await Preferences.get({ key: 'token' });
        if (value) {
          setToken(value);
        }
      } catch (error) {
        console.error('Error loading token from preferences:', error);
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    // Check for Gmail OAuth code in URL
    // (We will handle this better in a Route wrapper later if needed, but keeping original logic for now)

    // Listen for deep links (Google OAuth callback from Capacitor Browser)
    const listener = CapApp.addListener('appUrlOpen', async (event) => {
      const url = event.url;
      // Example URL: com.raincrm.app://oauth_callback?gmailConnected=true
      if (url.includes('oauth_callback')) {
        // Close the Capacitor Browser to return user to the app view
        await Browser.close();

        // Note: Since they probably started in /sheets or /email, the router
        // might still be there. A force reload or toast could be added here.
        // For now, closing the browser immediately brings them back to exactly where they were.

        // To be safe, reload to ensure the connected state bubbles everywhere
        window.location.reload();
      }
    });

    return () => {
      listener.then(l => l.remove());
    };
  }, [token]);

  const handleLogin = async (newToken) => {
    await Preferences.set({ key: 'token', value: newToken });
    setToken(newToken);
  };

  const handleLogout = async () => {
    await Preferences.clear(); // Clear ALL cached data so next user sees a clean state
    setToken(null);
  };

  if (isInitializing) {
    return (
      <IonApp>
        <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader message="Loading..." />
        </div>
      </IonApp>
    );
  }

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
                <Route path="/calls" exact={true}>
                  <TwilioCalls token={token} />
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
