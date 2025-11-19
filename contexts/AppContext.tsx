
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../services/storageService';
import { AVAILABLE_SOURCES } from '../types';

interface AppContextType {
  model: string;
  setModel: (model: string) => void;
  showOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  sources: string[];
  toggleSource: (source: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModelState] = useState<string>('gemini-2.5-flash');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [sources, setSources] = useState<string[]>(AVAILABLE_SOURCES);

  useEffect(() => {
    const hasSeen = localStorage.getItem('inkflow_onboarding_seen');
    if (!hasSeen) {
      setShowOnboarding(true);
    }

    const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        if (savedSettings.model) setModelState(savedSettings.model);
        if (savedSettings.sources) setSources(savedSettings.sources);
    }
  }, []);

  const setModel = (newModel: string) => {
      setModelState(newModel);
      const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, model: newModel, sources });
  }

  const toggleSource = (source: string) => {
      setSources(prev => {
          const newSources = prev.includes(source) 
            ? prev.filter(s => s !== source) 
            : [...prev, source];
          
          const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
          saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, model, sources: newSources });
          
          return newSources;
      });
  }

  const completeOnboarding = () => {
    localStorage.setItem('inkflow_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
      setShowOnboarding(true);
  }

  return (
    <AppContext.Provider value={{ model, setModel, showOnboarding, completeOnboarding, resetOnboarding, sources, toggleSource }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
