
/**
 * @file pages/Studio.tsx
 * @description 写作工作室 (Studio) 的核心页面组件。
 * 
 * ## 主要功能
 * 1. **灵感生成**: 集成 Google Trends 和 Gemini 2.5 生成每日灵感。
 * 2. **多视图切换**: 支持快速工具、思维导图、文件列表、沉浸式编辑器四种视图。
 * 3. **AI 协作**: 实现了 8-Map 架构生成、章节撰写、重写润色、插图生成等功能。
 * 4. **数据管理**: 负责项目的导入导出及提示词库管理。
 */

import React, { useState, useEffect } from 'react';
import { 
    Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp, BookOpen, Tag, Globe, Network, Wrench, RefreshCcw, CheckSquare, Square, Zap as ZapIcon, AlertTriangle, Hash, FileText, History, Trash2, PenLine, Wand2 
} from 'lucide-react';

import { 
    manipulateText, rewriteChapterWithContext, extractContextFromTree, analyzeTrendKeywords, generateChapterContent, generateImage, generateIllustrationPrompt, generateNovelArchitecture, generateStoryFromIdea, regenerateSingleMap, generateDailyStories 
} from '../services/geminiService';

import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { 
    saveToStorage, loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem, updateHistoryItem, addHistoryItem 
} from '../services/storageService';

import { 
    StudioRecord, AVAILABLE_SOURCES, GenerationConfig, OutlineNode, ArchitectureMap 
} from '../types';

import { MindMap } from '../components/MindMap';
import { StudioSidebar } from '../components/studio/StudioSidebar';
import { StudioEditor } from '../components/studio/StudioEditor';
import { StudioFileList } from '../components/studio/StudioFileList';
import { DataManagerModal } from '../components/DataManagerModal';
import { PromptLibraryModal } from '../components/PromptLibraryModal';
import { InspirationRules } from '../services/promptService';

declare global { interface Window { JSZip: any; } }

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

const serializeMapToText = (node: OutlineNode, depth: number = 0): string => {
    const indent = "  ".repeat(depth);
    let text = `${indent}- [${node.type}] ${node.name}`;
    if (node.description) text += `: ${node.description}`;
    text += "\n";
    if (node.children) {
        node.children.forEach(child => {
            text += serializeMapToText(child, depth + 1);
        });
    }
    return text;
};

