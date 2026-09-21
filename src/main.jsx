import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HashRouter } from 'react-router-dom';
import "./assets/scss/main.scss";
import { AuthProvider } from './context/AuthContext.jsx';
import { SubscriptionProvider } from './context/SubscriptionContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';
import LaunchScreen from './components/LaunchScreen.jsx';
import NotificationPermissionPrompt from './components/NotificationPermissionPrompt.jsx';
import AppLock from './components/AppLock.jsx';

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <AuthProvider>
      <SubscriptionProvider>
        <LanguageProvider>
          <LaunchScreen />
          <NotificationPermissionPrompt />
          <AppLock />
          <App />
        </LanguageProvider>
      </SubscriptionProvider>
    </AuthProvider>
  </HashRouter>
)
