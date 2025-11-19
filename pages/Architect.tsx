
import React, { useState, useEffect } from 'react';
import { generateChapterContent } from '../services/geminiService';
import { OutlineNode, ArchitectRecord } from '../types';
import { MindMap } from '../components/MindMap';
import { Network, Loader2, FileText, Trash2, FolderOpen, RefreshCw, Save, Plus, Edit2, X, Check } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem } from '../services/storageService';

export const Architect: React.FC = () => {
  // Local state for inputs and selection
  const [premise, setPremise] = useState('');
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null);
  
  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Chapter generation is still local (fast enough usually, or can be extended later)
  const [generatedChapter, setGeneratedChapter] = useState('');
  const [generatingChapter, setGeneratingChapter] = useState(false);
  
  const [history, setHistory] = useState<ArchitectRecord[]>([]);
  
  // Global State (Background Process)
  const { model, architectState, setArchitectState, startArchitectGeneration } = useApp();
  const { t, lang } = useI18n();

  const loadHistory = () => {
      setTimeout(() => {
          setHistory(getHistory<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT));
      }, 100);
  };

  // Sync Global State to Local UI when Global changes (e.g. generation finished or page load)
  useEffect(() => {
      if (architectState.premise) setPremise(architectState.premise);
  }, [architectState.premise, architectState.outline]);

  // Initial Load
  useEffect(() => {
      loadHistory();
      if (!architectState.outline && !architectState.isGenerating) {
           const savedData = loadFromStorage(STORAGE_KEYS.ARCHITECT);
           if (savedData) {
               setArchitectState(prev => ({
                   ...prev,
                   premise: savedData.premise || '',
                   outline: savedData.outline || null
               }));
           }
      }
  }, []);

  // Update history when generation finishes
  useEffect(() => {
      if (!architectState.isGenerating && architectState.outline) {
          loadHistory();
      }
  }, [architectState.isGenerating, architectState.outline]);

  // When selected node changes, reset editing state
  useEffect(() => {
      setIsEditing(false);
      setEditName(selectedNode?.name || '');
      setEditDesc(selectedNode?.description || '');
      setGeneratedChapter('');
  }, [selectedNode]);

  const handleGenerateOutline = () => {
    if (!premise) return;
    setSelectedNode(null);
    startArchitectGeneration(premise, lang);
  };

  const handleClear = () => {
      setPremise('');
      setArchitectState(prev => ({ ...prev, outline: null, premise: '' }));
      setSelectedNode(null);
  }

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, id);
      setHistory(updated);
  };

  const loadRecord = (record: ArchitectRecord) => {
      setArchitectState(prev => ({
          ...prev,
          isGenerating: false,
          premise: record.premise,
          outline: record.outline
      }));
      setSelectedNode(null);
  }

  const handleGenerateChapter = async () => {
      if(!selectedNode) return;
      setGeneratingChapter(true);
      try {
          const context = `Book Title: ${architectState.outline?.name}. Description: ${architectState.outline?.description}`;
          const result = await generateChapterContent(selectedNode, context, lang, model);
          setGeneratedChapter(result);
      } catch(e) {
          setGeneratedChapter("Error generating content.");
      } finally {
          setGeneratingChapter(false);
      }
  }

  // --- Tree Manipulation Helpers ---

  // Helper to traverse and update a node (immutable)
  const updateNodeInTree = (root: OutlineNode, targetId: string, updates: Partial<OutlineNode>): OutlineNode => {
      if (root.id === targetId) {
          return { ...root, ...updates };
      }
      if (root.children) {
          return {
              ...root,
              children: root.children.map(child => updateNodeInTree(child, targetId, updates))
          };
      }
      return root;
  }

  const addChildToNode = (root: OutlineNode, parentId: string, newChild: OutlineNode): OutlineNode => {
      if (root.id === parentId) {
          return {
              ...root,
              children: [...(root.children || []), newChild]
          };
      }
      if (root.children) {
          return {
              ...root,
              children: root.children.map(child => addChildToNode(child, parentId, newChild))
          };
      }
      return root;
  }

  const deleteNodeFromTree = (root: OutlineNode, targetId: string): OutlineNode | null => {
      if (root.id === targetId) return null; // Should probably not happen for root usually unless clearing all
      if (root.children) {
          const filteredChildren = root.children
              .map(child => deleteNodeFromTree(child, targetId))
              .filter((child): child is OutlineNode => child !== null);
          return { ...root, children: filteredChildren };
      }
      return root;
  }

  // --- Actions ---

  const handleSaveEdit = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      
      const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, {
          name: editName,
          description: editDesc
      });

      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      
      // Update selected node reference to the new one so UI reflects changes
      setSelectedNode({ ...selectedNode, name: editName, description: editDesc });
      setIsEditing(false);
  };

  const handleAddChild = () => {
      if (!architectState.outline || !selectedNode?.id) return;

      const newType = selectedNode.type === 'book' ? 'act' : selectedNode.type === 'act' ? 'chapter' : 'scene';
      const newNode: OutlineNode = {
          id: Math.random().toString(36).substring(2, 11),
          name: `New ${t(`architect.types.${newType}`)}`,
          type: newType,
          description: 'New description...',
          children: []
      };

      const newRoot = addChildToNode(architectState.outline, selectedNode.id, newNode);
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      
      // Ideally we might want to auto-select the new node, but for now we stay on parent
  };

  const handleDeleteNode = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      if (selectedNode.type === 'book') {
          handleClear(); // Deleting root clears everything
          return;
      }

      if (!confirm(t('architect.confirmDelete'))) return;

      const newRoot = deleteNodeFromTree(architectState.outline, selectedNode.id);
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      setSelectedNode(null);
  };

  const formatDate = (ts: number) => {
      return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex h-full relative">
      {/* Left History Sidebar */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
         <div className="p-4 border-b border-slate-200 bg-white/50 flex justify-between items-center">
             <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                 <FolderOpen size={12} /> {t('architect.historyTitle')}
             </h3>
             <button onClick={loadHistory} className="text-slate-400 hover:text-teal-600 transition-colors" title={t('common.refresh')}>
                  <RefreshCw size={12} />
             </button>
         </div>
         <div className="flex-1 overflow-y-auto p-2 space-y-2">
             {history.length === 0 ? (
                 <div className="text-center text-slate-400 text-xs mt-10">{t('common.noHistory')}</div>
             ) : (
                 history.map(item => (
                     <div 
                         key={item.id}
                         onClick={() => loadRecord(item)}
                         className={`p-3 rounded-lg cursor-pointer group transition-all border ${
                             architectState.outline === item.outline ? 'bg-white border-teal-200 shadow-sm' : 'hover:bg-white border-transparent hover:border-slate-200'
                         }`}
                     >
                         <div className="flex justify-between items-start">
                             <span className="text-xs font-bold text-slate-700 truncate w-4/5">{item.premise}</span>
                             <button onClick={(e) => handleDeleteHistory(e, item.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100">
                                 <Trash2 size={12} />
                             </button>
                         </div>
                         <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                             {formatDate(item.timestamp)}
                         </p>
                     </div>
                 ))
             )}
         </div>
      </div>

      {/* Main Workspace */}
      <div className={`flex flex-col h-full flex-1 transition-all duration-300 ${selectedNode ? 'mr-[33%]' : ''}`}>
         <div className="p-6 border-b border-slate-200 bg-white flex items-center gap-4 justify-between">
             <div className="flex-1 flex gap-2 max-w-3xl">
                 <input 
                    type="text" 
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    placeholder={t('architect.placeholder')}
                    className="flex-1 p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                    disabled={architectState.isGenerating}
                 />
                 <button 
                    onClick={handleGenerateOutline}
                    disabled={architectState.isGenerating || !premise}
                    className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                 >
                    {architectState.isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Network size={16} />}
                    {t('architect.designBtn')}
                 </button>
                 {architectState.outline && !architectState.isGenerating && (
                     <button onClick={handleClear} className="p-2 text-slate-400 hover:text-red-500 border border-slate-200 rounded-md">
                         <Trash2 size={16} />
                     </button>
                 )}
             </div>
             <div className="flex items-center gap-2 text-xs text-slate-400">
                <Save size={12} /> <span>Auto-saved</span>
             </div>
         </div>
         
         <div className="flex-1 bg-slate-50 p-6 overflow-hidden flex flex-col relative">
            {architectState.isGenerating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/90 z-10">
                    <div className="w-64">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                            <span>{t('common.bgTask')}</span>
                            <span>{Math.round(architectState.progress)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div 
                                className="bg-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${architectState.progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between mt-2">
                            <p className="text-xs text-slate-400">{t('common.safeToLeave')}</p>
                            <p className="text-xs font-mono text-teal-600">{t('common.remainingTime').replace('{time}', architectState.remainingTime.toString())}</p>
                        </div>
                    </div>
                </div>
            ) : null}

            <MindMap data={architectState.outline} onNodeClick={setSelectedNode} />
            {!architectState.outline && !architectState.isGenerating && <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none opacity-50">{t('mindmap.empty')}</p>}
            <p className="text-xs text-slate-400 mt-2 text-center">{t('architect.tip')}</p>
         </div>
      </div>

      {/* Slide-over Panel for Node Details & Editing */}
      {selectedNode && (
          <div className="w-1/3 bg-white border-l border-slate-200 h-full shadow-xl absolute right-0 top-0 flex flex-col animate-in slide-in-from-right duration-300 z-10">
              {/* Panel Header */}
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                          selectedNode.type === 'book' ? 'bg-red-100 text-red-700' : 
                          selectedNode.type === 'act' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                          {t(`architect.types.${selectedNode.type}`) || selectedNode.type}
                      </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {!isEditing && (
                        <button onClick={() => setIsEditing(true)} className="text-slate-400 hover:text-teal-600" title={t('common.edit')}>
                            <Edit2 size={16} />
                        </button>
                    )}
                    <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">×</button>
                  </div>
              </div>
              
              {/* Panel Content */}
              <div className="p-6 overflow-y-auto flex-1">
                  {isEditing ? (
                      // --- EDIT MODE ---
                      <div className="space-y-4">
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t('architect.nodeName')}</label>
                              <input 
                                  type="text"
                                  value={editName}
                                  onChange={e => setEditName(e.target.value)}
                                  className="w-full p-2 border border-slate-300 rounded text-sm font-bold focus:ring-2 focus:ring-teal-500 focus:outline-none"
                              />
                          </div>
                          <div>
                              <label className="text-xs font-bold text-slate-400 uppercase block mb-1">{t('architect.nodeDesc')}</label>
                              <textarea 
                                  value={editDesc}
                                  onChange={e => setEditDesc(e.target.value)}
                                  rows={5}
                                  className="w-full p-2 border border-slate-300 rounded text-sm leading-relaxed focus:ring-2 focus:ring-teal-500 focus:outline-none resize-none"
                              />
                          </div>
                          <div className="flex gap-2 pt-2">
                              <button onClick={handleSaveEdit} className="flex-1 bg-teal-600 text-white py-2 rounded text-sm font-medium hover:bg-teal-700 flex items-center justify-center gap-2">
                                  <Check size={14} /> {t('common.save')}
                              </button>
                              <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-200 text-slate-600 py-2 rounded text-sm font-medium hover:bg-slate-300 flex items-center justify-center gap-2">
                                  <X size={14} /> {t('common.cancel')}
                              </button>
                          </div>
                      </div>
                  ) : (
                      // --- VIEW MODE ---
                      <>
                        <h2 className="text-xl font-bold text-slate-900 mb-4 leading-tight">{selectedNode.name}</h2>
                        
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">{t('architect.description')}</h3>
                        <p className="text-slate-700 mb-6 leading-relaxed text-sm bg-slate-50 p-3 rounded border border-slate-100">{selectedNode.description}</p>
                        
                        {/* Structural Actions */}
                        <div className="mb-6 border-t border-b border-slate-100 py-4">
                            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">{t('architect.actions')}</h3>
                            <div className="flex gap-2">
                                <button 
                                    onClick={handleAddChild}
                                    className="flex-1 py-2 border border-slate-200 rounded text-xs font-medium hover:bg-slate-50 text-slate-600 flex items-center justify-center gap-1"
                                >
                                    <Plus size={12} /> {t('architect.addChild')}
                                </button>
                                <button 
                                    onClick={handleDeleteNode}
                                    className="flex-1 py-2 border border-red-200 rounded text-xs font-medium hover:bg-red-50 text-red-600 flex items-center justify-center gap-1"
                                >
                                    <Trash2 size={12} /> {t('architect.deleteNode')}
                                </button>
                            </div>
                        </div>

                        {/* Chapter Content Generation */}
                        {selectedNode.type === 'chapter' && (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-xs font-bold text-slate-400 uppercase">{t('architect.content')}</h3>
                                    <button 
                                        onClick={handleGenerateChapter}
                                        disabled={generatingChapter}
                                        className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 flex items-center gap-1 disabled:opacity-50 shadow-sm"
                                    >
                                        {generatingChapter ? <Loader2 className="animate-spin" size={12}/> : <FileText size={12}/>}
                                        {t('architect.generateDraft')}
                                    </button>
                                </div>
                                
                                <div className="bg-white p-4 rounded-lg border border-slate-200 min-h-[200px] text-sm text-slate-700 whitespace-pre-wrap shadow-inner">
                                    {generatingChapter ? (
                                        <div className="flex items-center justify-center h-20 text-slate-400 gap-2">
                                            <Loader2 className="animate-spin" size={16}/> {t('architect.writing')}
                                        </div>
                                    ) : generatedChapter || <span className="text-slate-400 italic">{t('architect.noContent')}</span>}
                                </div>
                            </>
                        )}
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
