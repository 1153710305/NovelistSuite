
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { manipulateText, rewriteChapterWithContext, extractContextFromTree, analyzeTrendKeywords, generateChapterContent, generateImage, generateIllustrationPrompt } from '../services/geminiService';
import { Sparkles, RefreshCw, PenLine, Wand2, Copy, Database, History, Trash2, Clock, Loader2, ChevronDown, ChevronUp, Check, BookOpen, Tag, Globe, Sliders, ChevronRight, GripHorizontal, Layout as LayoutIcon, Zap, Library, Plus, FileText, FolderOpen, Network, Pencil, Wrench, Sidebar, Image as ImageIcon, Upload, Eye } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem, updateHistoryItem } from '../services/storageService';
import { StudioRecord, AVAILABLE_SOURCES, GenerationConfig, InspirationMetadata, OutlineNode, ArchitectureMap } from '../types';
import { MindMap } from '../components/MindMap';

// --- Helper Hook for Responsive ---
const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

/**
 * Studio Component
 * The central hub for creative writing. It integrates multiple AI agents:
 * 1. Trend Analysis Agent (via Dashboard/Service)
 * 2. Inspiration Generator (Daily Gen)
 * 3. Architect Agent (8-Map System)
 * 4. Drafting Agent (Chapter Writer)
 * 5. Illustrator Agent (Cover/Scene Gen)
 */
