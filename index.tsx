
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Logger } from './services/logger';

try {
  Logger.info('Startup', 'Initializing application...', { timestamp: new Date().toISOString() });

  const rootElement = document.getElementById('root');
  
  if (!rootElement) {
    const errorMsg = "FATAL ERROR: Could not find root element with id 'root'. Application cannot mount.";
    Logger.error('Startup', errorMsg);
    document.body.innerHTML = `<div style="color: red; padding: 20px; font-family: sans-serif;"><h1>Startup Error</h1><p>${errorMsg}</p></div>`;
    throw new Error(errorMsg);
  }

  Logger.info('Startup', 'DOM Root element found.');

  const root = ReactDOM.createRoot(rootElement);
  Logger.info('Startup', 'React Root created. Rendering app tree...');

  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );

  Logger.info('Startup', 'Render command sent to React.');

} catch (e: any) {
  Logger.error('Startup', 'Uncaught exception during bootstrap:', { error: e.message });
}
