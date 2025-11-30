
/**
 * @file pages/Architect.tsx
 * @description 故事架构师 (Story Architect) 核心页面。
 * 
 * ## 功能概述
 * 1. **大纲蓝图 (Blueprint View)**: 基于思维导图 (MindMap) 的结构化大纲设计。
 * 2. **稿件预览 (Manuscript View)**: 将树状大纲线性化，提供类似文档的阅读体验。
 * 3. **AI 递归扩展**: 支持一键生成子节点（如：从“书”自动生成“分卷”，再生成“章节”）。
 * 4. **草稿生成**: 对每个节点（如章节、场景）进行 AI 撰写。
 * 
 * ## 交互逻辑
 * - 使用 `MindMap` 组件渲染树状结构。
 * - 左右分栏设计：左侧为历史记录，中间为画布/文档，右侧为属性检查器。
 */

import React, { useState, useEffect } from 'react';
import { generateChapterContent, expandNodeContent, generateNovelArchitecture } from '../services/geminiService';
import { OutlineNode, ArchitectRecord } from '../types';
import { MindMap } from '../components/MindMap';
import { Network, Loader2, FileText, Trash2, FolderOpen, RefreshCw, BookOpen, ImageIcon, Edit2, Plus, CopyPlus, Sparkles, Settings2, X, BarChart, Hash, Eye } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem, updateHistoryItem, addHistoryItem } from '../services/storageService';

/**
 * 架构师组件
 */