export const Studio: React.FC = () => {
  // --- UI State: Tabs & Views ---
  const [activeTab, setActiveTab] = useState<'daily' | 'tools'>('daily');
  
  // 'quick-tools': Simple text input for quick AI rewrites
  // 'story-map': The visual mind map architecture of a novel
  // 'story-files': The folder/file view of the manuscript
  // 'story-editor': The dedicated text editor for writing chapters
  const [mainViewMode, setMainViewMode] = useState<'quick-tools' | 'story-map' | 'story-files' | 'story-editor'>('quick-tools');

  // --- Context & Global State ---
  const { model, studioState, setStudioState, startStudioGeneration, startStoryGeneration, promptLibrary, addPrompt, deletePrompt } = useApp();
  const { t, lang, getToolLabel, getProcessLabel } = useI18n();
  const isMobile = useIsMobile();

  // --- Data Management ---
  const [history, setHistory] = useState<StudioRecord[]>([]);
  // Daily Gen Sources
  const [selectedSources, setSelectedSources] = useState<string[]>(['fanqie']);
  const [targetAudience, setTargetAudience] = useState<string>('male');
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  const [isAnalyzingTrend, setIsAnalyzingTrend] = useState(false);

  // --- Tool Mode State ---
  const [editorText, setEditorText] = useState('');
  const [toolMode, setToolMode] = useState<'continue' | 'rewrite' | 'polish'>('continue');
  const [toolLoading, setToolLoading] = useState(false);
  
  // --- Editor & Prompt State ---
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [showPromptLib, setShowPromptLib] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  // --- Config Modal (for converting Idea to Story) ---
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<string>('');
  const [config, setConfig] = useState<GenerationConfig>({ type: 'short', wordCount: 2000, chapterCount: 10, wordsPerChapter: 3000, styleId: '' });

  // --- Illustration State ---
  const [showIlluModal, setShowIlluModal] = useState(false);
  const [illuMode, setIlluMode] = useState<'context' | 'prompt' | 'upload'>('context');
  const [illuPrompt, setIlluPrompt] = useState('');
  const [isGeneratingIllu, setIsGeneratingIllu] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // --- Active Context ---
  // The currently loaded story project
  const [activeStoryRecord, setActiveStoryRecord] = useState<StudioRecord | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string>('');
  
  // Navigation within a story
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  const [selectedMapType, setSelectedMapType] = useState<keyof ArchitectureMap>('world');
  const [selectedMapNode, setSelectedMapNode] = useState<OutlineNode | null>(null);
  
  // Async Operation Flags
  const [isRewriting, setIsRewriting] = useState(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);

  // Node editing form
  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeDesc, setEditNodeDesc] = useState('');

  // --- Lifecycle & Persistence ---

  const loadHistory = () => {
      setTimeout(() => {
          setHistory(getHistory<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO));
      }, 100);
  };

  useEffect(() => {
      const savedData = loadFromStorage(STORAGE_KEYS.STUDIO);
      if (savedData) {
          if (savedData.editorText) setEditorText(savedData.editorText);
      }
      loadHistory();
  }, []);

  // Poll for background generation updates (studioState global)
  useEffect(() => {
      if (!studioState.isGenerating && studioState.generatedContent) {
          loadHistory();
      }
  }, [studioState.isGenerating, studioState.generatedContent]);

  // Auto-save Quick Tool text
  useEffect(() => {
      const timeoutId = setTimeout(() => {
          const currentSaved = loadFromStorage(STORAGE_KEYS.STUDIO) || {};
          saveToStorage(STORAGE_KEYS.STUDIO, {
              ...currentSaved,
              editorText
          });
      }, 1000); 
      return () => clearTimeout(timeoutId);
  }, [editorText]);

  // Sync selected node to edit inputs
  useEffect(() => {
      if (selectedMapNode) {
          setEditNodeName(selectedMapNode.name);
          setEditNodeDesc(selectedMapNode.description || '');
      }
  }, [selectedMapNode]);

  // --- Core Handlers ---

  /**
   * Trigger the Daily Inspiration Generator.
   * Uses selected sources to find a trend, then asks AI to generate story ideas.
   */
  const handleDailyGen = () => {
    startStudioGeneration(studioState.trendFocus, selectedSources, targetAudience, lang);
  };

  /**
   * Ask AI to analyze the "New Book Lists" of selected platforms to find a hot keyword.
   */
  const handleAnalyzeTrend = async () => {
      if (selectedSources.length === 0) return;
      setIsAnalyzingTrend(true);
      const trend = await analyzeTrendKeywords(selectedSources, lang, model);
      setStudioState(prev => ({ ...prev, trendFocus: trend }));
      setIsAnalyzingTrend(false);
  }

  const handleInputChange = (val: string) => {
      setStudioState(prev => ({ ...prev, trendFocus: val }));
  }

  const toggleSourceSelection = (source: string) => {
      setSelectedSources(prev => {
          if (prev.includes(source)) return prev.filter(s => s !== source);
          return [...prev, source];
      });
  }

  const handleHistoryClick = (record: StudioRecord) => {
      setStudioState(prev => ({
          ...prev,
          trendFocus: record.trendFocus || '',
          generatedContent: record.content
      }));
  };

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, id);
      setHistory(updated);
      if (activeStoryRecord?.id === id) {
          setActiveStoryRecord(null);
          setMainViewMode('quick-tools');
      }
  };

  // --- Navigation Handlers ---

  const handleSelectQuickTools = () => {
      setMainViewMode('quick-tools');
      setActiveStoryRecord(null);
  }

  const toggleStoryExpand = (record: StudioRecord) => {
      if (expandedStoryId === record.id) {
          setExpandedStoryId('');
      } else {
          setExpandedStoryId(record.id);
          // Auto-select manuscript view if expanding
          setActiveStoryRecord(record);
          setMainViewMode('story-files'); 
      }
  };

  const handleOpenMaps = (record: StudioRecord) => {
      setActiveStoryRecord(record);
      setMainViewMode('story-map');
      if (!selectedMapType) setSelectedMapType('world');
  };

  const handleOpenManuscriptFolder = (record: StudioRecord) => {
      setActiveStoryRecord(record);
      setMainViewMode('story-files');
  };

  const handleOpenChapter = (record: StudioRecord, index: number) => {
      setActiveStoryRecord(record);
      setCurrentChapterIndex(index);
      setMainViewMode('story-editor');
  };

  // --- Map Editing ---

  const updateNodeInTree = (root: OutlineNode, targetId: string, updates: Partial<OutlineNode>): OutlineNode => {
    if (root.id === targetId) return { ...root, ...updates };
    if (root.children) return { ...root, children: root.children.map(child => updateNodeInTree(child, targetId, updates)) };
    return root;
  }

  const handleSaveNodeEdit = () => {
      if (!activeStoryRecord || !activeStoryRecord.architecture || !selectedMapNode?.id) return;
      
      const currentTree = activeStoryRecord.architecture[selectedMapType];
      const newTree = updateNodeInTree(currentTree, selectedMapNode.id, { name: editNodeName, description: editNodeDesc });
      
      const newArchitecture = { ...activeStoryRecord.architecture, [selectedMapType]: newTree };
      const updatedRecord = { ...activeStoryRecord, architecture: newArchitecture };
      
      setActiveStoryRecord(updatedRecord);
      updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { architecture: newArchitecture });
      
      setSelectedMapNode({ ...selectedMapNode, name: editNodeName, description: editNodeDesc });
  }

  /**
   * Generates draft content for a specific node in the Architecture Map.
   * CRITICAL: It extracts "World" and "Character" context from other maps to inform the draft.
   */
  const handleGenerateNodeContent = async () => {
      if (!activeStoryRecord || !selectedMapNode || !selectedMapNode.id) return;
      setIsGeneratingChapter(true);
      try {
          const context = 
            (activeStoryRecord.architecture?.world ? extractContextFromTree(activeStoryRecord.architecture.world) : '') +
            (activeStoryRecord.architecture?.character ? extractContextFromTree(activeStoryRecord.architecture.character) : '');
          
          const content = await generateChapterContent(selectedMapNode, context, lang, model);
          
          const newChapter = { title: selectedMapNode.name, content: content, nodeId: selectedMapNode.id };
          const existingChapters = activeStoryRecord.chapters || [];
          const updatedChapters = [...existingChapters, newChapter];
          
          const updatedRecord = { ...activeStoryRecord, chapters: updatedChapters };
          setActiveStoryRecord(updatedRecord);
          updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: updatedChapters });
          
          setCurrentChapterIndex(updatedChapters.length - 1);
          setMainViewMode('story-editor');

      } catch (e) {
          console.error(e);
          alert(t('common.errorDesc'));
      } finally {
          setIsGeneratingChapter(false);
      }
  }

  /**
   * Rewrites the current chapter in the Editor.
   * It re-injects the current architecture context to ensure the rewrite stays consistent with the world settings.
   */
  const handleRewriteWithContext = async () => {
      if (!activeStoryRecord || currentChapterIndex === null) return;
      
      const currentChapter = activeStoryRecord.chapters?.[currentChapterIndex];
      const contentToRewrite = currentChapter ? currentChapter.content : activeStoryRecord.content;
      
      if (!contentToRewrite) return;

      setIsRewriting(true);
      try {
          const freshContext = 
             (activeStoryRecord.architecture?.world ? extractContextFromTree(activeStoryRecord.architecture.world) : '') +
             (activeStoryRecord.architecture?.character ? extractContextFromTree(activeStoryRecord.architecture.character) : '');

          const promptTemplate = selectedPromptId ? promptLibrary.find(p => p.id === selectedPromptId)?.content : undefined;

          const result = await rewriteChapterWithContext(contentToRewrite, freshContext, lang, model, promptTemplate);
          
          let newChapters = activeStoryRecord.chapters ? [...activeStoryRecord.chapters] : [];
          if (newChapters[currentChapterIndex]) {
              newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: result };
          }

          const updatedRecord = { 
              ...activeStoryRecord, 
              chapters: newChapters,
              content: activeStoryRecord.storyType === 'short' ? result : activeStoryRecord.content
          };

          setActiveStoryRecord(updatedRecord);
          updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, updatedRecord);
          
      } catch (e) {
          alert("Rewrite failed. Check console.");
      } finally {
          setIsRewriting(false);
      }
  }

  // --- Illustration Handling ---

  const insertTextAtCursor = (textToInsert: string) => {
        if (!editorRef.current || !activeStoryRecord) return;
        
        const textarea = editorRef.current;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        
        // Update State
        const newChapters = [...(activeStoryRecord.chapters || [])];
        if (currentChapterIndex !== null && newChapters[currentChapterIndex]) {
            newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: newText };
            const updated = { ...activeStoryRecord, chapters: newChapters };
            setActiveStoryRecord(updated);
            updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: newChapters });
        } else if (activeStoryRecord.content) {
             const updated = { ...activeStoryRecord, content: newText };
             setActiveStoryRecord(updated);
             updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { content: newText });
        }
        
        // Restore cursor
        setTimeout(() => {
            textarea.selectionStart = start + textToInsert.length;
            textarea.selectionEnd = start + textToInsert.length;
            textarea.focus();
        }, 0);
  };

  const handleGenerateIllustration = async () => {
      if (!activeStoryRecord) return;
      setIsGeneratingIllu(true);
      
      try {
          let promptToUse = illuPrompt;

          if (illuMode === 'context') {
             // Extract context around cursor
             const textarea = editorRef.current;
             if (textarea) {
                 const cursor = textarea.selectionStart;
                 const text = textarea.value;
                 // Get 1000 chars around cursor
                 const start = Math.max(0, cursor - 1500);
                 const end = Math.min(text.length, cursor + 500);
                 const contextText = text.substring(start, end);
                 
                 // Generate Prompt from context
                 promptToUse = await generateIllustrationPrompt(contextText, lang, model);
             } else {
                 throw new Error("Editor not found");
             }
          }

          if (!promptToUse) throw new Error("No prompt available");

          // Generate Image
          const imageBase64 = await generateImage(promptToUse, 'gemini-2.5-flash-image', '4:3');
          
          // Insert Markdown
          const insertString = `\n\n![Illustration](${imageBase64})\n*${promptToUse}*\n\n`;
          insertTextAtCursor(insertString);
          setShowIlluModal(false);

      } catch (e) {
          console.error(e);
          alert(t('common.errorDesc'));
      } finally {
          setIsGeneratingIllu(false);
      }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onloadend = () => {
          const base64 = reader.result as string;
          // Simple insert
          const insertString = `\n\n![Uploaded Illustration](${base64})\n\n`;
          insertTextAtCursor(insertString);
          setShowIlluModal(false);
      };
      reader.readAsDataURL(file);
  };

  // --- Parser for Inspiration Cards ---
  const parseInspirations = (text: string) => {
      if (!text) return [];
      const blocks = text.split(/### \d+\./g).filter(p => p.trim().length > 0);
      return blocks.map((block, index) => {
          const lines = block.split('\n').map(l => l.trim()).filter(l => l);
          const title = lines[0];
          const getVal = (key: string) => {
              const line = lines.find(l => l.toLowerCase().startsWith(key.toLowerCase() + ':') || l.toLowerCase().startsWith('**' + key.toLowerCase() + '**:'));
              return line ? line.split(':')[1].trim() : '';
          };
          let metadata: InspirationMetadata = {
             source: getVal('Source'), 
             gender: getVal('Gender'), 
             majorCategory: getVal('Major Category') || getVal('Category'), 
             theme: getVal('Theme'),
             characterArchetype: getVal('Character Archetype'),
             plotType: getVal('Plot Type'),
             trope: getVal('Trope'), 
             goldenFinger: getVal('Golden Finger'), 
             coolSystem: getVal('Cool Point System'), 
             memoryAnchor: getVal('Memory Anchor'), 
             coolPoint: getVal('Cool Point'), 
             burstPoint: getVal('Burst Point')
          };
          const synopsis = getVal('Synopsis');
          return { id: index, title, metadata, synopsis, raw: "### " + (index+1) + "." + block };
      });
  }

  const inspirationCards = parseInspirations(studioState.generatedContent);
  const inspirationHistory = history.filter(h => h.recordType === 'inspiration');
  const storyHistory = history.filter(h => h.recordType === 'story');

  const openConfigModal = (ideaText: string) => {
      setSelectedIdea(ideaText);
      setShowConfigModal(true);
  }

  const confirmGenerateStory = () => {
      setShowConfigModal(false);
      startStoryGeneration(selectedIdea, config, lang);
      setActiveTab('tools'); // Switch to Tools tab to see progress/result
  }

  const handleAddPrompt = () => {
      if(!newPromptName || !newPromptContent) return;
      addPrompt({ id: Date.now().toString(), name: newPromptName, content: newPromptContent, tags: ['custom'] });
      setNewPromptName('');
      setNewPromptContent('');
  };

  const formatDate = (ts: number) => {
      return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const handleToolAction = async () => {
      if(!editorText) return;
      setToolLoading(true);
      try {
        const result = await manipulateText(editorText, toolMode, lang, model);
        setEditorText(result); // Update directly in editor
      } catch (e) {
          console.error(e);
      } finally {
          setToolLoading(false);
      }
  };

  // --- RENDER HELPERS ---

  const renderSidebar = () => (
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
          <div className="p-4 border-b border-slate-200">
              <button 
                  onClick={handleSelectQuickTools}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${mainViewMode === 'quick-tools' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300'}`}
              >
                  <Wrench size={18} />
                  <span className="font-bold text-sm">Quick AI Tools</span>
              </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
              <div className="text-xs font-bold text-slate-400 uppercase mb-2 px-2 mt-2">{t('studio.historyTitle')}</div>
              <div className="space-y-1">
                {storyHistory.length === 0 ? (
                    <div className="text-center text-slate-400 text-xs mt-4 italic">{t('common.noHistory')}</div>
                ) : (
                    storyHistory.map(item => (
                        <div key={item.id} className="bg-white rounded border border-slate-200 overflow-hidden">
                            <div 
                                onClick={() => toggleStoryExpand(item)} 
                                className={`p-3 cursor-pointer flex justify-between items-center hover:bg-slate-50 ${activeStoryRecord?.id === item.id ? 'bg-teal-50 border-b border-teal-100' : ''}`}
                            >
                                <div className="w-4/5 flex items-center gap-2">
                                    <div className="text-slate-400 flex-shrink-0">{expandedStoryId === item.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</div>
                                    <div className="min-w-0">
                                        <div className="text-xs font-bold text-slate-700 truncate">{item.title || 'Untitled'}</div>
                                        <div className="text-[10px] text-slate-400">{formatDate(item.timestamp)}</div>
                                    </div>
                                </div>
                                <button onClick={(e) => handleDeleteHistory(e, item.id)} className="text-slate-300 hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                            </div>

                            {/* Expanded Sub-Menu */}
                            {expandedStoryId === item.id && (
                                <div className="bg-slate-50/50 pl-0 py-1 space-y-0.5 border-t border-slate-100">
                                     <button 
                                        onClick={() => handleOpenMaps(item)} 
                                        className={`w-full text-left px-8 py-2 text-xs flex items-center gap-2 border-l-4 ${mainViewMode === 'story-map' && activeStoryRecord?.id === item.id ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
                                     >
                                         <Network size={14} /> {t('studio.tree.maps')}
                                     </button>
                                     <button 
                                        onClick={() => handleOpenManuscriptFolder(item)} 
                                        className={`w-full text-left px-8 py-2 text-xs flex items-center gap-2 border-l-4 ${mainViewMode === 'story-files' && activeStoryRecord?.id === item.id ? 'border-teal-500 bg-teal-50 text-teal-700 font-medium' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
                                     >
                                         <FolderOpen size={14} /> {t('studio.tree.manuscript')}
                                     </button>
                                     
                                     {/* Inline Chapters */}
                                     {item.chapters && item.chapters.length > 0 && (
                                         <div className="mt-1 pb-1">
                                             {item.chapters.map((chap, idx) => (
                                                 <button 
                                                    key={idx}
                                                    onClick={() => handleOpenChapter(item, idx)}
                                                    className={`w-full text-left pl-12 pr-2 py-1.5 text-[11px] truncate hover:text-teal-600 ${currentChapterIndex === idx && mainViewMode === 'story-editor' && activeStoryRecord?.id === item.id ? 'text-teal-700 font-bold' : 'text-slate-500'}`}
                                                 >
                                                     {chap.title}
                                                 </button>
                                             ))}
                                         </div>
                                     )}
                                </div>
                            )}
                        </div>
                    ))
                )}
              </div>
          </div>
      </div>
  );

  const renderQuickTools = () => (
      <div className="flex-1 p-8 bg-slate-50 flex flex-col h-full">
          <div className="max-w-4xl mx-auto w-full bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col h-full overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-white flex justify-between items-center">
                  <h3 className="font-bold text-slate-700 flex items-center gap-2"><Wrench size={18} /> Quick AI Tools</h3>
                  <div className="flex bg-slate-100 p-1 rounded-lg">
                    {['continue', 'rewrite', 'polish'].map(m => (
                        <button key={m} onClick={() => setToolMode(m as any)} className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 transition-all ${toolMode === m ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                            {m==='continue'?<PenLine size={12}/>:m==='rewrite'?<RefreshCw size={12}/>:<Wand2 size={12}/>} {getToolLabel(m)}
                        </button>
                    ))}
                  </div>
              </div>
              <textarea 
                  value={editorText} 
                  onChange={(e) => setEditorText(e.target.value)} 
                  placeholder={t('studio.toolPlaceholder')} 
                  className="flex-1 p-6 resize-none focus:outline-none text-slate-700 leading-relaxed font-mono text-sm"
              />
              <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                  <button onClick={handleToolAction} disabled={toolLoading || !editorText} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-900/20">
                      {toolLoading ? <><Loader2 className="animate-spin" size={16}/>{t('studio.processing')}</> : <>{getProcessLabel(toolMode)} <Sparkles size={16} /></>}
                  </button>
              </div>
          </div>
      </div>
  );

  const renderStoryFiles = () => (
      <div className="flex-1 p-8 bg-slate-50 h-full overflow-y-auto">
          <div className="max-w-5xl mx-auto">
              <div className="flex items-center gap-3 mb-6">
                  <FolderOpen className="text-teal-600" size={28} />
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800">{activeStoryRecord?.title || 'Untitled Story'}</h2>
                      <p className="text-slate-500 text-sm">Manuscript Folder • {activeStoryRecord?.chapters?.length || 0} Files</p>
                  </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {activeStoryRecord?.chapters?.map((chap, idx) => (
                      <div key={idx} onClick={() => handleOpenChapter(activeStoryRecord!, idx)} className="group cursor-pointer flex flex-col items-center p-6 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all text-center relative">
                          <div className="w-16 h-16 mb-4 text-teal-500 bg-teal-50 rounded-2xl flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors shadow-sm">
                              <FileText size={32} />
                          </div>
                          <span className="text-sm font-bold text-slate-700 line-clamp-2 mb-1 group-hover:text-teal-700">{chap.title}</span>
                          <span className="text-xs text-slate-400">{chap.content.length} chars</span>
                      </div>
                  ))}
                  {/* Empty State / Add New Placeholder */}
                  <div className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all cursor-not-allowed opacity-50">
                      <div className="w-16 h-16 mb-4 text-slate-300 rounded-2xl flex items-center justify-center">
                          <Plus size={32} />
                      </div>
                      <span className="text-sm font-bold text-slate-400">New Chapter</span>
                      <span className="text-[10px] text-slate-400 mt-1">(Generate via Map)</span>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderStoryEditor = () => (
      <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
          
          {/* Illustration Modal */}
          {showIlluModal && (
            <div className="absolute top-16 right-6 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="p-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                    <h3 className="font-bold text-xs text-slate-700 flex items-center gap-2"><ImageIcon size={14}/> {t('studio.editor.insertIllu')}</h3>
                    <button onClick={() => setShowIlluModal(false)}><span className="text-lg">&times;</span></button>
                </div>
                <div className="p-4">
                    <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                        <button onClick={() => setIlluMode('context')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${illuMode==='context'?'bg-white shadow text-teal-700':'text-slate-500'}`}>{t('studio.editor.illuContext')}</button>
                        <button onClick={() => setIlluMode('prompt')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${illuMode==='prompt'?'bg-white shadow text-teal-700':'text-slate-500'}`}>{t('studio.editor.illuPrompt')}</button>
                        <button onClick={() => setIlluMode('upload')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${illuMode==='upload'?'bg-white shadow text-teal-700':'text-slate-500'}`}>{t('studio.editor.illuUpload')}</button>
                    </div>

                    {illuMode === 'context' && (
                        <div className="text-xs text-slate-500 mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                            <Sparkles size={14} className="inline mr-1 text-blue-500"/>
                            AI will analyze the text around your cursor to generate a relevant scene illustration.
                        </div>
                    )}

                    {illuMode === 'prompt' && (
                        <textarea 
                            value={illuPrompt} 
                            onChange={e => setIlluPrompt(e.target.value)} 
                            placeholder="Describe the scene..."
                            className="w-full p-2 border rounded text-xs h-20 mb-4 resize-none"
                        />
                    )}

                    {illuMode === 'upload' && (
                         <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative mb-4">
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                            <Upload size={24} className="mx-auto text-slate-400 mb-2"/>
                            <span className="text-xs text-slate-500">Click to upload image</span>
                         </div>
                    )}

                    {illuMode !== 'upload' && (
                        <button 
                            onClick={handleGenerateIllustration} 
                            disabled={isGeneratingIllu}
                            className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isGeneratingIllu ? <Loader2 className="animate-spin" size={14}/> : <ImageIcon size={14}/>}
                            {t('studio.editor.generateIllu')}
                        </button>
                    )}
                </div>
            </div>
          )}

          {/* Editor Toolbar */}
          <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
              <div className="flex items-center gap-2 text-sm text-slate-500">
                  <span className="font-bold text-slate-800">{activeStoryRecord?.title}</span>
                  <ChevronRight size={14} />
                  <span>{activeStoryRecord?.chapters?.[currentChapterIndex || 0]?.title}</span>
              </div>
              
              <div className="flex items-center gap-2">
                    {/* Illustration Button */}
                    <button 
                        onClick={() => setShowIlluModal(!showIlluModal)}
                        className={`p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition-colors relative ${showIlluModal ? 'bg-teal-50 text-teal-600' : ''}`}
                        title={t('studio.editor.insertIllu')}
                    >
                        <ImageIcon size={18} />
                    </button>
                    <div className="h-6 w-px bg-slate-200 mx-2"></div>

                    <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1">
                        <span className="text-[10px] text-slate-400 mr-2 uppercase font-bold">{t('studio.editor.aiModify')}</span>
                        <select 
                            value={selectedPromptId} 
                            onChange={(e) => setSelectedPromptId(e.target.value)}
                            className="text-xs bg-transparent border-none focus:ring-0 text-slate-700 w-32 cursor-pointer"
                        >
                            <option value="">{t('studio.editor.selectPrompt')}</option>
                            {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                    <button 
                        onClick={handleRewriteWithContext} 
                        disabled={isRewriting}
                        className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center gap-1 shadow-sm disabled:opacity-50 transition-colors"
                    >
                        {isRewriting ? <Loader2 className="animate-spin" size={14}/> : <Pencil size={14}/>}
                        {t('common.apply')}
                    </button>
              </div>
          </div>

          {/* Editor Area */}
          <div className="flex-1 overflow-y-auto p-8">
              <div className="max-w-3xl mx-auto bg-white min-h-full shadow-sm border border-slate-200 p-12 rounded-xl">
                    <textarea 
                        ref={editorRef}
                        className="w-full h-full min-h-[600px] resize-none focus:outline-none text-slate-800 leading-loose text-lg font-serif bg-transparent placeholder-slate-300"
                        value={activeStoryRecord?.chapters?.[currentChapterIndex || 0]?.content || activeStoryRecord?.content || ''}
                        onChange={(e) => {
                            if (!activeStoryRecord) return;
                            const newContent = e.target.value;
                            const newChapters = [...(activeStoryRecord.chapters || [])];
                            if (currentChapterIndex !== null && newChapters[currentChapterIndex]) {
                                newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: newContent };
                                const updated = { ...activeStoryRecord, chapters: newChapters };
                                setActiveStoryRecord(updated);
                                updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: newChapters });
                            }
                        }}
                        onSelect={() => {
                            // Can track cursor position here if needed
                        }}
                        placeholder="Start writing..."
                    />
              </div>
          </div>
      </div>
  );

  const renderStoryMap = () => {
      const mapTypes: (keyof ArchitectureMap)[] = ['world', 'system', 'mission', 'character', 'anchor', 'structure', 'events', 'chapters'];
      
      return (
          <div className="flex-1 flex h-full bg-slate-50 overflow-hidden">
              {/* Main Map View */}
              <div className="flex-1 flex flex-col relative">
                  {/* Map Controls */}
                  <div className="h-12 border-b border-slate-200 bg-white flex items-center px-4 gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
                     {mapTypes.map(type => (
                         <button 
                            key={type} 
                            onClick={() => { setSelectedMapType(type); setSelectedMapNode(null); }}
                            className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${selectedMapType === type ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}
                         >
                            {t(`studio.maps.${type}`)}
                         </button>
                     ))}
                  </div>
                  
                  {/* Map Canvas */}
                  <div className="flex-1 relative bg-slate-50">
                     {activeStoryRecord && activeStoryRecord.architecture && activeStoryRecord.architecture[selectedMapType] ? (
                         <MindMap data={activeStoryRecord.architecture[selectedMapType]} onNodeClick={setSelectedMapNode} />
                     ) : (
                         <div className="flex items-center justify-center h-full text-slate-400 italic">No Map Data</div>
                     )}
                  </div>
              </div>

              {/* Node Inspector Panel (Right Side Overlay/Split) */}
              <div className="w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col z-10 transition-transform">
                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <h3 className="font-bold text-slate-700 text-sm">Node Inspector</h3>
                      {selectedMapNode && <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase font-bold">{selectedMapNode.type}</span>}
                  </div>
                  
                  {selectedMapNode ? (
                      <div className="p-4 flex-1 overflow-y-auto space-y-4">
                           <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase">Name</label>
                               <input 
                                    value={editNodeName} 
                                    onChange={e => setEditNodeName(e.target.value)} 
                                    className="w-full p-2 border border-slate-200 rounded text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none" 
                                />
                           </div>
                           <div className="space-y-1">
                               <label className="text-[10px] font-bold text-slate-400 uppercase">Description</label>
                               <textarea 
                                    value={editNodeDesc} 
                                    onChange={e => setEditNodeDesc(e.target.value)} 
                                    rows={6} 
                                    className="w-full p-2 border border-slate-200 rounded text-xs leading-relaxed focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none" 
                                />
                           </div>
                           
                           <div className="flex gap-2 pt-2">
                               <button onClick={handleSaveNodeEdit} className="flex-1 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800">Save Changes</button>
                           </div>

                           <div className="border-t border-slate-100 pt-4 mt-2">
                                {(selectedMapNode.type === 'chapter' || selectedMapType === 'chapters') && (
                                     <button 
                                        onClick={handleGenerateNodeContent} 
                                        disabled={isGeneratingChapter}
                                        className="w-full py-3 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                                     >
                                        {isGeneratingChapter ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>}
                                        Generate Draft
                                     </button>
                                 )}
                           </div>
                      </div>
                  ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center">
                          <Network size={48} className="opacity-20 mb-4" />
                          <p className="text-sm">Select a node from the map to view details or generate content.</p>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="flex flex-col h-full p-0 md:p-4 max-w-full mx-auto relative overflow-hidden bg-slate-100">
      {/* Config Modal */}
      {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">{t('studio.config.title')}</h3>
                      <button onClick={() => setShowConfigModal(false)}><span className="text-xl">&times;</span></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.config.type')}</label>
                          <div className="flex gap-2">
                              <button onClick={() => setConfig({...config, type: 'short'})} className={`flex-1 py-2 rounded border text-sm ${config.type==='short' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200'}`}>{t('studio.config.short')}</button>
                              <button onClick={() => setConfig({...config, type: 'long'})} className={`flex-1 py-2 rounded border text-sm ${config.type==='long' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200'}`}>{t('studio.config.long')}</button>
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.config.style')}</label>
                          <select value={config.styleId} onChange={e => setConfig({...config, styleId: e.target.value})} className="w-full p-2 border rounded text-sm bg-white">
                              <option value="">Default</option>
                              {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
                      <button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded">{t('common.cancel')}</button>
                      <button onClick={confirmGenerateStory} className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700">{t('studio.genStory')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Prompt Library Modal */}
      {showPromptLib && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">{t('architect.prompts.title')}</h3>
                      <button onClick={() => setShowPromptLib(false)}><span className="text-xl">&times;</span></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                      {promptLibrary.map(p => (
                          <div key={p.id} className="p-3 border rounded-lg hover:bg-slate-50 group relative">
                              <div className="font-bold text-sm text-slate-800">{p.name}</div>
                              <div className="text-xs text-slate-600 mt-1 line-clamp-2">{p.content}</div>
                              <button onClick={() => deletePrompt(p.id)} className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={14}/></button>
                          </div>
                      ))}
                      {promptLibrary.length === 0 && <div className="text-center text-slate-400 italic">No prompts saved.</div>}
                  </div>
                  <div className="p-4 border-t bg-slate-50 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-slate-500">{t('architect.prompts.add')}</h4>
                      <input value={newPromptName} onChange={e => setNewPromptName(e.target.value)} placeholder={t('architect.prompts.name')} className="w-full p-2 border rounded text-sm" />
                      <textarea value={newPromptContent} onChange={e => setNewPromptContent(e.target.value)} placeholder={t('architect.prompts.instruction')} className="w-full p-2 border rounded text-sm h-20 resize-none" />
                      <button onClick={handleAddPrompt} className="w-full py-2 bg-slate-900 text-white rounded hover:bg-slate-800 flex items-center justify-center gap-2"><Plus size={14}/> {t('architect.prompts.save')}</button>
                  </div>
              </div>
          </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col bg-white md:rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          {/* Top Tabs */}
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white flex-shrink-0">
              <div className="flex gap-6 h-full">
                <button 
                    onClick={() => setActiveTab('daily')} 
                    className={`h-full border-b-2 font-medium text-sm transition-colors px-1 ${activeTab === 'daily' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t('studio.tabDaily')}
                </button>
                <button 
                    onClick={() => setActiveTab('tools')} 
                    className={`h-full border-b-2 font-medium text-sm transition-colors px-1 ${activeTab === 'tools' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    {t('studio.tabTools')}
                </button>
              </div>
              <button onClick={() => setShowPromptLib(true)} className="text-slate-500 hover:text-teal-600 flex items-center gap-1 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 transition-colors">
                  <Library size={14}/> {t('studio.promptLib')}
              </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden relative">
              
              {activeTab === 'daily' && (
                 <div className="absolute inset-0 flex flex-col md:flex-row gap-0">
                    {/* DAILY LEFT */}
                    <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 p-6 flex flex-col gap-4 overflow-y-auto">
                        {/* Control Panel */}
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm"><Sparkles className="text-yellow-500" size={16}/> {t('studio.dailyGenTitle')}</h3>
                            
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t('studio.targetAudience')}</label>
                            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                                <button onClick={() => setTargetAudience('male')} className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${targetAudience === 'male' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {t('studio.maleFreq')}
                                </button>
                                <button onClick={() => setTargetAudience('female')} className={`flex-1 py-1.5 rounded text-xs font-medium transition-all ${targetAudience === 'female' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                                    {t('studio.femaleFreq')}
                                </button>
                            </div>

                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t('studio.trendLabel')}</label>
                            <div className="flex gap-2 mb-4">
                                <input type="text" value={studioState.trendFocus} onChange={(e) => handleInputChange(e.target.value)} placeholder={t('studio.trendPlaceholder')} className="flex-1 p-2 text-xs border border-slate-300 rounded focus:ring-2 focus:ring-teal-500 focus:outline-none" disabled={studioState.isGenerating} />
                                <button onClick={handleAnalyzeTrend} disabled={isAnalyzingTrend || selectedSources.length === 0} className="p-2 bg-indigo-50 text-indigo-600 rounded hover:bg-indigo-100 disabled:opacity-50" title={t('studio.analyzeTrend')}>
                                    {isAnalyzingTrend ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>}
                                </button>
                            </div>
                            
                            <div className="mb-4 border border-slate-200 rounded-lg overflow-hidden">
                                <button onClick={() => setShowSourceSelector(!showSourceSelector)} className="w-full p-2.5 bg-slate-50 flex items-center justify-between text-xs text-slate-600 hover:bg-slate-100 transition-colors">
                                    <div className="flex items-center gap-2"><Database size={12} /><span>{selectedSources.length} {t('sources.title')}</span></div>
                                    {showSourceSelector ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                                </button>
                                {showSourceSelector && (
                                    <div className="p-2 bg-white grid grid-cols-2 gap-1 max-h-48 overflow-y-auto shadow-inner border-t border-slate-100">
                                        {AVAILABLE_SOURCES.map(source => (
                                            <button key={source} onClick={() => toggleSourceSelection(source)} className={`text-[10px] px-2 py-1.5 rounded flex items-center justify-between group transition-all ${selectedSources.includes(source) ? 'bg-teal-50 text-teal-700 font-bold' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                                                {t(`sources.${source}`)}
                                                {selectedSources.includes(source) && <Check size={10} />}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <button onClick={handleDailyGen} disabled={studioState.isGenerating || selectedSources.length === 0} className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2 transition-transform active:scale-95">
                                {studioState.isGenerating ? <><Loader2 className="animate-spin" size={14}/> {t('studio.generating')}</> : t('studio.generateBtn')}
                            </button>
                        </div>

                        {/* Inspiration History */}
                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto shadow-sm">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><History size={12} /> {t('studio.historyTitle')}</h4>
                            </div>
                            {inspirationHistory.length === 0 ? <div className="text-center text-slate-400 text-xs mt-4">{t('common.noHistory')}</div> : (
                                <div className="space-y-2">
                                    {inspirationHistory.map(item => (
                                        <div key={item.id} onClick={() => handleHistoryClick(item)} className="bg-slate-50 rounded-lg border border-slate-100 p-3 cursor-pointer hover:bg-white hover:shadow-sm hover:border-teal-200 transition-all flex justify-between items-center group">
                                            <div className="w-4/5">
                                                <div className="text-xs font-bold text-slate-700 truncate mb-1">{item.trendFocus}</div>
                                                <div className="text-[10px] text-slate-400 flex items-center gap-1"><Clock size={10} /> {formatDate(item.timestamp)}</div>
                                            </div>
                                            <button onClick={(e) => handleDeleteHistory(e, item.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    {/* DAILY RIGHT */}
                    <div className="flex-1 bg-white p-8 overflow-y-auto relative h-full">
                        {studioState.isGenerating && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10 backdrop-blur-sm">
                                <div className="w-64">
                                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2"><span>{t('studio.generatingBackground')}</span><span>{Math.round(studioState.progress)}%</span></div>
                                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden"><div className="bg-teal-500 h-full rounded-full transition-all duration-500 ease-out" style={{ width: `${studioState.progress}%` }}></div></div>
                                    <div className="flex justify-between mt-2"><p className="text-xs text-slate-400">{t('studio.backgroundTip')}</p><p className="text-xs font-mono text-teal-600">{t('common.remainingTime').replace('{time}', studioState.remainingTime.toString())}</p></div>
                                </div>
                            </div>
                        )}

                        {studioState.generatedContent ? (
                             <div className="grid grid-cols-1 gap-8 pb-10 max-w-4xl mx-auto">
                                {inspirationCards.map((card) => (
                                    <div key={card.id} className="p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all group">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">{card.title}</h3>
                                        
                                        {card.metadata && (
                                            <div className="flex flex-wrap gap-2 mb-6">
                                                {card.metadata.source && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-600 flex items-center gap-1"><Globe size={10}/> {card.metadata.source}</span>}
                                                {card.metadata.gender && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-pink-50 border border-pink-100 text-pink-700">{card.metadata.gender}</span>}
                                                {card.metadata.majorCategory && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-indigo-50 border border-indigo-100 text-indigo-700">{card.metadata.majorCategory}</span>}
                                                {card.metadata.trope && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-orange-50 border border-orange-100 text-orange-700 flex items-center gap-1"><Tag size={10}/> {card.metadata.trope}</span>}
                                            </div>
                                        )}
                                        
                                        {/* New Metadata Grid */}
                                        {card.metadata && (
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                                                {card.metadata.theme && (
                                                    <div className="px-3 py-2 bg-slate-100 rounded text-xs">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('studio.meta.theme')}</span>
                                                        <span className="font-medium text-slate-700">{card.metadata.theme}</span>
                                                    </div>
                                                )}
                                                {card.metadata.characterArchetype && (
                                                    <div className="px-3 py-2 bg-slate-100 rounded text-xs">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('studio.meta.character')}</span>
                                                        <span className="font-medium text-slate-700">{card.metadata.characterArchetype}</span>
                                                    </div>
                                                )}
                                                {card.metadata.plotType && (
                                                    <div className="px-3 py-2 bg-slate-100 rounded text-xs">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase block">{t('studio.meta.plot')}</span>
                                                        <span className="font-medium text-slate-700">{card.metadata.plotType}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {card.metadata && (
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                {card.metadata.goldenFinger && (
                                                    <div className="bg-amber-50/50 p-3 rounded-lg border border-amber-100">
                                                        <span className="text-[10px] font-bold text-amber-600 uppercase block mb-1">{t('studio.meta.goldenFinger')}</span>
                                                        <p className="text-sm text-slate-800 leading-snug">{card.metadata.goldenFinger}</p>
                                                    </div>
                                                )}
                                                {card.metadata.coolSystem && (
                                                    <div className="bg-cyan-50/50 p-3 rounded-lg border border-cyan-100">
                                                        <span className="text-[10px] font-bold text-cyan-600 uppercase block mb-1">{t('studio.meta.coolSystem')}</span>
                                                        <p className="text-sm text-slate-800 leading-snug">{card.metadata.coolSystem}</p>
                                                    </div>
                                                )}
                                                {card.metadata.memoryAnchor && (
                                                    <div className="bg-violet-50/50 p-3 rounded-lg border border-violet-100">
                                                        <span className="text-[10px] font-bold text-violet-600 uppercase block mb-1">{t('studio.meta.memoryAnchor')}</span>
                                                        <p className="text-sm text-slate-800 leading-snug">{card.metadata.memoryAnchor}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {card.metadata && (card.metadata.coolPoint || card.metadata.burstPoint) && (
                                            <div className="grid grid-cols-2 gap-4 mb-6">
                                                {card.metadata.coolPoint && (
                                                    <div className="bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                                        <span className="text-[10px] font-bold text-emerald-600 uppercase block mb-1">{t('studio.meta.coolPoint')}</span>
                                                        <p className="text-sm text-slate-800 leading-snug">{card.metadata.coolPoint}</p>
                                                    </div>
                                                )}
                                                {card.metadata.burstPoint && (
                                                    <div className="bg-red-50/50 p-3 rounded-lg border border-red-100">
                                                        <span className="text-[10px] font-bold text-red-600 uppercase block mb-1">{t('studio.meta.burstPoint')}</span>
                                                        <p className="text-sm text-slate-800 leading-snug">{card.metadata.burstPoint}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {card.synopsis && (
                                            <div className="bg-white p-4 rounded-lg border border-slate-100 mb-6 shadow-sm">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-2">{t('studio.meta.synopsis')}</span>
                                                <p className="text-sm text-slate-600 leading-loose whitespace-pre-wrap font-serif">{card.synopsis}</p>
                                            </div>
                                        )}

                                        <button 
                                            onClick={() => openConfigModal(card.raw)}
                                            className="w-full py-3 bg-white border border-teal-200 text-teal-700 rounded-lg text-sm font-bold hover:bg-teal-50 flex items-center justify-center gap-2 group-hover:border-teal-400 transition-colors"
                                        >
                                            <BookOpen size={16} /> {t('studio.genStory')}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex items-center justify-center text-slate-400 italic flex-col gap-4">
                                <Sparkles size={48} className="opacity-10" />
                                <p>{t('studio.emptyDaily')}</p>
                            </div>
                        )}
                    </div>
                 </div>
              )}

              {activeTab === 'tools' && (
                  <div className="absolute inset-0 flex">
                      {/* 2-Column Layout */}
                      {renderSidebar()}
                      
                      {mainViewMode === 'quick-tools' && renderQuickTools()}
                      {mainViewMode === 'story-files' && renderStoryFiles()}
                      {mainViewMode === 'story-editor' && renderStoryEditor()}
                      {mainViewMode === 'story-map' && renderStoryMap()}
                  </div>
              )}
          </div>
      </div>
    </div>
  );
};