export const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'tools'>('daily');
  const [mainViewMode, setMainViewMode] = useState<'quick-tools' | 'story-map' | 'story-files' | 'story-editor'>('quick-tools');

  const { model, studioState, setStudioState, startBackgroundTask, updateTaskProgress, promptLibrary, activeTasks, globalPersona } = useApp();
  const { t, lang, getToolLabel, getProcessLabel } = useI18n();
  const isMobile = useIsMobile();

  const [history, setHistory] = useState<StudioRecord[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(['fanqie']);
  const [targetAudience, setTargetAudience] = useState<string>('male');
  const [showSourceSelector, setShowSourceSelector] = useState(false);
  
  // 灵感配置弹窗状态
  const [showInspirationConfig, setShowInspirationConfig] = useState(false);
  const [inspirationRules, setInspirationRules] = useState<InspirationRules>({
      title: '具有强烈的网文风格，吸睛，包含核心梗或金手指。',
      synopsis: '必须是“新媒体爆款文案”风格。前三句必须抛出冲突、悬念或金手指。',
      coolPoint: '明确指出读者的情绪价值来源（如：人前显圣、极致反差）。',
      burstPoint: '核心冲突的高潮点或反转点。'
  });

  const [editorText, setEditorText] = useState('');
  const [toolMode, setToolMode] = useState<'continue' | 'rewrite' | 'polish'>('continue');
  const [toolLoading, setToolLoading] = useState(false);
  
  const [showDataManager, setShowDataManager] = useState(false);
  const [showPromptLib, setShowPromptLib] = useState(false);
  
  const [draftWordCount, setDraftWordCount] = useState<number>(2000);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedIdea, setSelectedIdea] = useState<string>('');
  const [config, setConfig] = useState<GenerationConfig>({ type: 'short', wordCount: 2000, chapterCount: 10, wordsPerChapter: 3000, styleId: '' });

  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenIdea, setRegenIdea] = useState('');
  const [regenContextMapKeys, setRegenContextMapKeys] = useState<string[]>([]);
  const [regenPromptId, setRegenPromptId] = useState('');
  const [regenStyleContent, setRegenStyleContent] = useState('');

  const [showContextWarning, setShowContextWarning] = useState(false);
  const [contextWarningData, setContextWarningData] = useState<{original: number, truncated: number, preview: string, fullContext: string}>({ original: 0, truncated: 0, preview: '', fullContext: '' });
  const [pendingContextAction, setPendingContextAction] = useState<((truncatedContext: string) => void) | null>(null);

  const [showNewChapModal, setShowNewChapModal] = useState(false);
  const [newChapTitle, setNewChapTitle] = useState('');
  const [activeStoryRecord, setActiveStoryRecord] = useState<StudioRecord | null>(null);
  const [expandedStoryId, setExpandedStoryId] = useState<string>('');
  const [modifyingRecordId, setModifyingRecordId] = useState<string | null>(null);
  
  const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);
  
  // 修改：排除 synopsis 类型，确保 selectedMapType 始终指向 OutlineNode 类型
  const [selectedMapType, setSelectedMapType] = useState<Exclude<keyof ArchitectureMap, 'synopsis'>>('world');
  const [selectedMapNode, setSelectedMapNode] = useState<OutlineNode | null>(null);
  
  const isGeneratingDaily = activeTasks.some(t => t.type === 'inspiration' && t.status === 'running');
  const isRegeneratingMap = activeTasks.some(t => t.type === 'map_regen' && t.status === 'running');
  const isAnalyzingTrend = activeTasks.some(t => t.labelKey === 'analyzeTrend' && t.status === 'running');
  
  const [isRewriting, setIsRewriting] = useState(false);
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
  const [isGeneratingIllu, setIsGeneratingIllu] = useState(false);

  const [editNodeName, setEditNodeName] = useState('');
  const [editNodeDesc, setEditNodeDesc] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');

  const loadHistory = () => setTimeout(() => setHistory(getHistory<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO)), 100);

  useEffect(() => {
      const savedData = loadFromStorage(STORAGE_KEYS.STUDIO);
      if (savedData && savedData.editorText) setEditorText(savedData.editorText);
      loadHistory();
  }, []);

  useEffect(() => {
     const lastInspTask = activeTasks.find(t => t.type === 'inspiration' && t.status === 'completed');
     if (lastInspTask && lastInspTask.result) {
         setStudioState(prev => ({ ...prev, generatedContent: lastInspTask.result }));
         loadHistory();
     }
      if (activeTasks.some(t => t.type === 'story' && t.status === 'completed')) loadHistory();
  }, [activeTasks]);
  
  useEffect(() => {
      const timeoutId = setTimeout(() => {
          const currentSaved = loadFromStorage(STORAGE_KEYS.STUDIO) || {};
          saveToStorage(STORAGE_KEYS.STUDIO, { ...currentSaved, editorText });
      }, 1000); 
      return () => clearTimeout(timeoutId);
  }, [editorText]);

  useEffect(() => {
      if (selectedMapNode) {
          setEditNodeName(selectedMapNode.name);
          setEditNodeDesc(selectedMapNode.description || '');
      }
  }, [selectedMapNode]);

  // 打开灵感配置弹窗
  const handleOpenInspirationConfig = () => {
      setShowInspirationConfig(true);
  };

  // 执行每日灵感生成
  const handleDailyGen = async () => {
    setShowInspirationConfig(false);
    await startBackgroundTask('inspiration', 'genInspiration', async (taskId) => {
        const result = await generateDailyStories(
            studioState.trendFocus, selectedSources, targetAudience, lang, model, globalPersona,
            inspirationRules, // 传入自定义规则
            (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo)
        );
        addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, { 
            id: Date.now().toString(), timestamp: Date.now(), recordType: 'inspiration',
            trendFocus: studioState.trendFocus || '通用', content: result, sources: selectedSources,
            metadata: { source: '', gender: targetAudience, majorCategory: '', trope: '' } 
        });
        return result;
    });
  };

  const handleAnalyzeTrend = async () => {
      if (selectedSources.length === 0) return;
      await startBackgroundTask('inspiration', 'analyzeTrend', async (taskId) => {
          updateTaskProgress(taskId, '正在搜索真实榜单数据...', 20, `来源: ${selectedSources.join(',')}`);
          const trend = await analyzeTrendKeywords(selectedSources, targetAudience, lang, model, globalPersona, (debugInfo) => {
              updateTaskProgress(taskId, 'AI 分析中...', 50, "分析榜单数据...", undefined, debugInfo);
          });
          setStudioState(prev => ({ ...prev, trendFocus: trend }));
          return trend;
      });
  }

  const handleInputChange = (val: string) => setStudioState(prev => ({ ...prev, trendFocus: val }));
  const toggleSourceSelection = (source: string) => setSelectedSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);

  const handleHistoryClick = (record: StudioRecord) => {
      if (record.recordType === 'inspiration') {
          setStudioState(prev => ({ ...prev, trendFocus: record.trendFocus || '', generatedContent: record.content }));
      } else {
          toggleStoryExpand(record);
      }
  };

  const checkContextSize = (context: string, action: (finalContext: string) => void) => {
      const WARNING_THRESHOLD = 30000;
      if (context.length > WARNING_THRESHOLD) {
          const truncated = context.substring(0, WARNING_THRESHOLD);
          setContextWarningData({ original: context.length, truncated: WARNING_THRESHOLD, preview: context.substring(WARNING_THRESHOLD, WARNING_THRESHOLD + 200) + "...", fullContext: context });
          setPendingContextAction(() => action);
          setShowContextWarning(true);
      } else action(context);
  };

  const handleExportJson = () => {
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(history, null, 2));
      const linkElement = document.createElement('a');
      linkElement.href = dataUri;
      linkElement.download = `inkflow_studio_history_${new Date().toISOString().slice(0,10)}.json`;
      linkElement.click();
  };

  const handleExportItemJson = (item: StudioRecord) => {
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(item, null, 2));
      const linkElement = document.createElement('a');
      linkElement.href = dataUri;
      linkElement.download = `${item.title || 'inkflow_item'}.json`;
      linkElement.click();
  }

  const handleExportZip = async (item: StudioRecord) => {
      if (!window.JSZip) return alert("ZIP 库未加载");
      const zip = new window.JSZip();
      const safeTitle = (item.title || 'novel').replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
      const mapsFolder = zip.folder("思维导图");
      if (item.architecture) {
          Object.keys(item.architecture).forEach(key => {
              const tree = (item.architecture as any)[key] as OutlineNode;
              if (tree) {
                let md = `# ${tree.name}\n${tree.description}\n`; 
                mapsFolder?.file(`${key}.md`, md);
              }
          });
      }
      const chaptersFolder = zip.folder("正文稿件");
      if (item.chapters && item.chapters.length > 0) {
          item.chapters.forEach((chap, idx) => {
              chaptersFolder?.file(`${String(idx + 1).padStart(2, '0')}_${chap.title}.txt`, chap.content || "");
          });
      }
      try {
          const content = await zip.generateAsync({ type: "blob" });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(content);
          link.download = `${safeTitle}_backup.zip`;
          link.click();
      } catch (e) { alert("ZIP 导出失败"); }
  };

  const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if (e.target.files && e.target.files.length > 0) {
          fileReader.readAsText(e.target.files[0], "UTF-8");
          fileReader.onload = (e) => {
              try {
                  const importedData = JSON.parse(e.target?.result as string);
                  if (Array.isArray(importedData)) {
                      const updatedHistory = [...importedData, ...history]; 
                      saveToStorage(STORAGE_KEYS.HISTORY_STUDIO, updatedHistory);
                      setHistory(updatedHistory);
                      alert("导入成功");
                  }
              } catch (error) { alert("导入失败，格式错误"); }
          };
      }
  };

  const handleDeleteHistory = (id: string) => {
      const updated = deleteHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, id);
      setHistory(updated);
      if (activeStoryRecord?.id === id) { setActiveStoryRecord(null); setMainViewMode('quick-tools'); }
  };

  const openNewChapModal = (recordId: string) => {
      setModifyingRecordId(recordId);
      const existingCount = history.find(h=>h.id===recordId)?.chapters?.length || 0;
      setNewChapTitle(`第 ${existingCount + 1} 章`);
      setShowNewChapModal(true);
  };

  const handleManualAddChapter = () => {
      if (!modifyingRecordId || !newChapTitle) return;
      const record = history.find(h => h.id === modifyingRecordId);
      if (!record) return;
      const newChapter = { title: newChapTitle, content: '', nodeId: undefined };
      const updatedRecord = { ...record, chapters: [...(record.chapters || []), newChapter] };
      updateHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, record.id, updatedRecord);
      setHistory(prev => prev.map(item => item.id === record.id ? updatedRecord : item));
      if (activeStoryRecord?.id === record.id) setActiveStoryRecord(updatedRecord);
      setShowNewChapModal(false); setModifyingRecordId(null);
  };

  const handleOpenRegenModal = () => {
      if (!activeStoryRecord) return;
      
      let initialInput = `【核心前提】\n书名：${activeStoryRecord.title || '未命名'}\n`;
      
      // 优先从元数据中获取（这部分数据在 generateStoryFromIdea 中已透传）
      if (activeStoryRecord.metadata) {
          const m = activeStoryRecord.metadata;
          // 按重要性排序
          if (m.majorCategory) initialInput += `分类：${m.majorCategory}\n`;
          if (m.theme) initialInput += `标签/主题：${m.theme}\n`;
          if (m.trope) initialInput += `核心梗：${m.trope}\n`;
          if (m.goldenFinger) initialInput += `金手指：${m.goldenFinger}\n`;
          if (m.coolPoint) initialInput += `爽点：${m.coolPoint}\n`;
          if (m.burstPoint) initialInput += `爆点：${m.burstPoint}\n`;
          if (m.coolSystem) initialInput += `爽点体系：${m.coolSystem}\n`;
          if (m.memoryAnchor) initialInput += `记忆锚点：${m.memoryAnchor}\n`;
          if (m.characterArchetype) initialInput += `角色原型：${m.characterArchetype}\n`;
      }
      
      // 简介处理：如果 content 是占位符，且 metadata 中有 synopsis（通常没有单独存），尝试从 content 中提取
      if (activeStoryRecord.architecture && activeStoryRecord.architecture.synopsis) {
           initialInput += `简介：${activeStoryRecord.architecture.synopsis}\n`;
      } else if (activeStoryRecord.content && !activeStoryRecord.content.includes("连载项目（架构已就绪）")) {
          initialInput += `简介：${activeStoryRecord.content}\n`;
      }
      
      if (activeStoryRecord.trendFocus) {
          initialInput += `趋势焦点：${activeStoryRecord.trendFocus}\n`;
      }
      
      initialInput += `\n【重绘指令】：\n(在此输入新的指令，例如：细化等级体系、增加反派设定...)`;

      setRegenIdea(initialInput);
      setRegenContextMapKeys([]);
      setRegenPromptId('');
      setRegenStyleContent('');
      setShowRegenModal(true);
  }

  const handleRegenerateMap = async () => {
      if (!activeStoryRecord || !selectedMapType) return;
      
      let contextData = "";

      if (regenContextMapKeys.length > 0) {
          contextData += `\n【参考架构 (Reference Architecture)】\n`;
          contextData += `请参考以下已有的思维导图内容，确保新生成的导图与现有设定逻辑一致，不要产生冲突：\n`;
          
          regenContextMapKeys.forEach(key => {
              // 关键修改：如果上下文 key 就是当前要生成的类型，跳过它（防止自我循环引用）
              if (key === selectedMapType) return;

              // 安全获取值，防止类型错误
              const val = activeStoryRecord.architecture ? (activeStoryRecord.architecture as any)[key] : null;
              // 确保值存在且不是字符串（排除 synopsis）
              if (val && typeof val !== 'string') {
                  const mapRoot = val as OutlineNode;
                  contextData += `\n>>> 参考导图：${t('studio.maps.' + key)} (Reference Map: ${key}) <<<\n`;
                  contextData += serializeMapToText(mapRoot); 
              }
          });
      }
      
      setShowRegenModal(false);
      
      checkContextSize(contextData, async (finalContext) => {
          await startBackgroundTask('map_regen', 'regenMap', async (taskId) => {
              const newRoot = await regenerateSingleMap(
                  selectedMapType, 
                  regenIdea, 
                  finalContext, 
                  lang, 
                  model, 
                  regenStyleContent, 
                  globalPersona, 
                  (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo)
              );
              const newArchitecture = { ...activeStoryRecord.architecture, [selectedMapType]: newRoot };
              const updatedRecord = { ...activeStoryRecord, architecture: newArchitecture };
              setActiveStoryRecord(updatedRecord);
              updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { architecture: newArchitecture });
              setHistory(prev => prev.map(item => item.id === activeStoryRecord.id ? updatedRecord : item));
              return "导图重绘完成";
          });
      });
  };

  const toggleStoryExpand = (record: StudioRecord) => {
      if (expandedStoryId === record.id) setExpandedStoryId('');
      else { setExpandedStoryId(record.id); setActiveStoryRecord(record); setMainViewMode('story-files'); }
  };

  const handleOpenChapter = (record: StudioRecord, index: number) => {
      setActiveStoryRecord(record);
      setCurrentChapterIndex(index);
      setMainViewMode('story-editor');
  };

  const handleDeleteChapter = (e: React.MouseEvent, record: StudioRecord, index: number) => {
      e.stopPropagation();
      if (!confirm("确定删除此章节？")) return;
      const newChapters = [...(record.chapters || [])];
      newChapters.splice(index, 1);
      const updatedRecord = { ...record, chapters: newChapters };
      updateHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, record.id, updatedRecord);
      setHistory(prev => prev.map(item => item.id === record.id ? updatedRecord : item));
      if (activeStoryRecord?.id === record.id) setActiveStoryRecord(updatedRecord);
  };
  
  const handleResetMap = () => {
      if (!activeStoryRecord || !selectedMapType || !confirm("确定重置/清空当前导图？")) return;
      const updatedArch = { ...activeStoryRecord.architecture } as any;
      updatedArch[selectedMapType] = undefined;
      const updatedRecord = { ...activeStoryRecord, architecture: updatedArch };
      updateHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, updatedRecord);
      setHistory(prev => prev.map(item => item.id === activeStoryRecord.id ? updatedRecord : item));
      setActiveStoryRecord(updatedRecord);
      setSelectedMapNode(null);
  };

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

  const handleGenerateNodeContent = async () => {
      if (!activeStoryRecord || !selectedMapNode || !selectedMapNode.id) return;
      const context = (activeStoryRecord.architecture?.world ? extractContextFromTree(activeStoryRecord.architecture.world) : '') + (activeStoryRecord.architecture?.character ? extractContextFromTree(activeStoryRecord.architecture.character) : '');
      checkContextSize(context, async (finalContext) => {
          setIsGeneratingChapter(true);
          await startBackgroundTask('draft', 'drafting', async (taskId) => {
              const selectedStyle = selectedPromptId ? promptLibrary.find(p => p.id === selectedPromptId)?.content : undefined;
              const content = await generateChapterContent(
                  selectedMapNode, 
                  finalContext, 
                  lang, 
                  model, 
                  selectedStyle, 
                  draftWordCount,
                  globalPersona,
                  (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo)
              );
              const newChapter = { title: selectedMapNode.name, content: content, nodeId: selectedMapNode.id };
              const updatedRecord = { ...activeStoryRecord, chapters: [...(activeStoryRecord.chapters || []), newChapter] };
              setActiveStoryRecord(updatedRecord);
              setHistory(prev => prev.map(item => item.id === activeStoryRecord.id ? updatedRecord : item));
              updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: updatedRecord.chapters });
              setCurrentChapterIndex(updatedRecord.chapters!.length - 1);
              setMainViewMode('story-editor');
              setIsGeneratingChapter(false);
              return "章节已生成";
          });
      });
  }

  const handleRewriteWithContext = async (pid: string) => {
      if (!activeStoryRecord || currentChapterIndex === null) return;
      const currentChapter = activeStoryRecord.chapters?.[currentChapterIndex];
      const contentToRewrite = currentChapter ? currentChapter.content : activeStoryRecord.content;
      if (!contentToRewrite) return;
      setIsRewriting(true);
      try {
          const freshContext = (activeStoryRecord.architecture?.world ? extractContextFromTree(activeStoryRecord.architecture.world) : '') + (activeStoryRecord.architecture?.character ? extractContextFromTree(activeStoryRecord.architecture.character) : '');
          const promptTemplate = pid ? promptLibrary.find(p => p.id === pid)?.content : undefined;
          const result = await rewriteChapterWithContext(contentToRewrite, freshContext, lang, model, promptTemplate, globalPersona);
          const newChapters = [...(activeStoryRecord.chapters || [])];
          if (newChapters[currentChapterIndex]) newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: result };
          const updatedRecord = { ...activeStoryRecord, chapters: newChapters, content: activeStoryRecord.storyType === 'short' ? result : activeStoryRecord.content };
          setActiveStoryRecord(updatedRecord);
          updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, updatedRecord);
      } catch (e) { alert("重写失败"); } finally { setIsRewriting(false); }
  }

  const insertTextAtCursor = (textToInsert: string) => {
        const textarea = document.getElementById('studio-editor-textarea') as HTMLTextAreaElement;
        if (!textarea || !activeStoryRecord) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        
        const newChapters = [...(activeStoryRecord.chapters || [])];
        if (currentChapterIndex !== null && newChapters[currentChapterIndex]) {
            newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: newText };
            const updated = { ...activeStoryRecord, chapters: newChapters };
            setActiveStoryRecord(updated);
            updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: newChapters });
        }
  };

  const handleGenerateIllustration = async (mode: 'context' | 'prompt' | 'upload', customPrompt?: string, file?: File) => {
      if (!activeStoryRecord) return;
      
      if (mode === 'upload' && file) {
          const reader = new FileReader();
          reader.onloadend = () => insertTextAtCursor(`\n\n![Uploaded Illustration](${reader.result})\n\n`);
          reader.readAsDataURL(file);
          return;
      }

      setIsGeneratingIllu(true);
      try {
          let promptToUse = customPrompt || '';
          if (mode === 'context') {
             const textarea = document.getElementById('studio-editor-textarea') as HTMLTextAreaElement;
             if (textarea) {
                 const cursor = textarea.selectionStart;
                 const text = textarea.value;
                 const contextText = text.substring(Math.max(0, cursor - 1500), Math.min(text.length, cursor + 500));
                 promptToUse = await generateIllustrationPrompt(contextText, lang, model);
             }
          }
          if (!promptToUse) throw new Error("No prompt");
          const base64Image = await generateImage(promptToUse, 'gemini-2.5-flash-image', '4:3');
          insertTextAtCursor(`\n\n![Illustration](${base64Image})\n*${promptToUse}*\n\n`);
      } catch (e) { alert("插图生成失败"); } finally { setIsGeneratingIllu(false); }
  };

  const parseInspirations = (text: string) => {
      if (!text) return [];
      try {
          let cleanText = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          const firstBrace = cleanText.indexOf('[');
          const lastBrace = cleanText.lastIndexOf(']');
          if (firstBrace !== -1 && lastBrace !== -1) cleanText = cleanText.substring(firstBrace, lastBrace + 1);
          const parsed = JSON.parse(cleanText);
          if (Array.isArray(parsed)) return parsed.map((item, index) => ({ id: index, title: item.title, synopsis: item.synopsis, metadata: item.metadata, raw: JSON.stringify(item) }));
      } catch (e) {}
      return [];
  }

  const confirmGenerateStory = async () => {
      setShowConfigModal(false);
      setActiveTab('tools'); 
      await startBackgroundTask('story', 'genStory', async (taskId) => {
          const result = await generateStoryFromIdea(
              selectedIdea, 
              config, 
              lang, 
              model, 
              undefined,
              globalPersona,
              (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo)
          );
          
          // 在此创建记录，并透传 metadata
          addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, { 
              id: Date.now().toString(), 
              timestamp: Date.now(), 
              recordType: 'story', 
              title: result.title, 
              storyType: config.type, 
              config: config, 
              content: result.content, 
              chapters: result.chapters, 
              architecture: result.architecture || undefined,
              metadata: result.metadata // <--- 透传元数据到 Story 记录中
          });
          return "小说架构已生成";
      });
  }

  const handleToolAction = async () => {
      if(!editorText) return;
      setToolLoading(true);
      try {
        const result = await manipulateText(editorText, toolMode, lang, model, globalPersona);
        setEditorText(result); 
      } catch (e) {} finally { setToolLoading(false); }
  };

  const inspirationCards = parseInspirations(studioState.generatedContent);
  const coreMaps = ['world', 'character', 'system', 'anchor', 'mission'];
  const plotMaps = ['structure', 'events', 'chapters'];
  const allMaps = [...coreMaps, ...plotMaps];

  const handleToggleRegenKey = (type: string) => {
      setRegenContextMapKeys(prev => {
          if (prev.includes(type)) return prev.filter(k => k !== type);
          return [...prev, type];
      });
  };

  const handleContextWarningDecision = (truncate: boolean) => {
      if (!pendingContextAction) return;
      setShowContextWarning(false);
      const finalContext = truncate ? contextWarningData.fullContext.substring(0, contextWarningData.truncated) + "\n[...安全截断...]" : contextWarningData.fullContext;
      pendingContextAction(finalContext);
      setPendingContextAction(null);
  };

  return (
    <div className="flex flex-col h-full p-0 md:p-4 max-w-full mx-auto relative overflow-hidden bg-slate-100">

      {showPromptLib && (
          <PromptLibraryModal isOpen={showPromptLib} onClose={() => setShowPromptLib(false)} />
      )}

      {showDataManager && (
          <DataManagerModal isOpen={showDataManager} onClose={() => setShowDataManager(false)} />
      )}

      {/* 灵感生成配置弹窗 */}
      {showInspirationConfig && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <Sparkles size={16} className="text-yellow-500"/> 灵感生成规则
                      </h3>
                      <button onClick={() => setShowInspirationConfig(false)} className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
                  <div className="p-6 space-y-4 overflow-y-auto">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">标题规则 (Title)</label>
                          <textarea 
                              value={inspirationRules.title} 
                              onChange={e => setInspirationRules({...inspirationRules, title: e.target.value})} 
                              className="w-full p-2 border border-slate-200 rounded text-xs h-16 leading-relaxed"
                              placeholder="例如：四字书名，包含‘系统’二字..."
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">简介规则 (Synopsis)</label>
                          <textarea 
                              value={inspirationRules.synopsis} 
                              onChange={e => setInspirationRules({...inspirationRules, synopsis: e.target.value})} 
                              className="w-full p-2 border border-slate-200 rounded text-xs h-20 leading-relaxed"
                              placeholder="例如：新媒体风格，前三行必须有反转..."
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">爽点 (Cool Point)</label>
                          <textarea 
                              value={inspirationRules.coolPoint} 
                              onChange={e => setInspirationRules({...inspirationRules, coolPoint: e.target.value})} 
                              className="w-full p-2 border border-slate-200 rounded text-xs h-16 leading-relaxed"
                              placeholder="例如：人前显圣，扮猪吃虎..."
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">爆点 (Burst Point)</label>
                          <textarea 
                              value={inspirationRules.burstPoint} 
                              onChange={e => setInspirationRules({...inspirationRules, burstPoint: e.target.value})} 
                              className="w-full p-2 border border-slate-200 rounded text-xs h-16 leading-relaxed"
                              placeholder="例如：主角身世揭秘，退婚打脸..."
                          />
                      </div>
                  </div>
                  <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
                      <button onClick={() => setShowInspirationConfig(false)} className="px-4 py-2 text-slate-600 text-xs hover:bg-slate-200 rounded">取消</button>
                      <button onClick={handleDailyGen} className="px-6 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800 flex items-center gap-2">
                          <Sparkles size={14}/> 确认生成
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showNewChapModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
                  <h3 className="font-bold text-slate-800 mb-4">{t('studio.manual.newChapTitle')}</h3>
                  <input value={newChapTitle} onChange={e => setNewChapTitle(e.target.value)} className="w-full p-2 border rounded text-sm mt-1" />
                  <div className="flex justify-end gap-2 pt-4">
                      <button onClick={() => setShowNewChapModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">{t('common.cancel')}</button>
                      <button onClick={handleManualAddChapter} className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">{t('studio.manual.create')}</button>
                  </div>
              </div>
          </div>
      )}

      {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
                  <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800">{t('studio.config.title')}</h3><button onClick={() => setShowConfigModal(false)}>×</button></div>
                  <div className="p-6 space-y-4">
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.config.type')}</label><div className="flex gap-2"><button onClick={() => setConfig({...config, type: 'short'})} className={`flex-1 py-2 rounded border text-sm ${config.type==='short' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200'}`}>{t('studio.config.short')}</button><button onClick={() => setConfig({...config, type: 'long'})} className={`flex-1 py-2 rounded border text-sm ${config.type==='long' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200'}`}>{t('studio.config.long')}</button></div></div>
                      
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700">
                           <Sparkles size={12} className="inline mr-1"/>
                           系统将为您创建标准的空白架构模板，后续可在各节点中进行 AI 填充。
                      </div>
                  </div>
                  <div className="p-4 bg-slate-50 border-t flex justify-end gap-2"><button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-slate-600">{t('common.cancel')}</button><button onClick={confirmGenerateStory} className="px-4 py-2 bg-teal-600 text-white rounded">{t('studio.genStory')}</button></div>
              </div>
          </div>
      )}

      {showContextWarning && (
           <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
               <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl border border-red-200 p-6">
                   <h3 className="font-bold text-red-900 flex items-center gap-2"><AlertTriangle/>{t('studio.contextWarning.title')}</h3>
                   <p className="text-sm text-slate-600 mt-2">{t('studio.contextWarning.desc')}</p>
                   <div className="flex justify-end gap-2 mt-6">
                       <button onClick={() => handleContextWarningDecision(false)} className="px-4 py-2 text-red-600">{t('studio.contextWarning.sendFull')}</button>
                       <button onClick={() => handleContextWarningDecision(true)} className="px-4 py-2 bg-teal-600 text-white rounded">{t('studio.contextWarning.truncateSend')}</button>
                   </div>
               </div>
           </div>
      )}

      {showRegenModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
               <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                   <div className="p-4 border-b bg-slate-50 flex justify-between"><h3 className="font-bold">{t('studio.tree.regenerate')}</h3><button onClick={() => setShowRegenModal(false)}>×</button></div>
                   <div className="p-6 overflow-y-auto space-y-4">
                       <textarea value={regenIdea} onChange={e => setRegenIdea(e.target.value)} className="w-full p-3 border rounded text-sm h-32 leading-relaxed whitespace-pre-wrap font-mono text-xs" placeholder="输入新的构思..." />
                       
                       <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.config.style')}</label>
                            
                            <select
                                value={regenPromptId}
                                onChange={(e) => {
                                    const pid = e.target.value;
                                    setRegenPromptId(pid);
                                    const p = promptLibrary.find(item => item.id === pid);
                                    if(p) setRegenStyleContent(p.content);
                                }}
                                className="w-full p-2 border rounded text-sm bg-white mb-2"
                            >
                                <option value="">{t('architect.defaultStyle')}</option>
                                {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            
                            <textarea
                                value={regenStyleContent}
                                onChange={(e) => {
                                    setRegenStyleContent(e.target.value);
                                    if (regenPromptId) setRegenPromptId('');
                                }}
                                className="w-full p-2 border rounded text-xs bg-slate-50 text-slate-700 h-24 leading-relaxed resize-none focus:bg-white focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all placeholder:text-slate-400"
                                placeholder="在此输入自定义提示词或风格要求..."
                            />
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.tree.selectContext')}</label>
                           <p className="text-[10px] text-slate-400 mb-2">
                               系统已自动注入项目的全部灵感元数据（如金手指、爽点等）。请选择额外的导图作为补充上下文。
                           </p>
                           <div className="grid grid-cols-2 gap-2">
                               {allMaps.filter(t => t !== selectedMapType).map(type => (
                                   <div key={type} onClick={() => handleToggleRegenKey(type)} className="flex items-center gap-2 cursor-pointer p-2 border rounded hover:bg-slate-50 transition-colors">
                                       {regenContextMapKeys.includes(type) ? <CheckSquare size={16} className="text-teal-600"/> : <Square size={16} className="text-slate-300"/>} <span className="text-xs">{t(`studio.maps.${type}`)}</span>
                                   </div>
                               ))}
                           </div>
                       </div>
                   </div>
                   <div className="p-4 border-t flex justify-end gap-2"><button onClick={() => setShowRegenModal(false)} className="px-4 py-2 text-slate-600">{t('common.cancel')}</button><button onClick={handleRegenerateMap} disabled={isRegeneratingMap} className="px-6 py-2 bg-teal-600 text-white rounded">{isRegeneratingMap ? <Loader2 className="animate-spin"/> : <RefreshCw/>} {t('studio.tree.regenerate')}</button></div>
               </div>
          </div>
      )}

      <div className="flex-1 flex flex-col bg-white md:rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          
          <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white flex-shrink-0">
              <div className="flex gap-6 h-full">
                <button onClick={() => setActiveTab('daily')} className={`h-full border-b-2 font-medium text-sm px-1 ${activeTab === 'daily' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500'}`}>{t('studio.tabDaily')}</button>
                <button onClick={() => setActiveTab('tools')} className={`h-full border-b-2 font-medium text-sm px-1 ${activeTab === 'tools' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500'}`}>{t('studio.tabTools')}</button>
              </div>
          </div>

          <div className="flex-1 overflow-hidden relative">
              {activeTab === 'daily' && (
                 <div className="absolute inset-0 flex flex-col md:flex-row gap-0">
                    <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 p-6 flex flex-col gap-4 overflow-y-auto">
                        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm"><Sparkles className="text-yellow-500" size={16}/> {t('studio.dailyGenTitle')}</h3>
                            
                            <div className="mb-4 border-b border-slate-100 pb-4">
                                <div className="flex justify-between items-center mb-2 cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded" onClick={() => setShowSourceSelector(!showSourceSelector)}>
                                    <label className="text-xs font-bold text-slate-500 uppercase cursor-pointer">{t('sources.title')}</label>
                                    <div className="flex items-center gap-1 text-xs text-teal-600 font-medium">
                                        <span className="truncate max-w-[100px] text-right">
                                            {selectedSources.length > 0 ? selectedSources.map(s => t(`sources.${s}`)).join(', ') : t('common.selected')}
                                        </span>
                                        {showSourceSelector ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                                    </div>
                                </div>
                                {showSourceSelector && (
                                    <div className="grid grid-cols-3 gap-1.5 animate-in fade-in slide-in-from-top-2">
                                        {AVAILABLE_SOURCES.map(src => (
                                            <button 
                                                key={src} 
                                                onClick={(e) => { e.stopPropagation(); toggleSourceSelection(src); }}
                                                className={`px-1 py-1.5 rounded text-[10px] font-medium border transition-all ${
                                                    selectedSources.includes(src) 
                                                    ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' 
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                            >
                                                {t(`sources.${src}`)}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                                <button onClick={() => setTargetAudience('male')} className={`flex-1 py-1.5 rounded text-xs font-medium ${targetAudience === 'male' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{t('studio.maleFreq')}</button>
                                <button onClick={() => setTargetAudience('female')} className={`flex-1 py-1.5 rounded text-xs font-medium ${targetAudience === 'female' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{t('studio.femaleFreq')}</button>
                            </div>
                            
                            <div className="flex gap-2 mb-4">
                                <input type="text" value={studioState.trendFocus} onChange={(e) => handleInputChange(e.target.value)} placeholder={t('studio.trendPlaceholder')} className="flex-1 p-2 text-xs border border-slate-300 rounded" disabled={isGeneratingDaily} />
                                <button onClick={handleAnalyzeTrend} disabled={isAnalyzingTrend || selectedSources.length === 0} className="p-2 bg-indigo-50 text-indigo-600 rounded disabled:opacity-50" title="获取趋势 (Gemini Grounding)">{isAnalyzingTrend ? <Loader2 className="animate-spin" size={16}/> : <ZapIcon size={16}/>}</button>
                            </div>
                            
                            <button onClick={handleOpenInspirationConfig} disabled={isGeneratingDaily} className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2">{isGeneratingDaily ? <Loader2 className="animate-spin"/> : t('studio.generateBtn')}</button>
                        </div>

                        <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto shadow-sm">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2 mb-3"><History size={12} /> {t('studio.historyTitle')}</h4>
                            {history.filter(h => h.recordType === 'inspiration').map(item => (
                                <div key={item.id} className="bg-slate-50 rounded-lg border border-slate-100 p-3 cursor-pointer hover:bg-white flex justify-between items-center group">
                                    <div className="w-4/5" onClick={() => handleHistoryClick(item)}><div className="text-xs font-bold text-slate-700 truncate">{item.trendFocus}</div></div>
                                    <button onClick={() => handleDeleteHistory(item.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    <div className="flex-1 bg-white p-8 overflow-y-auto relative h-full">
                        {inspirationCards.length > 0 ? (
                             <div className="grid grid-cols-1 gap-8 pb-10 max-w-4xl mx-auto">
                                {inspirationCards.map((card) => (
                                    <div key={card.id} className="p-6 bg-slate-50 border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all">
                                        <h3 className="text-xl font-bold text-slate-800 mb-4">{card.title}</h3>
                                        <div className="flex flex-wrap gap-2 mb-4">
                                            {card.metadata.source && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-white border border-slate-200 text-slate-600 flex items-center gap-1"><Globe size={10}/> {card.metadata.source}</span>}
                                            {card.metadata.gender && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-pink-50 border border-pink-100 text-pink-700">{card.metadata.gender}</span>}
                                            {card.metadata.trope && <span className="px-2.5 py-1 rounded text-[10px] font-bold uppercase bg-orange-50 border border-orange-100 text-orange-700 flex items-center gap-1"><Tag size={10}/> {card.metadata.trope}</span>}
                                        </div>
                                        {card.metadata && (card.metadata.coolPoint || card.metadata.burstPoint) && (
                                             <div className="flex gap-4 mb-4 text-xs">
                                                 {card.metadata.coolPoint && <div className="text-green-700 bg-green-50 px-2 py-1 rounded border border-green-100"><span className="font-bold mr-1">😊 {t('studio.meta.coolPoint')}:</span> {card.metadata.coolPoint}</div>}
                                                 {card.metadata.burstPoint && <div className="text-red-700 bg-red-50 px-2 py-1 rounded border border-red-100"><span className="font-bold mr-1">🔥 {t('studio.meta.burstPoint')}:</span> {card.metadata.burstPoint}</div>}
                                             </div>
                                        )}
                                        {card.synopsis && <div className="bg-white p-4 rounded-lg border border-slate-100 mb-6 shadow-sm"><p className="text-sm text-slate-600 leading-loose whitespace-pre-wrap font-serif">{card.synopsis}</p></div>}
                                        <button onClick={() => { setSelectedIdea(card.raw); setShowConfigModal(true); }} className="w-full py-3 bg-white border border-teal-200 text-teal-700 rounded-lg text-sm font-bold hover:bg-teal-50 flex items-center justify-center gap-2"><BookOpen size={16} /> {t('studio.genStory')}</button>
                                    </div>
                                ))}
                             </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400"><Sparkles size={48} className="opacity-20 mb-4" /><p>{t('studio.emptyDaily')}</p></div>
                        )}
                    </div>
                 </div>
              )}

              {activeTab === 'tools' && (
                 <div className="absolute inset-0 flex">
                     {!isMobile && (
                         <StudioSidebar 
                            history={history} activeStoryRecord={activeStoryRecord} mainViewMode={mainViewMode} currentChapterIndex={currentChapterIndex}
                            onSelectQuickTools={() => { setMainViewMode('quick-tools'); setActiveStoryRecord(null); }}
                            onSelectRecord={(r) => { setActiveStoryRecord(r); setExpandedStoryId(r.id); setMainViewMode('story-files'); }}
                            onToggleExpand={toggleStoryExpand} expandedStoryId={expandedStoryId}
                            onOpenMaps={(r) => { setActiveStoryRecord(r); setMainViewMode('story-map'); setSelectedMapType('world'); }}
                            onOpenFolder={(r) => { setActiveStoryRecord(r); setMainViewMode('story-files'); }}
                            onOpenChapter={handleOpenChapter} onCreateChapter={openNewChapModal}
                            onDeleteHistory={handleDeleteHistory}
                            onExportJson={handleExportJson} onExportItemJson={handleExportItemJson} onExportZip={handleExportZip} onImportHistory={handleImportHistory}
                            onManagePrompts={() => setShowPromptLib(true)}
                         />
                     )}
                     
                     {mainViewMode === 'quick-tools' && (
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
                                <textarea value={editorText} onChange={(e) => setEditorText(e.target.value)} placeholder={t('studio.toolPlaceholder')} className="flex-1 p-6 resize-none focus:outline-none text-slate-700 leading-relaxed font-mono text-sm" />
                                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
                                    <button onClick={handleToolAction} disabled={toolLoading || !editorText} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-slate-900/20">
                                        {toolLoading ? <Loader2 className="animate-spin" size={16}/> : <>{getProcessLabel(toolMode)} <Sparkles size={16} /></>}
                                    </button>
                                </div>
                            </div>
                        </div>
                     )}

                     {mainViewMode === 'story-files' && (
                         <StudioFileList activeStoryRecord={activeStoryRecord} onOpenChapter={handleOpenChapter} onDeleteChapter={handleDeleteChapter} onCreateChapter={openNewChapModal} />
                     )}

                     {mainViewMode === 'story-editor' && (
                         <StudioEditor 
                            activeStoryRecord={activeStoryRecord} currentChapterIndex={currentChapterIndex} 
                            onUpdateContent={(val) => {
                                if (!activeStoryRecord) return;
                                const newChapters = [...(activeStoryRecord.chapters || [])];
                                if (currentChapterIndex !== null && newChapters[currentChapterIndex]) {
                                    newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: val };
                                    const updated = { ...activeStoryRecord, chapters: newChapters };
                                    setActiveStoryRecord(updated);
                                    updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: newChapters });
                                }
                            }}
                            promptLibrary={promptLibrary} isRewriting={isRewriting} onRewrite={handleRewriteWithContext}
                            onGenerateIllustration={handleGenerateIllustration} isGeneratingIllu={isGeneratingIllu}
                         />
                     )}

                     {mainViewMode === 'story-map' && (
                         <div className="flex-1 flex h-full bg-slate-50 overflow-hidden relative">
                             <div className="flex-1 flex flex-col relative">
                                 <div className="h-12 border-b border-slate-200 bg-white flex items-center justify-between px-4 gap-2">
                                     <div className="flex gap-4 overflow-x-auto no-scrollbar flex-1 py-1 items-center">
                                        <div className="flex gap-2 items-center border-r border-slate-100 pr-4">
                                            {coreMaps.map(type => (
                                                <button key={type} onClick={() => { setSelectedMapType(type as any); setSelectedMapNode(null); }} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${selectedMapType === type ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>{t(`studio.maps.${type}`)}</button>
                                            ))}
                                        </div>
                                        <div className="flex gap-2 items-center">
                                            {plotMaps.map(type => (
                                                <button key={type} onClick={() => { setSelectedMapType(type as any); setSelectedMapNode(null); }} className={`px-3 py-1.5 text-xs font-bold rounded-full transition-all whitespace-nowrap ${selectedMapType === type ? 'bg-teal-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100'}`}>{t(`studio.maps.${type}`)}</button>
                                            ))}
                                        </div>
                                     </div>
                                     <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                                         <button onClick={handleOpenRegenModal} className="p-1.5 text-slate-400 hover:text-teal-600 rounded hover:bg-teal-50" title={t('studio.tree.regenerate')}><RefreshCcw size={16}/></button>
                                         <button onClick={handleResetMap} className="p-1.5 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"><Trash2 size={16}/></button>
                                     </div>
                                 </div>
                                 <div className="flex-1 relative bg-slate-50">
                                     {activeStoryRecord && activeStoryRecord.architecture && activeStoryRecord.architecture[selectedMapType] ? (
                                         <MindMap data={activeStoryRecord.architecture[selectedMapType] as OutlineNode} onNodeClick={setSelectedMapNode} />
                                     ) : (
                                         <div className="flex items-center justify-center h-full flex-col gap-2 text-slate-400"><Network size={48} className="opacity-10 mb-4" /><button onClick={handleOpenRegenModal} className="mt-2 text-xs text-teal-600 font-bold hover:underline">点击生成导图</button></div>
                                     )}
                                 </div>
                             </div>
                             <div className="w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col z-10 transition-transform h-full">
                                  <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0"><h3 className="font-bold text-slate-700 text-sm">{t('studio.inspector.title')}</h3>{selectedMapNode && <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-600 uppercase font-bold">{t('architect.types.' + selectedMapNode.type) || selectedMapNode.type}</span>}</div>
                                  {selectedMapNode ? (
                                      <div className="p-4 flex-1 overflow-y-auto space-y-6">
                                           <div className="space-y-2"><label className="text-[10px] font-bold text-slate-400 uppercase block">{t('studio.inspector.name')}</label><input value={editNodeName} onChange={e => setEditNodeName(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-sm font-bold" /></div>
                                           <div className="space-y-2 flex-1 flex flex-col"><label className="text-[10px] font-bold text-slate-400 uppercase block">{t('studio.inspector.desc')}</label><textarea value={editNodeDesc} onChange={e => setEditNodeDesc(e.target.value)} rows={8} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded text-xs leading-relaxed resize-y min-h-[100px]" /></div>
                                           <div className="flex gap-2 pt-2"><button onClick={handleSaveNodeEdit} className="flex-1 py-2 bg-slate-900 text-white rounded text-xs font-bold hover:bg-slate-800">{t('studio.inspector.save')}</button></div>
                                           {(selectedMapNode.type === 'chapter' || selectedMapType === 'chapters') && (
                                               <div className="border-t border-slate-100 pt-6 mt-4 space-y-4 pb-10">
                                                   <div className="flex items-center justify-between"><h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1"><Sparkles size={12} /> {t('studio.inspector.generate')}</h4></div>
                                                   <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-3">
                                                       <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{t('studio.inspector.wordCount')}</label><div className="flex items-center gap-2 bg-white border border-slate-200 rounded px-2"><Hash size={12} className="text-slate-400"/><input type="number" value={draftWordCount} onChange={e => setDraftWordCount(Number(e.target.value))} className="w-full py-1.5 text-xs outline-none" step={500} min={500} /></div></div>
                                                   </div>
                                                   <button onClick={handleGenerateNodeContent} disabled={isGeneratingChapter} className="w-full py-3 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20 active:scale-95 transition-all">{isGeneratingChapter ? <Loader2 className="animate-spin" size={14}/> : <FileText size={14}/>}{t('studio.inspector.generate')}</button>
                                               </div>
                                           )}
                                      </div>
                                  ) : (
                                      <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 text-center bg-slate-50/30"><Network size={48} className="opacity-10 mb-4" /><p className="text-sm">选择导图节点以查看详情或生成内容。</p></div>
                                  )}
                             </div>
                         </div>
                     )}
                 </div>
              )}
          </div>
      </div>
    </div>
  );
};