export const Architect: React.FC = () => {
  // --- 状态定义 ---
  
  // 核心输入
  const [premise, setPremise] = useState(''); // 小说前提/核心脑洞
  const [synopsis, setSynopsis] = useState(''); // 故事简介
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null); // 当前选中的大纲节点
  
  // 视图模式: 'map' (导图) 或 'manuscript' (线性文档)
  const [viewMode, setViewMode] = useState<'map' | 'manuscript'>('map');

  // 编辑状态
  const [isEditing, setIsEditing] = useState(false); // 是否处于编辑模式
  const [editName, setEditName] = useState(''); // 编辑中的节点名称
  const [editDesc, setEditDesc] = useState(''); // 编辑中的节点描述

  // 生成状态
  const [generatedChapter, setGeneratedChapter] = useState(''); // 生成的草稿内容
  const [generatingChapter, setGeneratingChapter] = useState(false); // 正在生成草稿
  const [expandingNode, setExpandingNode] = useState(false); // 正在扩展子节点
  
  // 草稿配置
  const [draftWordCount, setDraftWordCount] = useState<number>(2000); // 目标字数

  // 提示词选择 (用于草稿)
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  
  // 提示词选择 (用于结构扩展)
  const [expandPromptId, setExpandPromptId] = useState<string>('');

  const [showPromptLib, setShowPromptLib] = useState(false); // 显示提示词选择器
  const [newPromptName, setNewPromptName] = useState(''); // (UI遗留，可移除)
  const [newPromptContent, setNewPromptContent] = useState(''); // (UI遗留，可移除)

  const [history, setHistory] = useState<ArchitectRecord[]>([]); // 历史记录列表
  
  // 全局上下文
  const { model, architectState, setArchitectState, promptLibrary, addPrompt, deletePrompt, globalPersona } = useApp();
  const { t, lang } = useI18n();

  // --- 副作用与数据加载 ---

  /**
   * 加载历史记录
   */
  const loadHistory = () => {
      setTimeout(() => {
          setHistory(getHistory<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT));
      }, 100);
  };

  /**
   * 同步全局状态到本地 UI
   */
  useEffect(() => {
      if (architectState.premise) setPremise(architectState.premise);
      if (architectState.synopsis) setSynopsis(architectState.synopsis);
  }, [architectState.premise, architectState.synopsis, architectState.outline]);

  /**
   * 初始化加载
   * 恢复上次未完成的编辑状态
   */
  useEffect(() => {
      loadHistory();
      if (!architectState.outline && !architectState.isGenerating) {
           const savedData = loadFromStorage(STORAGE_KEYS.ARCHITECT);
           if (savedData) {
               setArchitectState(prev => ({
                   ...prev,
                   premise: savedData.premise || '',
                   synopsis: savedData.synopsis || '',
                   coverImage: savedData.coverImage || '',
                   outline: savedData.outline || null,
                   activeRecordId: savedData.activeRecordId
               }));
           }
      }
  }, []);

  // 生成完成后刷新历史
  useEffect(() => {
      if (!architectState.isGenerating && architectState.outline) {
          loadHistory();
      }
  }, [architectState.isGenerating, architectState.outline]);

  // 自动保存当前状态
  useEffect(() => {
      if (architectState.activeRecordId && architectState.outline && !architectState.isGenerating) {
          updateHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, architectState.activeRecordId, {
              premise: architectState.premise,
              synopsis: architectState.synopsis,
              coverImage: architectState.coverImage,
              outline: architectState.outline
          });
          loadHistory();
      }
  }, [architectState.outline, architectState.synopsis, architectState.coverImage, architectState.premise, architectState.activeRecordId, architectState.isGenerating]);

  // 选中节点变化时，重置编辑状态
  useEffect(() => {
      setIsEditing(false);
      setEditName(selectedNode?.name || '');
      setEditDesc(selectedNode?.description || '');
      setGeneratedChapter(selectedNode?.content || '');
  }, [selectedNode]);

  // --- 事件处理 ---

  const handleGenerateOutline = async () => {
    if (!premise) return;
    setSelectedNode(null);
    // 直接调用 service 而不是 context 的 startArchitectGeneration 以便传入 globalPersona
    // (注意：这实际上复制了 AppContext 中的逻辑，理想情况应统一，但为了兼容性在此展开)
    setArchitectState(prev => ({ ...prev, isGenerating: true, progress: 1, remainingTime: 30, premise, outline: null, activeRecordId: undefined, generationStage: '启动中...' }));
    try {
        const result = await generateNovelArchitecture(premise, lang, model, globalPersona, (stage, percent) => setArchitectState(prev => ({ ...prev, generationStage: stage, progress: percent })));
        
        const combinedRoot: any = { id: Date.now().toString(), name: "故事大纲", type: "book", description: result.synopsis, children: [result.world, result.character, result.system, result.structure, result.chapters] };
        const newId = Date.now().toString();
        
        setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, outline: combinedRoot, synopsis: result.synopsis, coverImage: '', activeRecordId: newId, lastUpdated: Date.now() }));
        addHistoryItem(STORAGE_KEYS.HISTORY_ARCHITECT, { id: newId, timestamp: Date.now(), premise, synopsis: result.synopsis, outline: combinedRoot });
    } catch (error: any) {
        setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, outline: null }));
        alert("生成失败，请重试。");
    }
  };

  const handleClear = () => {
      setPremise('');
      setSynopsis('');
      setArchitectState(prev => ({ ...prev, outline: null, premise: '', synopsis: '', coverImage: '', activeRecordId: undefined }));
      setSelectedNode(null);
  }

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, id);
      setHistory(updated);
      if (architectState.activeRecordId === id) handleClear();
  };

  const loadRecord = (record: ArchitectRecord) => {
      setArchitectState(prev => ({
          ...prev,
          isGenerating: false,
          premise: record.premise,
          synopsis: record.synopsis || '',
          coverImage: record.coverImage || '',
          outline: record.outline,
          activeRecordId: record.id
      }));
      setSelectedNode(null);
  }

  // --- 树结构操作辅助函数 (递归) ---

  const updateNodeInTree = (root: OutlineNode, targetId: string, updates: Partial<OutlineNode>): OutlineNode => {
      if (root.id === targetId) return { ...root, ...updates };
      if (root.children) return { ...root, children: root.children.map(child => updateNodeInTree(child, targetId, updates)) };
      return root;
  }

  const addChildToNode = (root: OutlineNode, parentId: string, newChild: OutlineNode): OutlineNode => {
      if (root.id === parentId) return { ...root, children: [...(root.children || []), newChild] };
      if (root.children) return { ...root, children: root.children.map(child => addChildToNode(child, parentId, newChild)) };
      return root;
  }

  const addSiblingToNode = (root: OutlineNode, targetId: string, newSibling: OutlineNode): OutlineNode => {
    if (root.children) {
        if (root.children.some(child => child.id === targetId)) return { ...root, children: [...root.children, newSibling] };
        return { ...root, children: root.children.map(child => addSiblingToNode(child, targetId, newSibling)) };
    }
    return root;
  };

  const deleteNodeFromTree = (root: OutlineNode, targetId: string): OutlineNode | null => {
      if (root.id === targetId) return null;
      if (root.children) {
          const filteredChildren = root.children.map(child => deleteNodeFromTree(child, targetId)).filter((child): child is OutlineNode => child !== null);
          return { ...root, children: filteredChildren };
      }
      return root;
  }

  /**
   * 提取上下文
   * 遍历整个大纲树，提取角色和设定信息作为 AI 生成的上下文。
   */
  const extractContextFromTree = (root: OutlineNode): string => {
      let context = '';
      const traverse = (node: OutlineNode) => {
          if (node.type === 'character') context += `[Character] ${node.name}: ${node.description}\n`;
          if (node.type === 'setting') context += `[Setting] ${node.name}: ${node.description}\n`;
          if (node.children) node.children.forEach(traverse);
      }
      traverse(root);
      return context;
  }

  // --- 核心业务逻辑 ---

  /**
   * 生成草稿 (Drafting)
   * 针对选中的节点生成正文。
   */
  const handleGenerateChapter = async () => {
      if(!selectedNode || !architectState.outline) return;
      setGeneratingChapter(true);
      try {
          const selectedStyle = promptLibrary.find(p => p.id === selectedPromptId)?.content;
          
          // 提取全局上下文
          const worldContext = extractContextFromTree(architectState.outline);
          const fullContext = `Book Title: ${architectState.outline?.name}. Synopsis: ${architectState.synopsis}. \nWORLD & CHARACTERS:\n${worldContext}`;
          
          // 传入 globalPersona
          const result = await generateChapterContent(selectedNode, fullContext, lang, model, selectedStyle, draftWordCount, globalPersona);
          
          setGeneratedChapter(result);
          if (selectedNode.id) {
              const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { content: result });
              setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
              // 更新本地状态
              setSelectedNode(prev => prev ? ({ ...prev, content: result }) : null);
              
              // 自动切换到稿件视图查看结果
              alert(t('common.confirm') + ": Draft generated. Switching to Manuscript view.");
              setViewMode('manuscript');
          }
      } catch(e) {
          setGeneratedChapter("Error generating content.");
      } finally {
          setGeneratingChapter(false);
      }
  }

  // 草稿内容失焦保存
  const handleContentBlur = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      if (generatedChapter !== selectedNode.content) {
          const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { content: generatedChapter });
          setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
          setSelectedNode(prev => prev ? ({ ...prev, content: generatedChapter }) : null);
      }
  }

  /**
   * AI 递归扩展
   * 生成子节点结构（如：为“卷”生成“章节列表”）。
   */
  const handleAiExpandChildren = async () => {
      if (!architectState.outline || !selectedNode?.id) return;
      setExpandingNode(true);
      try {
          const context = `Book Title: ${architectState.outline?.name}. Synopsis: ${architectState.synopsis}`;
          const selectedStyle = expandPromptId ? promptLibrary.find(p => p.id === expandPromptId)?.content : undefined;
          
          // 传入 globalPersona
          const newChildren = await expandNodeContent(selectedNode, context, lang, model, selectedStyle, globalPersona);
          if (newChildren && newChildren.length > 0) {
              const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { children: [...(selectedNode.children || []), ...newChildren] });
              setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
              setSelectedNode(prev => prev ? ({ ...prev, children: [...(prev.children || []), ...newChildren] }) : null);
          }
      } catch (e) {
          alert("Failed to expand node.");
      } finally {
          setExpandingNode(false);
      }
  }

  // 保存节点编辑
  const handleSaveEdit = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { name: editName, description: editDesc });
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      setSelectedNode({ ...selectedNode, name: editName, description: editDesc });
      setIsEditing(false);
  };

  // 手动添加子节点
  const handleAddChild = (forcedType?: string) => {
      if (!architectState.outline || !selectedNode?.id) return;
      let newType: any = forcedType;
      
      // 智能推断节点类型
      if (!newType) {
        if (selectedNode.type === 'book') newType = 'volume';
        else if (selectedNode.type === 'volume' || selectedNode.type === 'act') newType = 'chapter';
        else if (selectedNode.type === 'chapter') newType = 'scene';
        else newType = 'scene';
      }
      
      const newNode: OutlineNode = { id: Math.random().toString(36).substring(2, 11), name: `New ${newType}`, type: newType, description: 'New...', children: [] };
      const newRoot = addChildToNode(architectState.outline, selectedNode.id, newNode);
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
  };

  // 手动添加兄弟节点
  const handleAddSibling = () => {
    if (!architectState.outline || !selectedNode?.id || selectedNode.type === 'book') return;
    const newNode: OutlineNode = { id: Math.random().toString(36).substring(2, 11), name: `New ${selectedNode.type}`, type: selectedNode.type, description: 'New...', children: [] };
    const newRoot = addSiblingToNode(architectState.outline, selectedNode.id, newNode);
    setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
  };

  // 删除节点
  const handleDeleteNode = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      if (selectedNode.type === 'book') { handleClear(); return; }
      if (!confirm(t('architect.confirmDelete'))) return;
      const newRoot = deleteNodeFromTree(architectState.outline, selectedNode.id);
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      setSelectedNode(null);
  };

  const handleAddPrompt = () => {
      if (!newPromptName || !newPromptContent) return;
      addPrompt({ id: Date.now().toString(), name: newPromptName, content: newPromptContent, tags: ['custom'] });
      setNewPromptName('');
      setNewPromptContent('');
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  const getWordCount = (text: string) => text ? text.length : 0;

  // --- 稿件视图逻辑 (Manuscript Logic) ---

  const calculateStats = (root: OutlineNode): { totalWords: number, totalChapters: number } => {
      let words = 0;
      let chapters = 0;
      const traverse = (node: OutlineNode) => {
          if (node.type === 'chapter' || node.type === 'scene') {
              if (node.content) words += getWordCount(node.content);
              if (node.type === 'chapter') chapters++;
          }
          if (node.children) node.children.forEach(traverse);
      }
      traverse(root);
      return { totalWords: words, totalChapters: chapters };
  }

  // 递归渲染稿件节点
  const renderManuscriptContent = (root: OutlineNode) => {
      if (!root.children) return null;
      
      return root.children.map((child) => {
          if (child.type === 'act' || child.type === 'volume') {
             // 渲染分卷/分幕
             const volumeStats = calculateStats(child);
             return (
                 <div key={child.id} className="mb-12 border-t-2 border-slate-900 pt-8">
                     <div className="flex items-center justify-between mb-6">
                        <h2 className="text-3xl font-bold text-slate-900">{child.name}</h2>
                        <div className="text-sm text-slate-500 font-mono">
                            {volumeStats.totalChapters} Chaps · {volumeStats.totalWords} Words
                        </div>
                     </div>
                     <p className="text-slate-500 italic mb-8 border-l-4 border-slate-200 pl-4">{child.description}</p>
                     
                     {/* 渲染子章节 */}
                     {child.children?.map(sub => renderManuscriptNode(sub))}
                 </div>
             )
          } else {
             // 直接渲染章节
             return renderManuscriptNode(child);
          }
      })
  }

  const renderManuscriptNode = (node: OutlineNode) => {
      if (node.type === 'character' || node.type === 'setting' || node.type === 'system') return null;
      
      const wordCount = getWordCount(node.content || '');
      const isJustGenerated = selectedNode?.id === node.id;

      return (
          <div key={node.id} id={`node-${node.id}`} className={`mb-8 pl-4 border-l transition-all duration-500 ${isJustGenerated ? 'border-teal-500 bg-teal-50/30' : 'border-slate-100 hover:border-teal-200'}`}>
              <div className="flex justify-between items-baseline mb-3 pt-2">
                  <div className={`font-bold text-slate-800 ${node.type === 'chapter' ? 'text-xl' : 'text-lg'}`}>
                      {node.name}
                  </div>
                  <div className="flex items-center gap-3">
                      {wordCount > 0 && <span className="text-xs text-slate-400 font-mono">{wordCount} Words</span>}
                      <button onClick={() => { setSelectedNode(node); setViewMode('map'); }} className="text-slate-400 hover:text-teal-600" title="Edit in Map">
                          <Edit2 size={14} />
                      </button>
                  </div>
              </div>
              
              {node.content ? (
                  <div className="prose prose-slate max-w-none whitespace-pre-wrap bg-white p-6 rounded-lg shadow-sm border border-slate-100 text-slate-700 leading-relaxed">
                      {node.content}
                  </div>
              ) : (
                  <div className="text-slate-400 italic text-sm pl-4 border-l-2 border-slate-200 py-2">
                      {node.description || 'No content drafted yet.'}
                  </div>
              )}

              {/* 递归渲染场景 */}
              {node.children && (
                  <div className="ml-4 mt-4">
                      {node.children.map(child => renderManuscriptNode(child))}
                  </div>
              )}
          </div>
      );
  };
  
  // 切换到稿件视图时自动滚动
  useEffect(() => {
      if (viewMode === 'manuscript' && selectedNode?.id) {
          setTimeout(() => {
              const el = document.getElementById(`node-${selectedNode.id}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 300);
      }
  }, [viewMode, selectedNode]);

  const manuscriptStats = architectState.outline ? calculateStats(architectState.outline) : { totalWords: 0, totalChapters: 0 };

  return (
    <div className="flex h-full relative">
      {/* 侧边栏：历史存档 */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
         <div className="p-4 border-b border-slate-200 bg-white/50 flex justify-between items-center">
             <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><FolderOpen size={12} /> {t('architect.historyTitle')}</h3>
             <button onClick={loadHistory} className="text-slate-400 hover:text-teal-600"><RefreshCw size={12} /></button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {history.map(item => (
                 <div key={item.id} onClick={() => loadRecord(item)} className={`p-3 rounded-lg cursor-pointer border ${architectState.activeRecordId === item.id ? 'bg-white border-teal-200 ring-1 ring-teal-500' : 'hover:bg-white border-transparent'}`}>
                     <div className="flex justify-between"><span className="text-xs font-bold truncate w-4/5">{item.premise}</span><button onClick={(e) => handleDeleteHistory(e, item.id)}><Trash2 size={12} /></button></div>
                     <p className="text-[10px] text-slate-400 mt-1">{formatDate(item.timestamp)}</p>
                 </div>
             ))}
         </div>
      </div>

      {/* 主画布区域 */}
      <div className={`flex flex-col h-full flex-1 transition-all duration-300 ${selectedNode && viewMode === 'map' ? 'mr-[33%]' : ''}`}>
         {/* 顶部输入栏 */}
         <div className="p-6 border-b border-slate-200 bg-white flex flex-col gap-4">
             <div className="flex justify-between items-center">
                 <div className="flex gap-2 max-w-2xl w-full">
                     <input type="text" value={premise} onChange={(e) => setPremise(e.target.value)} placeholder={t('architect.placeholder')} className="flex-1 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500" disabled={architectState.isGenerating} />
                     <button onClick={handleGenerateOutline} disabled={architectState.isGenerating || !premise} className="bg-slate-900 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50">
                         {architectState.isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Sparkles size={16}/>}
                         {t('architect.designBtn')}
                     </button>
                 </div>
                 
                 {/* 视图切换 */}
                 {architectState.outline && (
                     <div className="flex bg-slate-100 p-1 rounded-lg">
                         <button onClick={() => setViewMode('map')} className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${viewMode === 'map' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                             <Network size={14}/> {t('architect.views.map')}
                         </button>
                         <button onClick={() => setViewMode('manuscript')} className={`px-4 py-1.5 rounded text-xs font-bold flex items-center gap-2 ${viewMode === 'manuscript' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>
                             <FileText size={14}/> {t('architect.views.manuscript')}
                         </button>
                     </div>
                 )}
             </div>
             {architectState.generationStage && architectState.isGenerating && (
                 <div className="text-xs text-teal-600 font-mono flex items-center gap-2 animate-pulse">
                     <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                     {architectState.generationStage} ({architectState.progress}%)
                 </div>
             )}
         </div>

         {/* 核心展示区 */}
         <div className="flex-1 bg-slate-50 relative overflow-hidden">
             {!architectState.outline ? (
                 <div className="flex flex-col items-center justify-center h-full text-slate-400">
                     <Network size={64} className="opacity-10 mb-4" />
                     <p className="text-sm font-medium">Enter a premise to generate a novel blueprint.</p>
                 </div>
             ) : (
                 viewMode === 'map' ? (
                     <MindMap data={architectState.outline} onNodeClick={(node) => setSelectedNode(node)} />
                 ) : (
                     <div className="h-full overflow-y-auto p-12 bg-slate-100">
                         <div className="max-w-4xl mx-auto bg-white min-h-screen shadow-lg p-12 relative">
                             {/* 稿件头部统计 */}
                             <div className="absolute top-0 right-0 p-4 flex gap-4 text-xs text-slate-400 uppercase font-bold tracking-wider">
                                 <div>{t('architect.stats.totalWords')}: {manuscriptStats.totalWords}</div>
                                 <div>{t('architect.stats.totalChapters')}: {manuscriptStats.totalChapters}</div>
                             </div>

                             <h1 className="text-4xl font-bold text-center mb-4 mt-8">{architectState.outline.name}</h1>
                             <p className="text-center text-slate-500 italic mb-16 max-w-2xl mx-auto border-b pb-8">{architectState.synopsis}</p>
                             
                             {renderManuscriptContent(architectState.outline)}
                         </div>
                     </div>
                 )
             )}
         </div>
      </div>

      {/* 右侧属性面板 (仅在导图模式且选中节点时显示) */}
      {selectedNode && viewMode === 'map' && (
          <div className="absolute top-0 right-0 bottom-0 w-[33%] bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-300">
              {/* 面板头部 */}
              <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase text-white ${
                          selectedNode.type === 'book' ? 'bg-red-500' :
                          selectedNode.type === 'volume' ? 'bg-orange-500' :
                          selectedNode.type === 'chapter' ? 'bg-teal-500' :
                          'bg-slate-500'
                      }`}>
                          {t('architect.types.' + selectedNode.type) || selectedNode.type}
                      </span>
                      <span className="text-sm font-bold text-slate-700 truncate max-w-[150px]">{selectedNode.name}</span>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600"><X size={18}/></button>
              </div>

              {/* 面板内容 */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* 编辑区 */}
                  <div className="space-y-4">
                      {isEditing ? (
                          <>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t('architect.nodeName')}</label>
                                  <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded text-sm font-bold" />
                              </div>
                              <div>
                                  <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t('architect.nodeDesc')}</label>
                                  <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={5} className="w-full p-2 border rounded text-sm leading-relaxed" />
                              </div>
                              <div className="flex gap-2">
                                  <button onClick={handleSaveEdit} className="flex-1 bg-slate-900 text-white py-2 rounded text-xs font-bold">Save</button>
                                  <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded text-xs font-bold">Cancel</button>
                              </div>
                          </>
                      ) : (
                          <div onClick={() => setIsEditing(true)} className="group cursor-pointer">
                              <h2 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-teal-600 transition-colors flex items-center gap-2">
                                  {selectedNode.name} <Edit2 size={14} className="opacity-0 group-hover:opacity-50"/>
                              </h2>
                              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{selectedNode.description}</p>
                          </div>
                      )}
                  </div>

                  {/* 结构操作区 */}
                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Network size={12}/> {t('architect.structureActions')}</h4>
                      <div className="grid grid-cols-2 gap-2">
                          <button onClick={() => handleAddChild()} className="p-2 border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 flex items-center justify-center gap-1"><Plus size={14}/> {t('architect.addChild')}</button>
                          <button onClick={handleAddSibling} className="p-2 border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 flex items-center justify-center gap-1"><CopyPlus size={14}/> {t('architect.addSibling')}</button>
                          <button onClick={handleDeleteNode} className="p-2 border border-red-100 text-red-600 rounded text-xs font-medium hover:bg-red-50 flex items-center justify-center gap-1 col-span-2"><Trash2 size={14}/> {t('architect.deleteNode')}</button>
                      </div>
                  </div>

                  {/* AI 扩展区 */}
                  <div className="border-t border-slate-100 pt-6">
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><Sparkles size={12}/> {t('architect.aiExpand')}</h4>
                      <div className="space-y-3">
                          <select value={expandPromptId} onChange={e => setExpandPromptId(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs bg-white">
                              <option value="">{t('architect.defaultStyle')}</option>
                              {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                          <button onClick={handleAiExpandChildren} disabled={expandingNode} className="w-full py-2 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-2 shadow-sm">
                              {expandingNode ? <Loader2 className="animate-spin" size={14}/> : <Network size={14}/>} {t('architect.expandBtn')}
                          </button>
                      </div>
                  </div>

                  {/* 草稿生成区 */}
                  {(selectedNode.type === 'chapter' || selectedNode.type === 'scene') && (
                      <div className="border-t border-slate-100 pt-6 pb-8">
                           <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 flex items-center gap-2"><FileText size={12}/> {t('architect.content')}</h4>
                           
                           {/* 草稿预览与编辑 */}
                           <textarea 
                              value={generatedChapter} 
                              onChange={e => setGeneratedChapter(e.target.value)}
                              onBlur={handleContentBlur}
                              placeholder={t('architect.noContent')}
                              className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded text-xs leading-relaxed resize-none focus:bg-white focus:ring-1 focus:ring-teal-500 mb-3"
                           />
                           
                           <div className="flex gap-2 items-center mb-3">
                               <Hash size={14} className="text-slate-400"/>
                               <input 
                                  type="number" 
                                  value={draftWordCount} 
                                  onChange={e => setDraftWordCount(Number(e.target.value))}
                                  className="w-20 p-1 border rounded text-xs text-center"
                                  step={500}
                               />
                               <span className="text-xs text-slate-400">words</span>
                           </div>

                           <select value={selectedPromptId} onChange={e => setSelectedPromptId(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-xs bg-white mb-3">
                              <option value="">{t('architect.prompts.select')}</option>
                              {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                           </select>

                           <button onClick={handleGenerateChapter} disabled={generatingChapter} className="w-full py-2 bg-indigo-600 text-white rounded text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-sm">
                               {generatingChapter ? <Loader2 className="animate-spin" size={14}/> : <Sparkles size={14}/>} {t('architect.generateDraft')}
                           </button>
                      </div>
                  )}

              </div>
          </div>
      )}
    </div>
  );
};
