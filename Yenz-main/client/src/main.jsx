import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initServiceWorker } from './utils/browserNotification';

if (typeof document !== 'undefined') document.body.classList.add('freshcart-theme');

initServiceWorker();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

