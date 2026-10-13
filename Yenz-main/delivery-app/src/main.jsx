import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initServiceWorker } from './utils/browserNotification';
import { StatusBar, Style } from '@capacitor/status-bar';

if (typeof document !== 'undefined') {
  document.body.classList.add('freshcart-theme');
}

// Initialize Capacitor native mobile styling if available
try {
  if (typeof window !== 'undefined' && window?.Capacitor?.isNativePlatform?.()) {
    StatusBar.setStyle({ style: Style.Light }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
  }
} catch {
  // Not on native device, ignore
}

initServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
