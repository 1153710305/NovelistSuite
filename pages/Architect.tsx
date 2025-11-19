
import React, { useState, useEffect } from 'react';
import { generateOutline, generateChapterContent } from '../services/geminiService';
import { OutlineNode, ArchitectRecord } from '../types';
import { MindMap } from '../components/MindMap';
import { Network, Loader2, FileText, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, addHistoryItem, getHistory, deleteHistoryItem } from '../services/storageService';

export const Architect: React.FC = () => {
  const [premise, setPremise] = useState('');
  const [outline, setOutline] = useState<OutlineNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null);
  const [generatedChapter, setGeneratedChapter] = useState('');
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const [history, setHistory] = useState<ArchitectRecord[]>([]);
  
  const { t, lang } = useI18n();
  const { model } = useApp();

  const loadHistory = () => {
      setHistory(getHistory<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT));
  };

  // Load Data & History
  useEffect(() => {
      const savedData = loadFromStorage(STORAGE_KEYS.ARCHITECT);
      if (savedData) {
          if (savedData.premise) setPremise(savedData.premise);
          if (savedData.outline) setOutline(savedData.outline);
      }
      loadHistory();
  }, []);

  // Save Active State
  useEffect(() => {
      const timeoutId = setTimeout(() => {
        saveToStorage(STORAGE_KEYS.ARCHITECT, {
            premise,
            outline
        });
      }, 1000);
      return () => clearTimeout(timeoutId);
  }, [premise, outline]);

  const handleGenerateOutline = async () => {
    if (!premise) return;
    setLoading(true);
    setOutline(null);
    setSelectedNode(null);
    try {
      const result = await generateOutline(premise, lang, model);
      if (result) {
        setOutline(result);
        // Save to History
        const record: ArchitectRecord = {
            id: Date.now().toString(),
            timestamp: Date.now(),
            premise: premise,
            outline: result
        };
        const updated = addHistoryItem(STORAGE_KEYS.HISTORY_ARCHITECT, record);
        setHistory(updated);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
      setPremise('');
      setOutline(null);
      setSelectedNode(null);
  }

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, id);
      setHistory(updated);
  };

  const loadRecord = (record: ArchitectRecord) => {
      setPremise(record.premise);
      setOutline(record.outline);
      setSelectedNode(null);
  }

  const handleGenerateChapter = async () => {
      if(!selectedNode) return;
      setGeneratingChapter(true);
      try {
          const context = `Book Title: ${outline?.name}. Description: ${outline?.description}`;
          const result = await generateChapterContent(selectedNode, context, lang, model);
          setGeneratedChapter(result);
      } catch(e) {
          setGeneratedChapter("Error generating content.");
      } finally {
          setGeneratingChapter(false);
      }
  }

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
                         className="p-3 rounded-lg hover:bg-white hover:shadow-sm border border-transparent hover:border-slate-200 cursor-pointer group transition-all"
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
         <div className="p-6 border-b border-slate-200 bg-white flex items-center gap-4">
             <div className="flex-1 flex gap-2">
                 <input 
                    type="text" 
                    value={premise}
                    onChange={(e) => setPremise(e.target.value)}
                    placeholder={t('architect.placeholder')}
                    className="flex-1 p-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 focus:outline-none"
                 />
                 <button 
                    onClick={handleGenerateOutline}
                    disabled={loading || !premise}
                    className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                 >
                    {loading ? <Loader2 className="animate-spin" size={16} /> : <Network size={16} />}
                    {t('architect.designBtn')}
                 </button>
                 {outline && (
                     <button onClick={handleClear} className="p-2 text-slate-400 hover:text-red-500 border border-slate-200 rounded-md">
                         <Trash2 size={16} />
                     </button>
                 )}
             </div>
         </div>
         
         <div className="flex-1 bg-slate-50 p-6 overflow-hidden flex flex-col relative">
            <MindMap data={outline} onNodeClick={setSelectedNode} />
            {!outline && <p className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none opacity-50">{t('mindmap.empty')}</p>}
            <p className="text-xs text-slate-400 mt-2 text-center">{t('architect.tip')}</p>
         </div>
      </div>

      {/* Slide-over Panel for Node Details */}
      {selectedNode && (
          <div className="w-1/3 bg-white border-l border-slate-200 h-full shadow-xl absolute right-0 top-0 flex flex-col animate-in slide-in-from-right duration-300 z-10">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
                  <div>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                          selectedNode.type === 'book' ? 'bg-red-100 text-red-700' : 
                          selectedNode.type === 'act' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                          {t(`architect.types.${selectedNode.type}`) || selectedNode.type}
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-2 leading-tight">{selectedNode.name}</h2>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                  <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">{t('architect.description')}</h3>
                  <p className="text-slate-700 mb-6 leading-relaxed text-sm bg-slate-50 p-3 rounded border border-slate-100">{selectedNode.description}</p>
                  
                  {selectedNode.type === 'chapter' && (
                      <>
                        <hr className="my-6 border-slate-100" />
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
              </div>
          </div>
      )}
    </div>
  );
};
