
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, addHistoryItem } from '../services/storageService';
import { AVAILABLE_SOURCES, StudioGlobalState, StudioRecord } from '../types';
import { generateDailyStories } from '../services/geminiService';

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
}

const AppContext = createContext<AppContextType | null>(null);

/**
 * 全局应用状态提供者
 * 管理设置（模型、来源）和用户引导状态
 * 以及后台任务（Studio 生成）
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModelState] = useState<string>('gemini-2.5-flash'); // 默认模型
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false); // 是否显示新手引导
  const [sources, setSources] = useState<string[]>(AVAILABLE_SOURCES); // 选中的数据源

  // Studio Global State for Background Processing
  const [studioState, setStudioState] = useState<StudioGlobalState>({
      isGenerating: false,
      progress: 0,
      generatedContent: '',
      trendFocus: '',
      lastUpdated: Date.now()
  });

  // Refs to access latest state inside async closures
  const studioStateRef = useRef(studioState);
  studioStateRef.current = studioState;
  
  const modelRef = useRef(model);
  modelRef.current = model;

  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;

  // 初始化：加载本地存储的设置，并检查是否需要显示新手引导
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

    // Load last studio content if not generating
    const savedStudio = loadFromStorage(STORAGE_KEYS.STUDIO);
    if (savedStudio && !studioState.isGenerating) {
        setStudioState(prev => ({
            ...prev,
            trendFocus: savedStudio.trendFocus || '',
            generatedContent: savedStudio.generatedContent || ''
        }));
    }
  }, []);

  // Persistence for Studio State changes
  useEffect(() => {
      if (!studioState.isGenerating) {
          // Only save static state to generic storage, history is saved separately
          const currentSaved = loadFromStorage(STORAGE_KEYS.STUDIO) || {};
          saveToStorage(STORAGE_KEYS.STUDIO, {
              ...currentSaved,
              trendFocus: studioState.trendFocus,
              generatedContent: studioState.generatedContent
          });
      }
  }, [studioState.generatedContent, studioState.trendFocus, studioState.isGenerating]);

  // 设置模型并持久化保存
  const setModel = (newModel: string) => {
      setModelState(newModel);
      const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, model: newModel, sources });
  }

  // 切换数据源（开启/关闭）并持久化保存
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

  // 标记新手引导为已完成
  const completeOnboarding = () => {
    localStorage.setItem('inkflow_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  // 重新开始新手引导（用于设置界面）
  const resetOnboarding = () => {
      setShowOnboarding(true);
  }

  // --- Background Generation Logic ---
  const startStudioGeneration = async (trendFocus: string, lang: string) => {
      if (studioState.isGenerating) return;

      // 1. Initialize State
      setStudioState(prev => ({
          ...prev,
          isGenerating: true,
          progress: 5,
          trendFocus: trendFocus,
          generatedContent: '' // Clear previous content while generating
      }));

      // 2. Start Fake Progress Timer
      const timer = setInterval(() => {
          setStudioState(prev => {
              if (!prev.isGenerating) {
                  clearInterval(timer);
                  return prev;
              }
              // Slow down as it gets higher
              const increment = prev.progress < 50 ? 5 : prev.progress < 80 ? 2 : 0.5;
              const newProgress = Math.min(prev.progress + increment, 95); // Cap at 95% until done
              return { ...prev, progress: newProgress };
          });
      }, 800);

      try {
          // 3. Perform API Call
          const result = await generateDailyStories(trendFocus, sourcesRef.current, lang, modelRef.current);
          
          // 4. Success Handling
          clearInterval(timer);
          setStudioState(prev => ({
              ...prev,
              isGenerating: false,
              progress: 100,
              generatedContent: result,
              lastUpdated: Date.now()
          }));

          // 5. Auto-save to History
          const record: StudioRecord = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              trendFocus: trendFocus || 'General',
              content: result,
              sources: sourcesRef.current
          };
          addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, record);

      } catch (error) {
          console.error("Background Generation Failed", error);
          clearInterval(timer);
          setStudioState(prev => ({
              ...prev,
              isGenerating: false,
              progress: 0,
              generatedContent: "Generation failed. Please try again."
          }));
      }
  };

  return (
    <AppContext.Provider value={{ 
        model, setModel, 
        showOnboarding, completeOnboarding, resetOnboarding, 
        sources, toggleSource,
        studioState, setStudioState, startStudioGeneration
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
