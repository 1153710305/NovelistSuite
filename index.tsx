
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

// 启动日志工具
const logStartup = (msg: string) => {
  console.log(`%c[System Startup] ${new Date().toISOString()} - ${msg}`, 'color: #0ea5e9; font-weight: bold;');
};

try {
  logStartup('Initializing application...');

  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    const errorMsg = "FATAL ERROR: Could not find root element with id 'root'. Application cannot mount.";
    console.error(errorMsg);
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;"><h1>Startup Error</h1><p>${errorMsg}</p></div>`;
    throw new Error(errorMsg);
  }

  logStartup('DOM Root element found.');

  const root = ReactDOM.createRoot(rootElement);
  logStartup('React Root created. Rendering app tree...');

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  logStartup('Render command sent to React.');

} catch (e) {
  console.error('[System Startup] Uncaught exception during bootstrap:', e);
}
