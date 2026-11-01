import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Intercept background or transient auth network / WebSocket rejections gracefully
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String((reason && (reason.message || reason.stack || reason)) || '');
    if (
      (reason && reason.code === 'auth/network-request-failed') ||
      msg.includes('auth/network-request-failed') ||
      msg.includes('network-request-failed') ||
      msg.includes('WebSocket') ||
      msg.includes('vite:ws') ||
      msg.includes('closed without opened')
    ) {
      event.preventDefault();
      console.debug('Handled background environment constraint gracefully:', msg);
    }
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
