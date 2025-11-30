/**
 * @file App.tsx
 * @description Root component and main router of the application.
 * 
 * ## Functionality
 * - Handles authentication state (Guest/User/Admin).
 * - Manages view routing (Dashboard, Studio, Market, etc.).
 * - Wraps the application in Global Providers (`AppProvider`, `I18nProvider`).
 * 
 * ## Module Correspondence
 * - The entry point for the React component tree.
 */

import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Market } from './pages/Market';
import { Studio } from './pages/Studio';
import { Architect } from './pages/Architect';
import { CoverStudio } from './pages/CoverStudio';
import { Chat } from './pages/Chat';
import { Workflow } from './pages/Workflow';
import { Login } from './pages/Login';
import { Admin } from './pages/Admin';
import { I18nProvider } from './i18n';
import { AppProvider } from './contexts/AppContext';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');
  const [authStatus, setAuthStatus] = useState<'guest' | 'user' | 'admin'>('guest');

  const handleLogin = (role: 'user' | 'admin') => {
      setAuthStatus(role);
      setCurrentView('dashboard');
  };

  const handleLogout = () => {
      setAuthStatus('guest');
  };

  if (authStatus === 'guest') {
      return <Login onLogin={handleLogin} />;
  }

  if (authStatus === 'admin') {
      return <Admin onLogout={handleLogout} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'market': return <Market />;
      case 'writing': return <Studio />;
      case 'architect': return <Architect />;
      case 'workflow': return <Workflow />;
      case 'cover': return <CoverStudio />;
      case 'chat': return <Chat />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView} onLogout={handleLogout}>
      {renderView()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <I18nProvider>
        <AppContent />
      </I18nProvider>
    </AppProvider>
  );
};

export default App;