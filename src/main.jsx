import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { HashRouter } from 'react-router-dom';
import "./assets/scss/main.scss";
import { AuthProvider } from './context/AuthContext.jsx';
import LaunchScreen from './components/LaunchScreen.jsx';

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <AuthProvider>
      <LaunchScreen />
      <App />
    </AuthProvider>
  </HashRouter>
)
