
import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Market } from './pages/Market';
import { Lab } from './pages/Lab';
import { Studio } from './pages/Studio';
import { Architect } from './pages/Architect';
import { I18nProvider } from './i18n';
import { AppProvider } from './contexts/AppContext';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'market':
        return <Market />;
      case 'analysis':
        return <Lab />;
      case 'writing':
        return <Studio />;
      case 'architect':
        return <Architect />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout currentView={currentView} setView={setCurrentView}>
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
