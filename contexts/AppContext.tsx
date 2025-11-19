
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, addHistoryItem } from '../services/storageService';
import { AVAILABLE_SOURCES, StudioGlobalState, StudioRecord, ArchitectGlobalState, LabGlobalState, ArchitectRecord, LabRecord } from '../types';
import { generateDailyStories, generateOutline, analyzeText } from '../services/geminiService';
import { Logger } from '../services/logger';

interface AppContextType {
  model: string;
  setModel: (model: string) => void;
  showOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  sources: string[];
  toggleSource: (source: string) => void;
  
  studioState: StudioGlobalState;
  setStudioState: React.Dispatch<React.SetStateAction<StudioGlobalState>>;
  startStudioGeneration: (trendFocus: string, sources: string[], lang: string) => Promise<void>;

  architectState: ArchitectGlobalState;
  setArchitectState: React.Dispatch<React.SetStateAction<ArchitectGlobalState>>;
  startArchitectGeneration: (premise: string, lang: string) => Promise<void>;

  labState: LabGlobalState;
  setLabState: React.Dispatch<React.SetStateAction<LabGlobalState>>;
  startLabAnalysis: (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  Logger.info('AppContext', 'Provider mounting...');

  const [model, setModelState] = useState<string>('gemini-2.5-flash'); 
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false); 
  const [sources, setSources] = useState<string[]>(AVAILABLE_SOURCES); 

  // --- Global States ---
  const [studioState, setStudioState] = useState<StudioGlobalState>({
      isGenerating: false, progress: 0, remainingTime: 0, generatedContent: '', trendFocus: '', lastUpdated: Date.now()
  });
  const [architectState, setArchitectState] = useState<ArchitectGlobalState>({
      isGenerating: false, progress: 0, remainingTime: 0, premise: '', outline: null, lastUpdated: Date.now()
  });
  const [labState, setLabState] = useState<LabGlobalState>({
      isAnalyzing: false, progress: 0, remainingTime: 0, inputText: '', mode: 'viral_factors', analysisResult: '', lastUpdated: Date.now()
  });

