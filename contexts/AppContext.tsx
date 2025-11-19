
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, addHistoryItem } from '../services/storageService';
import { AVAILABLE_SOURCES, StudioGlobalState, StudioRecord, ArchitectGlobalState, LabGlobalState, ArchitectRecord, LabRecord } from '../types';
import { generateDailyStories, generateOutline, analyzeText } from '../services/geminiService';

interface AppContextType {
  model: string;
  setModel: (model: string) => void;
  showOnboarding: boolean;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  sources: string[];
  toggleSource: (source: string) => void;
  
  // Studio Background State
  studioState: StudioGlobalState;
  setStudioState: React.Dispatch<React.SetStateAction<StudioGlobalState>>;
  startStudioGeneration: (trendFocus: string, lang: string) => Promise<void>;

  // Architect Background State
  architectState: ArchitectGlobalState;
  setArchitectState: React.Dispatch<React.SetStateAction<ArchitectGlobalState>>;
  startArchitectGeneration: (premise: string, lang: string) => Promise<void>;

  // Lab Background State
  labState: LabGlobalState;
  setLabState: React.Dispatch<React.SetStateAction<LabGlobalState>>;
  startLabAnalysis: (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

/**
 * Global App State Provider
 * Manages settings, onboarding, and background tasks for Studio, Architect, and Lab.
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModelState] = useState<string>('gemini-2.5-flash'); 
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false); 
  const [sources, setSources] = useState<string[]>(AVAILABLE_SOURCES); 

  // --- Studio Global State ---
  const [studioState, setStudioState] = useState<StudioGlobalState>({
      isGenerating: false,
      progress: 0,
      remainingTime: 0,
      generatedContent: '',
      trendFocus: '',
      lastUpdated: Date.now()
  });

  // --- Architect Global State ---
  const [architectState, setArchitectState] = useState<ArchitectGlobalState>({
      isGenerating: false,
      progress: 0,
      remainingTime: 0,
      premise: '',
      outline: null,
      lastUpdated: Date.now()
  });

  // --- Lab Global State ---
  const [labState, setLabState] = useState<LabGlobalState>({
      isAnalyzing: false,
      progress: 0,
      remainingTime: 0,
      inputText: '',
      mode: 'viral_factors',
      analysisResult: '',
      lastUpdated: Date.now()
  });

  // Refs for async access
  const modelRef = useRef(model);
  modelRef.current = model;
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  // Init
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

    // Load persistence states if not active
    const savedStudio = loadFromStorage(STORAGE_KEYS.STUDIO);
    if (savedStudio && !studioState.isGenerating) {
        setStudioState(prev => ({ ...prev, trendFocus: savedStudio.trendFocus || '', generatedContent: savedStudio.generatedContent || '' }));
    }

    const savedArchitect = loadFromStorage(STORAGE_KEYS.ARCHITECT);
    if (savedArchitect && !architectState.isGenerating) {
        setArchitectState(prev => ({ ...prev, premise: savedArchitect.premise || '', outline: savedArchitect.outline || null }));
    }
  }, []);

  // Persistence hooks
  useEffect(() => {
      if (!studioState.isGenerating) {
          const currentSaved = loadFromStorage(STORAGE_KEYS.STUDIO) || {};
          saveToStorage(STORAGE_KEYS.STUDIO, { ...currentSaved, trendFocus: studioState.trendFocus, generatedContent: studioState.generatedContent });
      }
  }, [studioState.generatedContent, studioState.trendFocus, studioState.isGenerating]);

  useEffect(() => {
      if (!architectState.isGenerating) {
          saveToStorage(STORAGE_KEYS.ARCHITECT, { premise: architectState.premise, outline: architectState.outline });
      }
  }, [architectState.premise, architectState.outline, architectState.isGenerating]);

  const setModel = (newModel: string) => {
      setModelState(newModel);
      const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, model: newModel, sources });
  }

  const toggleSource = (source: string) => {
      setSources(prev => {
          const newSources = prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source];
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

  // --- Background Task: Studio ---
  const startStudioGeneration = async (trendFocus: string, lang: string) => {
      if (studioState.isGenerating) return;
      const estimatedTime = 25; // seconds
      setStudioState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: estimatedTime, trendFocus, generatedContent: '' }));

      // Update Timer: Tick every 1s
      const timer = setInterval(() => {
          setStudioState(prev => {
              if (!prev.isGenerating) { clearInterval(timer); return prev; }
              // Logic: roughly match progress with time
              const newTime = Math.max(1, prev.remainingTime - 1);
              const increment = prev.progress < 50 ? 5 : prev.progress < 80 ? 2 : 1;
              return { ...prev, progress: Math.min(prev.progress + increment, 95), remainingTime: newTime };
          });
      }, 1000);

      try {
          const result = await generateDailyStories(trendFocus, sourcesRef.current, lang, modelRef.current);
          clearInterval(timer);
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, generatedContent: result, lastUpdated: Date.now() }));
          
          const record: StudioRecord = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              trendFocus: trendFocus || 'General',
              content: result,
              sources: sourcesRef.current
          };
          addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, record);
      } catch (error) {
          clearInterval(timer);
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, generatedContent: "Generation failed." }));
      }
  };

  // --- Background Task: Architect ---
  const startArchitectGeneration = async (premise: string, lang: string) => {
      if (architectState.isGenerating) return;
      const estimatedTime = 45; // seconds
      setArchitectState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: estimatedTime, premise, outline: null }));

      const timer = setInterval(() => {
          setArchitectState(prev => {
              if (!prev.isGenerating) { clearInterval(timer); return prev; }
              const newTime = Math.max(1, prev.remainingTime - 1);
              const increment = prev.progress < 40 ? 5 : prev.progress < 80 ? 2 : 0.5;
              return { ...prev, progress: Math.min(prev.progress + increment, 95), remainingTime: newTime };
          });
      }, 1000);

      try {
          const result = await generateOutline(premise, lang, modelRef.current);
          clearInterval(timer);
          if (result) {
              setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, outline: result, lastUpdated: Date.now() }));
              const record: ArchitectRecord = {
                  id: Date.now().toString(),
                  timestamp: Date.now(),
                  premise: premise,
                  outline: result
              };
              addHistoryItem(STORAGE_KEYS.HISTORY_ARCHITECT, record);
          } else {
              throw new Error("Null result");
          }
      } catch (error) {
          clearInterval(timer);
          setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, outline: null }));
      }
  };

  // --- Background Task: Lab ---
  const startLabAnalysis = async (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => {
      if (labState.isAnalyzing) return;
      const estimatedTime = 20; // seconds
      const safeText = text || "";
      setLabState(prev => ({ ...prev, isAnalyzing: true, progress: 5, remainingTime: estimatedTime, inputText: safeText, mode, analysisResult: '' }));

      const timer = setInterval(() => {
          setLabState(prev => {
              if (!prev.isAnalyzing) { clearInterval(timer); return prev; }
              const newTime = Math.max(1, prev.remainingTime - 1);
              const increment = prev.progress < 30 ? 10 : prev.progress < 90 ? 3 : 1;
              return { ...prev, progress: Math.min(prev.progress + increment, 98), remainingTime: newTime };
          });
      }, 1000);

      try {
          const result = await analyzeText(safeText, mode, lang, modelRef.current);
          clearInterval(timer);
          setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 100, remainingTime: 0, analysisResult: result, lastUpdated: Date.now() }));
          
          const record: LabRecord = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              inputText: safeText,
              mode: mode,
              analysis: result,
              snippet: safeText.substring(0, 60) + '...'
          };
          addHistoryItem(STORAGE_KEYS.HISTORY_LAB, record);
      } catch (error) {
          clearInterval(timer);
          setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 0, remainingTime: 0, analysisResult: "Analysis failed." }));
      }
  };

  return (
    <AppContext.Provider value={{ 
        model, setModel, 
        showOnboarding, completeOnboarding, resetOnboarding, 
        sources, toggleSource,
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
  if (!context) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
};
