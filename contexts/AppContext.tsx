
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, addHistoryItem } from '../services/storageService';
import { AVAILABLE_SOURCES, StudioGlobalState, ArchitectGlobalState, LabGlobalState, PromptTemplate, GenerationConfig } from '../types';
import { generateDailyStories, generateOutline, analyzeText, generateStoryFromIdea } from '../services/geminiService';
import { useI18n } from '../i18n';

// Default Prompts
const DEFAULT_PROMPTS: PromptTemplate[] = [
    { id: 'p1', name: '起点热血风 (Qidian)', content: '文风要求：节奏紧凑，升级感强，爽点密集。多用短句，少用形容词堆砌。强调主角的意志和行动力。', tags: ['style', 'male'] },
    { id: 'p2', name: '番茄脑洞风 (Fanqie)', content: '文风要求：开篇即高潮，设定要新奇（脑洞大）。对话要接地气，带有一定的幽默感或吐槽役风格。', tags: ['style', 'viral'] },
    { id: 'p3', name: '晋江细腻风 (Jinjiang)', content: '文风要求：情感细腻，注重心理描写和环境烘托。人物互动要有张力（苏感）。', tags: ['style', 'female'] },
    { id: 'p4', name: '去AI感 (Humanize)', content: '禁止使用排比句和翻译腔。多使用口语化表达。增加感官描写（视觉、听觉、嗅觉）。不要过度总结。', tags: ['tweak'] }
];

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
  startStudioGeneration: (trendFocus: string, sources: string[], targetAudience: string, lang: string) => Promise<void>;
  startStoryGeneration: (idea: string, config: GenerationConfig, lang: string) => Promise<void>;

  architectState: ArchitectGlobalState;
  setArchitectState: React.Dispatch<React.SetStateAction<ArchitectGlobalState>>;
  startArchitectGeneration: (premise: string, lang: string) => Promise<void>;

  labState: LabGlobalState;
  setLabState: React.Dispatch<React.SetStateAction<LabGlobalState>>;
  startLabAnalysis: (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => Promise<void>;

  promptLibrary: PromptTemplate[];
  addPrompt: (p: PromptTemplate) => void;
  deletePrompt: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [model, setModelState] = useState<string>('gemini-2.5-flash'); 
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false); 
  const [sources, setSources] = useState<string[]>(AVAILABLE_SOURCES); 
  const [promptLibrary, setPromptLibrary] = useState<PromptTemplate[]>([]);

  // --- Global States ---
  const [studioState, setStudioState] = useState<StudioGlobalState>({
      isGenerating: false, progress: 0, remainingTime: 0, generatedContent: '', trendFocus: '', lastUpdated: Date.now()
  });
  const [architectState, setArchitectState] = useState<ArchitectGlobalState>({
      isGenerating: false, progress: 0, remainingTime: 0, premise: '', synopsis: '', coverImage: '', outline: null, activeRecordId: undefined, lastUpdated: Date.now()
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
    const hasSeen = localStorage.getItem('inkflow_onboarding_seen');
    if (!hasSeen) setShowOnboarding(true);

    const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS);
    if (savedSettings) {
        if (savedSettings.model) setModelState(savedSettings.model);
        if (savedSettings.sources) setSources(savedSettings.sources);
    }

    const savedPrompts = loadFromStorage(STORAGE_KEYS.PROMPT_LIB);
    if (savedPrompts && savedPrompts.length > 0) {
        setPromptLibrary(savedPrompts);
    } else {
        setPromptLibrary(DEFAULT_PROMPTS);
        saveToStorage(STORAGE_KEYS.PROMPT_LIB, DEFAULT_PROMPTS);
    }

    const savedStudio = loadFromStorage(STORAGE_KEYS.STUDIO);
    if (savedStudio && !studioState.isGenerating) {
        setStudioState(prev => ({ ...prev, trendFocus: savedStudio.trendFocus || '', generatedContent: savedStudio.generatedContent || '' }));
    }

    const savedArchitect = loadFromStorage(STORAGE_KEYS.ARCHITECT);
    if (savedArchitect && !architectState.isGenerating) {
        setArchitectState(prev => ({ 
            ...prev, 
            premise: savedArchitect.premise || '', 
            synopsis: savedArchitect.synopsis || '',
            coverImage: savedArchitect.coverImage || '',
            outline: savedArchitect.outline || null,
            activeRecordId: savedArchitect.activeRecordId
        }));
    }
  }, []);

  // Persistence Effects
  useEffect(() => {
      if (!studioState.isGenerating && studioState.generatedContent) {
          saveToStorage(STORAGE_KEYS.STUDIO, { trendFocus: studioState.trendFocus, generatedContent: studioState.generatedContent });
      }
  }, [studioState.generatedContent, studioState.trendFocus]);

  useEffect(() => {
      if (!architectState.isGenerating && architectState.outline) {
          saveToStorage(STORAGE_KEYS.ARCHITECT, { 
              premise: architectState.premise, 
              synopsis: architectState.synopsis, 
              coverImage: architectState.coverImage,
              outline: architectState.outline,
              activeRecordId: architectState.activeRecordId 
          });
      }
  }, [architectState.outline, architectState.premise, architectState.synopsis, architectState.coverImage, architectState.activeRecordId]);

  const setModel = (newModel: string) => {
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

  const addPrompt = (p: PromptTemplate) => {
      const newLib = [...promptLibrary, p];
      setPromptLibrary(newLib);
      saveToStorage(STORAGE_KEYS.PROMPT_LIB, newLib);
  }

  const deletePrompt = (id: string) => {
      const newLib = promptLibrary.filter(p => p.id !== id);
      setPromptLibrary(newLib);
      saveToStorage(STORAGE_KEYS.PROMPT_LIB, newLib);
  }

  const completeOnboarding = () => {
    localStorage.setItem('inkflow_onboarding_seen', 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => setShowOnboarding(true);

  // --- Background Task: Studio Inspiration ---
  const startStudioGeneration = async (trendFocus: string, selectedSources: string[], targetAudience: string, lang: string) => {
      if (studioState.isGenerating) return;
      const activeSources = selectedSources.length > 0 ? selectedSources : sourcesRef.current;
      
      setStudioState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: 25, trendFocus, generatedContent: '' }));

      const timer = setInterval(() => {
          setStudioState(prev => {
              if (!prev.isGenerating) { clearInterval(timer); return prev; }
              return { ...prev, progress: Math.min(prev.progress + 2, 95), remainingTime: Math.max(1, prev.remainingTime - 1) };
          });
      }, 1000);

      try {
          const result = await generateDailyStories(trendFocus, activeSources, targetAudience, lang, modelRef.current);
          clearInterval(timer);
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, generatedContent: result, lastUpdated: Date.now() }));
          
          addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, { 
              id: Date.now().toString(), 
              timestamp: Date.now(), 
              recordType: 'inspiration',
              trendFocus: trendFocus || 'General', 
              content: result, 
              sources: activeSources 
          });
      } catch (error: any) {
          clearInterval(timer);
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, generatedContent: "Generation failed." }));
      }
  };

  // --- Background Task: Studio Story ---
  const startStoryGeneration = async (idea: string, config: GenerationConfig, lang: string) => {
      if (studioState.isGenerating) return;
      
      // Update state to show we are generating outline first
      setStudioState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: 90, generatedContent: '' }));

      // Custom progress simulation for longer task
      const timer = setInterval(() => {
          setStudioState(prev => {
              if (!prev.isGenerating) { clearInterval(timer); return prev; }
              const newProgress = prev.progress + (prev.progress < 50 ? 5 : 1); // Fast start for outline, slow for writing
              return { ...prev, progress: Math.min(newProgress, 99), remainingTime: Math.max(1, prev.remainingTime - 1) };
          });
      }, 1000);

      try {
          // Resolve prompt template
          const stylePrompt = config.styleId ? promptLibrary.find(p => p.id === config.styleId)?.content : undefined;

          const result = await generateStoryFromIdea(idea, config, lang, modelRef.current, stylePrompt);
          clearInterval(timer);
          
          const contentToShow = config.type === 'short' ? result.content : result.chapters?.[0]?.content || "Outline Generated.";
          
          setStudioState(prev => ({ 
              ...prev, 
              isGenerating: false, 
              progress: 100, 
              remainingTime: 0, 
              generatedContent: contentToShow, 
              lastUpdated: Date.now() 
          }));
          
          // Save Story Record with Outline
          addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, { 
              id: Date.now().toString(), 
              timestamp: Date.now(), 
              recordType: 'story',
              title: result.title,
              storyType: config.type,
              config: config,
              content: result.content,
              chapters: result.chapters,
              architecture: result.architecture || undefined
          });

      } catch (error: any) {
          clearInterval(timer);
          setStudioState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, generatedContent: "Story Generation failed. Check logs." }));
      }
  };

  // --- Background Task: Architect ---
  const startArchitectGeneration = async (premise: string, lang: string) => {
      if (architectState.isGenerating) return;

      setArchitectState(prev => ({ ...prev, isGenerating: true, progress: 5, remainingTime: 45, premise, outline: null, activeRecordId: undefined }));

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
              const newId = Date.now().toString();
              setArchitectState(prev => ({ 
                  ...prev, 
                  isGenerating: false, 
                  progress: 100, 
                  remainingTime: 0, 
                  outline: result.outline, 
                  synopsis: result.synopsis,
                  coverImage: '', 
                  activeRecordId: newId,
                  lastUpdated: Date.now() 
              }));
              
              addHistoryItem(STORAGE_KEYS.HISTORY_ARCHITECT, { 
                  id: newId, 
                  timestamp: Date.now(), 
                  premise, 
                  synopsis: result.synopsis,
                  outline: result.outline 
              });
          }
      } catch (error: any) {
          clearInterval(timer);
          setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, outline: null }));
      }
  };

  // --- Background Task: Lab ---
  const startLabAnalysis = async (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => {
      if (labState.isAnalyzing) return;

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
          setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 100, remainingTime: 0, analysisResult: result, lastUpdated: Date.now() }));
          addHistoryItem(STORAGE_KEYS.HISTORY_LAB, { id: Date.now().toString(), timestamp: Date.now(), inputText: text, mode, analysis: result, snippet: text.substring(0, 60) + '...' });
      } catch (error: any) {
          clearInterval(timer);
          setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 0, remainingTime: 0, analysisResult: "Failed." }));
      }
  };

  return (
    <AppContext.Provider value={{ 
        model, setModel, showOnboarding, completeOnboarding, resetOnboarding, sources, toggleSource,
        studioState, setStudioState, startStudioGeneration, startStoryGeneration,
        architectState, setArchitectState, startArchitectGeneration,
        labState, setLabState, startLabAnalysis,
        promptLibrary, addPrompt, deletePrompt
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