  const modelRef = useRef(model);
  modelRef.current = model;
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  // Init
  useEffect(() => {
    Logger.info('AppContext', 'Initializing settings and checking storage...');
    
    const hasSeen = localStorage.getItem('inkflow_onboarding_seen');
    if (!hasSeen) {
      Logger.info('AppContext', 'First time user detected.');
      setShowOnboarding(true);
    }

    const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        if (savedSettings.model) setModelState(savedSettings.model);
        if (savedSettings.sources) setSources(savedSettings.sources);
    }

    // Restore persistence
    const savedStudio = loadFromStorage(STORAGE_KEYS.STUDIO);
    if (savedStudio && !studioState.isGenerating) {
        setStudioState(prev => ({ ...prev, trendFocus: savedStudio.trendFocus || '', generatedContent: savedStudio.generatedContent || '' }));
    }

    const savedArchitect = loadFromStorage(STORAGE_KEYS.ARCHITECT);
    if (savedArchitect && !architectState.isGenerating) {
        setArchitectState(prev => ({ ...prev, premise: savedArchitect.premise || '', outline: savedArchitect.outline || null }));
    }
  }, []);

  // Persistence Effects omitted for brevity but logic is same...

  const setModel = (newModel: string) => {
      Logger.info('AppContext', 'User changed model', { from: model, to: newModel });
      setModelState(newModel);
      const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, model: newModel, sources });
  }

  const toggleSource = (source: string) => {
      setSources(prev => {
          const newSources = prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source];
          saveToStorage(STORAGE_KEYS.SETTINGS, { ...loadFromStorage(STORAGE_KEYS.SETTINGS), model, sources: newSources });
          return newSources;
      });
  }

  const completeOnboarding = () => {
    Logger.info('AppContext', 'Onboarding completed');
    localStorage.setItem('inkflow_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => setShowOnboarding(true);

  // --- Background Task: Studio ---
  const startStudioGeneration = async (trendFocus: string, selectedSources: string[], lang: string) => {
      if (studioState.isGenerating) {
          Logger.warn('AppContext', 'Studio generation rejected (Busy)');
          return;
      }
      const activeSources = selectedSources.length > 0 ? selectedSources : sourcesRef.current;
      Logger.info('AppContext', 'Starting Studio Task', { trendFocus, sources: activeSources });
      
      setStudioState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: 25, trendFocus, generatedContent: '' }));

      const timer = setInterval(() => {
          setStudioState(prev => {
              if (!prev.isGenerating) { clearInterval(timer); return prev; }
              return { ...prev, progress: Math.min(prev.progress + 2, 95), remainingTime: Math.max(1, prev.remainingTime - 1) };
          });
      }, 1000);

      try {
          const result = await generateDailyStories(trendFocus, activeSources, lang, modelRef.current);
          clearInterval(timer);
          Logger.info('AppContext', 'Studio Task Completed');
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, generatedContent: result, lastUpdated: Date.now() }));
          addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, { id: Date.now().toString(), timestamp: Date.now(), trendFocus: trendFocus || 'General', content: result, sources: activeSources });
      } catch (error: any) {
          Logger.error('AppContext', 'Studio Task Failed', { error: error.message });
          clearInterval(timer);
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, generatedContent: "Generation failed." }));
      }
  };

  // --- Background Task: Architect ---
  const startArchitectGeneration = async (premise: string, lang: string) => {
      if (architectState.isGenerating) return;
      Logger.info('AppContext', 'Starting Architect Task', { premise });

      setArchitectState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: 45, premise, outline: null }));

      const timer = setInterval(() => {
          setArchitectState(prev => {
              if (!prev.isGenerating) { clearInterval(timer); return prev; }
              return { ...prev, progress: Math.min(prev.progress + 1, 95), remainingTime: Math.max(1, prev.remainingTime - 1) };
          });
      }, 1000);

      try {
          const result = await generateOutline(premise, lang, modelRef.current);
          clearInterval(timer);
          if (result) {
              Logger.info('AppContext', 'Architect Task Completed');
              setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, outline: result, lastUpdated: Date.now() }));
              addHistoryItem(STORAGE_KEYS.HISTORY_ARCHITECT, { id: Date.now().toString(), timestamp: Date.now(), premise, outline: result });
          } else {
              throw new Error("Null outline returned");
          }
      } catch (error: any) {
          Logger.error('AppContext', 'Architect Task Failed', { error: error.message });
          clearInterval(timer);
          setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, outline: null }));
      }
  };

  // --- Background Task: Lab ---
  const startLabAnalysis = async (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => {
      if (labState.isAnalyzing) return;
      Logger.info('AppContext', 'Starting Lab Task', { mode });

      setLabState(prev => ({ ...prev, isAnalyzing: true, progress: 5, remainingTime: 20, inputText: text, mode, analysisResult: '' }));

      const timer = setInterval(() => {
          setLabState(prev => {
              if (!prev.isAnalyzing) { clearInterval(timer); return prev; }
              return { ...prev, progress: Math.min(prev.progress + 3, 98), remainingTime: Math.max(1, prev.remainingTime - 1) };
          });
      }, 1000);

      try {
          const result = await analyzeText(text, mode, lang, modelRef.current);
          clearInterval(timer);
          Logger.info('AppContext', 'Lab Task Completed');
          setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 100, remainingTime: 0, analysisResult: result, lastUpdated: Date.now() }));
          addHistoryItem(STORAGE_KEYS.HISTORY_LAB, { id: Date.now().toString(), timestamp: Date.now(), inputText: text, mode, analysis: result, snippet: text.substring(0, 60) + '...' });
      } catch (error: any) {
          Logger.error('AppContext', 'Lab Task Failed', { error: error.message });
          clearInterval(timer);
          setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 0, remainingTime: 0, analysisResult: "Failed." }));
      }
  };

  return (
    <AppContext.Provider value={{ 
        model, setModel, showOnboarding, completeOnboarding, resetOnboarding, sources, toggleSource,
        studioState, setStudioState, startStudioGeneration,
        architectState, setArchitectState, startArchitectGeneration,
        labState, setLabState, startLabAnalysis
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};
