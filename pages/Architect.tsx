
import React, { useState, useEffect } from 'react';
import { generateChapterContent, generateChildNodes, generateCover } from '../services/geminiService';
import { OutlineNode, ArchitectRecord, ImageModel } from '../types';
import { MindMap } from '../components/MindMap';
import { Network, Loader2, FileText, Trash2, FolderOpen, RefreshCw, Save, Plus, Edit2, X, Check, CopyPlus, Sparkles, BookOpen, Image as ImageIcon, Palette, Settings2, PlusCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem, updateHistoryItem } from '../services/storageService';

export const Architect: React.FC = () => {
  const [premise, setPremise] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null);
  
  // View Mode: 'map' (MindMap) or 'manuscript' (Reader View)
  const [viewMode, setViewMode] = useState<'map' | 'manuscript'>('map');

  // Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Generation States
  const [generatedChapter, setGeneratedChapter] = useState('');
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const [expandingNode, setExpandingNode] = useState(false);

  // Cover Generation
  const [showCoverModal, setShowCoverModal] = useState(false);
  const [coverPrompt, setCoverPrompt] = useState('');
  const [coverStyle, setCoverStyle] = useState('Epic Fantasy Art');
  const [isGeneratingCover, setIsGeneratingCover] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<string>(ImageModel.IMAGEN_3);

  // Prompt Library
  const [selectedPromptId, setSelectedPromptId] = useState<string>('');
  const [showPromptLib, setShowPromptLib] = useState(false);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');

  const [history, setHistory] = useState<ArchitectRecord[]>([]);
  
  const { model, architectState, setArchitectState, startArchitectGeneration, promptLibrary, addPrompt, deletePrompt } = useApp();
  const { t, lang } = useI18n();

  const loadHistory = () => {
      setTimeout(() => {
          setHistory(getHistory<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT));
      }, 100);
  };

  // Sync Global State to Local UI
  useEffect(() => {
      if (architectState.premise) setPremise(architectState.premise);
      if (architectState.synopsis) setSynopsis(architectState.synopsis);
  }, [architectState.premise, architectState.synopsis, architectState.outline]);

  // Initial Load
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

  useEffect(() => {
      if (!architectState.isGenerating && architectState.outline) {
          loadHistory();
      }
  }, [architectState.isGenerating, architectState.outline]);

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

  useEffect(() => {
      setIsEditing(false);
      setEditName(selectedNode?.name || '');
      setEditDesc(selectedNode?.description || '');
      setGeneratedChapter(selectedNode?.content || '');
  }, [selectedNode]);

  const handleGenerateOutline = () => {
    if (!premise) return;
    setSelectedNode(null);
    startArchitectGeneration(premise, lang);
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

  // --- Tree Operations ---

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

  // --- Generation & Editing ---

  const handleGenerateChapter = async () => {
      if(!selectedNode || !architectState.outline) return;
      setGeneratingChapter(true);
      try {
          const selectedStyle = promptLibrary.find(p => p.id === selectedPromptId)?.content;
          const context = `Book Title: ${architectState.outline?.name}. Synopsis: ${architectState.synopsis}. Description: ${architectState.outline?.description}`;
          
          const result = await generateChapterContent(selectedNode, context, lang, model, selectedStyle);
          
          setGeneratedChapter(result);
          if (selectedNode.id) {
              const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { content: result });
              setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
              setSelectedNode(prev => prev ? ({ ...prev, content: result }) : null);
          }
      } catch(e) {
          setGeneratedChapter("Error generating content.");
      } finally {
          setGeneratingChapter(false);
      }
  }

  const handleContentBlur = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      if (generatedChapter !== selectedNode.content) {
          const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { content: generatedChapter });
          setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
          setSelectedNode(prev => prev ? ({ ...prev, content: generatedChapter }) : null);
      }
  }

  const handleAiExpandChildren = async () => {
      if (!architectState.outline || !selectedNode?.id) return;
      setExpandingNode(true);
      try {
          const context = `Book Title: ${architectState.outline?.name}. Synopsis: ${architectState.synopsis}`;
          const newChildren = await generateChildNodes(selectedNode, context, lang, model);
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

  const handleSaveEdit = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      const newRoot = updateNodeInTree(architectState.outline, selectedNode.id, { name: editName, description: editDesc });
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      setSelectedNode({ ...selectedNode, name: editName, description: editDesc });
      setIsEditing(false);
  };

  const handleAddChild = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      const newType = selectedNode.type === 'book' ? 'act' : selectedNode.type === 'act' ? 'chapter' : 'scene';
      const newNode: OutlineNode = { id: Math.random().toString(36).substring(2, 11), name: `New ${newType}`, type: newType, description: 'New...', children: [] };
      const newRoot = addChildToNode(architectState.outline, selectedNode.id, newNode);
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
  };

  const handleAddSibling = () => {
    if (!architectState.outline || !selectedNode?.id || selectedNode.type === 'book') return;
    const newNode: OutlineNode = { id: Math.random().toString(36).substring(2, 11), name: `New ${selectedNode.type}`, type: selectedNode.type, description: 'New...', children: [] };
    const newRoot = addSiblingToNode(architectState.outline, selectedNode.id, newNode);
    setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
  };

  const handleDeleteNode = () => {
      if (!architectState.outline || !selectedNode?.id) return;
      if (selectedNode.type === 'book') { handleClear(); return; }
      if (!confirm(t('architect.confirmDelete'))) return;
      const newRoot = deleteNodeFromTree(architectState.outline, selectedNode.id);
      setArchitectState(prev => ({ ...prev, outline: newRoot, lastUpdated: Date.now() }));
      setSelectedNode(null);
  };

  // --- Cover Generation ---

  const handleGenerateCover = async () => {
      if (!architectState.outline) return;
      setIsGeneratingCover(true);
      const finalPrompt = `Book Cover Art. Title: "${architectState.outline.name}". Style: ${coverStyle}. Description: ${coverPrompt || architectState.synopsis || architectState.outline.name}. No text overlay. High quality, detailed.`;
      
      try {
          const base64 = await generateCover(finalPrompt, selectedImageModel);
          setArchitectState(prev => ({ ...prev, coverImage: base64 }));
          setShowCoverModal(false);
      } catch (e) {
          alert("Failed to generate cover.");
      } finally {
          setIsGeneratingCover(false);
      }
  }

  // --- Prompt Library ---

  const handleAddPrompt = () => {
      if (!newPromptName || !newPromptContent) return;
      addPrompt({ id: Date.now().toString(), name: newPromptName, content: newPromptContent, tags: ['custom'] });
      setNewPromptName('');
      setNewPromptContent('');
  }

  // --- Render Helpers ---

  const formatDate = (ts: number) => new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric' });

  // Recursive render for Manuscript View
  const renderManuscriptNode = (node: OutlineNode, level: number = 0) => {
      return (
          <div key={node.id} className="mb-6">
              {node.type !== 'book' && (
                  <div className={`mb-2 font-bold text-slate-800 ${node.type === 'act' ? 'text-2xl border-b pb-2 mt-8' : node.type === 'chapter' ? 'text-xl mt-6' : 'text-lg'}`}>
                      {node.name}
                  </div>
              )}
              {node.content ? (
                  <div className="prose prose-slate max-w-none whitespace-pre-wrap bg-white p-6 rounded-lg shadow-sm border border-slate-100">
                      {node.content}
                  </div>
              ) : (
                  <div className="text-slate-400 italic text-sm pl-4 border-l-2 border-slate-200">
                      {node.description} (No content generated)
                  </div>
              )}
              {node.children && node.children.map(child => renderManuscriptNode(child, level + 1))}
          </div>
      );
  };

  return (
    <div className="flex h-full relative">
      {/* Sidebar */}
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

      {/* Main Area */}
      <div className={`flex flex-col h-full flex-1 transition-all duration-300 ${selectedNode && viewMode === 'map' ? 'mr-[33%]' : ''}`}>
         {/* Top Bar */}
         <div className="p-6 border-b border-slate-200 bg-white flex flex-col gap-4">
             <div className="flex justify-between items-center">
                 <div className="flex gap-2 max-w-2xl w-full">
                     <input type="text" value={premise} onChange={(e) => setPremise(e.target.value)} placeholder={t('architect.placeholder')} className="flex-1 p-2 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-teal-500" disabled={architectState.isGenerating} />
                     <button onClick={handleGenerateOutline} disabled={architectState.isGenerating || !premise} className="bg-slate-900 text-white px-4 py-2 rounded text-sm hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">{architectState.isGenerating ? <Loader2 className="animate-spin" size={16}/> : <Network size={16}/>} {t('architect.designBtn')}</button>
                 </div>
                 {/* View Toggle */}
                 {architectState.outline && (
                     <div className="flex bg-slate-100 p-1 rounded-lg">
                         <button onClick={() => setViewMode('map')} className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 ${viewMode === 'map' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}><Network size={14} /> {t('architect.views.map')}</button>
                         <button onClick={() => setViewMode('manuscript')} className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-2 ${viewMode === 'manuscript' ? 'bg-white shadow text-teal-700' : 'text-slate-500'}`}><BookOpen size={14} /> {t('architect.views.manuscript')}</button>
                     </div>
                 )}
             </div>
             {/* Synopsis & Meta */}
             <div className="w-full max-w-4xl relative">
                 <textarea value={synopsis} onChange={(e) => setSynopsis(e.target.value)} onBlur={() => setArchitectState(prev => ({...prev, synopsis}))} placeholder={t('architect.synopsisPlaceholder')} rows={2} className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded text-slate-600 resize-none" />
             </div>
         </div>
         
         {/* Content Area */}
         <div className="flex-1 bg-slate-50 overflow-hidden relative">
            {/* Background Loading Overlay */}
            {architectState.isGenerating && <div className="absolute inset-0 bg-slate-50/90 z-20 flex items-center justify-center"><div className="text-teal-600 font-bold animate-pulse">{t('common.bgTask')}</div></div>}

            {viewMode === 'map' ? (
                <MindMap data={architectState.outline} onNodeClick={setSelectedNode} />
            ) : (
                // MANUSCRIPT VIEW
                <div className="h-full overflow-y-auto p-8 max-w-4xl mx-auto bg-white shadow-lg my-4">
                    {architectState.outline ? (
                        <div className="space-y-8">
                            {/* Cover & Title */}
                            <div className="text-center border-b pb-8">
                                <div className="w-48 h-64 mx-auto bg-slate-200 mb-6 rounded shadow-inner flex items-center justify-center relative group overflow-hidden">
                                    {architectState.coverImage ? (
                                        <img src={architectState.coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <ImageIcon className="text-slate-400" size={48} />
                                    )}
                                    <button onClick={() => setShowCoverModal(true)} className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-bold transition-opacity">
                                        <Palette className="mr-2" /> {t('architect.cover.generate')}
                                    </button>
                                </div>
                                <h1 className="text-4xl font-bold text-slate-900 mb-4">{architectState.outline.name}</h1>
                                <p className="text-slate-500 italic max-w-lg mx-auto">{architectState.synopsis}</p>
                            </div>
                            {/* Content */}
                            <div className="py-4">
                                {architectState.outline.children?.map(child => renderManuscriptNode(child))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-400 mt-20">{t('mindmap.empty')}</div>
                    )}
                </div>
            )}
         </div>
      </div>

      {/* Right Panel (Map Mode Only) */}
      {selectedNode && viewMode === 'map' && (
          <div className="w-1/3 bg-white border-l border-slate-200 h-full shadow-xl absolute right-0 top-0 flex flex-col z-10">
              <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between">
                  <span className="text-xs font-bold uppercase px-2 py-1 rounded bg-blue-100 text-blue-700">{selectedNode.type}</span>
                  <button onClick={() => setSelectedNode(null)}>×</button>
              </div>
              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {isEditing ? (
                      <div className="space-y-4">
                          <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded font-bold" />
                          <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows={5} className="w-full p-2 border rounded" />
                          <div className="flex gap-2"><button onClick={handleSaveEdit} className="flex-1 bg-teal-600 text-white py-2 rounded">{t('common.save')}</button><button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-200 py-2 rounded">{t('common.cancel')}</button></div>
                      </div>
                  ) : (
                      <>
                        <div>
                            <h2 className="text-xl font-bold mb-2">{selectedNode.name}</h2>
                            <div className="text-sm bg-slate-50 p-3 rounded border text-slate-700">{selectedNode.description}</div>
                            <button onClick={() => setIsEditing(true)} className="text-teal-600 text-xs mt-2 flex items-center gap-1"><Edit2 size={12}/> {t('common.edit')}</button>
                        </div>
                        <div className="border-t pt-4 grid grid-cols-2 gap-2">
                            <button onClick={handleAiExpandChildren} disabled={expandingNode || selectedNode.type==='scene'} className="col-span-2 bg-indigo-50 text-indigo-700 py-2 rounded flex justify-center gap-2">{expandingNode?<Loader2 className="animate-spin"/>:<Sparkles/>} {t('architect.aiExpand')}</button>
                            <button onClick={handleAddChild} className="border py-2 rounded hover:bg-slate-50"><Plus size={14}/> {t('architect.addChild')}</button>
                            {selectedNode.type!=='book' && <button onClick={handleAddSibling} className="border py-2 rounded hover:bg-slate-50"><CopyPlus size={14}/> {t('architect.addSibling')}</button>}
                            <button onClick={handleDeleteNode} className="border border-red-200 text-red-600 py-2 rounded hover:bg-red-50"><Trash2 size={14}/> {t('architect.deleteNode')}</button>
                        </div>

                        {selectedNode.type === 'chapter' && (
                            <div className="border-t pt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-xs font-bold uppercase">{t('architect.content')}</h3>
                                    <button onClick={() => setShowPromptLib(!showPromptLib)} className="text-xs text-teal-600 flex items-center gap-1 hover:underline"><Settings2 size={12}/> {selectedPromptId ? promptLibrary.find(p=>p.id===selectedPromptId)?.name : t('architect.prompts.select')}</button>
                                </div>
                                {showPromptLib && (
                                    <div className="mb-4 bg-slate-50 p-3 rounded border space-y-2">
                                        <div className="flex justify-between"><h4 className="text-xs font-bold">{t('architect.prompts.title')}</h4><button onClick={() => setShowPromptLib(false)}><X size={12}/></button></div>
                                        <select value={selectedPromptId} onChange={(e) => setSelectedPromptId(e.target.value)} className="w-full text-xs p-1 border rounded">
                                            <option value="">None (Default)</option>
                                            {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        <div className="pt-2 border-t mt-2">
                                            <input placeholder={t('architect.prompts.name')} value={newPromptName} onChange={e=>setNewPromptName(e.target.value)} className="w-full text-xs p-1 mb-1 border rounded"/>
                                            <textarea placeholder={t('architect.prompts.instruction')} value={newPromptContent} onChange={e=>setNewPromptContent(e.target.value)} className="w-full text-xs p-1 mb-1 border rounded" rows={2}/>
                                            <button onClick={handleAddPrompt} className="w-full bg-slate-200 text-xs py-1 rounded hover:bg-slate-300">{t('architect.prompts.add')}</button>
                                        </div>
                                    </div>
                                )}
                                <div className="relative">
                                    <textarea value={generatedChapter} onChange={e => setGeneratedChapter(e.target.value)} onBlur={handleContentBlur} className="w-full h-64 p-3 border rounded text-sm resize-none" disabled={generatingChapter} placeholder={t('architect.noContent')} />
                                    <button onClick={handleGenerateChapter} disabled={generatingChapter} className="absolute bottom-4 right-4 bg-teal-600 text-white px-3 py-1 rounded text-xs shadow hover:bg-teal-700 disabled:opacity-50 flex items-center gap-1">{generatingChapter?<Loader2 className="animate-spin" size={12}/>:<FileText size={12}/>} {t('architect.generateDraft')}</button>
                                </div>
                            </div>
                        )}
                      </>
                  )}
              </div>
          </div>
      )}

      {/* Cover Generator Modal */}
      {showCoverModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
              <div className="bg-white p-6 rounded-xl w-96 shadow-2xl">
                  <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Palette className="text-teal-600"/> {t('architect.cover.generate')}</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-slate-500">{t('architect.cover.promptLabel')}</label>
                          <textarea value={coverPrompt} onChange={e=>setCoverPrompt(e.target.value)} rows={3} className="w-full border rounded p-2 text-sm mt-1" placeholder="Describe the cover scene..." />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500">{t('architect.cover.styleLabel')}</label>
                          <select value={coverStyle} onChange={e=>setCoverStyle(e.target.value)} className="w-full border rounded p-2 text-sm mt-1">
                              <option value="Epic Fantasy Art">Epic Fantasy (Xianxia)</option>
                              <option value="Cyberpunk Anime">Cyberpunk Anime</option>
                              <option value="Watercolor Painting">Watercolor</option>
                              <option value="Dark Horror Realistic">Dark Horror</option>
                              <option value="Modern Minimalist">Modern Minimalist</option>
                          </select>
                      </div>
                       <div>
                          <label className="text-xs font-bold text-slate-500">{t('architect.cover.modelLabel')}</label>
                          <select value={selectedImageModel} onChange={e=>setSelectedImageModel(e.target.value)} className="w-full border rounded p-2 text-sm mt-1">
                              <option value="imagen-3.0-generate-001">Imagen 3 (High Quality)</option>
                              <option value="gemini-2.5-flash-image">Gemini Flash Image (Fast)</option>
                          </select>
                      </div>
                      <div className="flex gap-2 pt-2">
                          <button onClick={handleGenerateCover} disabled={isGeneratingCover} className="flex-1 bg-teal-600 text-white py-2 rounded hover:bg-teal-700 flex justify-center">{isGeneratingCover?<Loader2 className="animate-spin"/>:t('architect.cover.generate')}</button>
                          <button onClick={()=>setShowCoverModal(false)} className="flex-1 bg-slate-200 py-2 rounded hover:bg-slate-300">{t('common.cancel')}</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
