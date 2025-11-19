
import React, { useState, useEffect } from 'react';
import { generateOutline, generateChapterContent } from '../services/geminiService';
import { OutlineNode } from '../types';
import { MindMap } from '../components/MindMap';
import { Network, Loader2, FileText, Trash2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../services/storageService';

export const Architect: React.FC = () => {
  const [premise, setPremise] = useState('');
  const [outline, setOutline] = useState<OutlineNode | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null);
  const [generatedChapter, setGeneratedChapter] = useState('');
  const [generatingChapter, setGeneratingChapter] = useState(false);
  const { t, lang } = useI18n();
  const { model } = useApp();

  // Load Data
  useEffect(() => {
      const savedData = loadFromStorage(STORAGE_KEYS.ARCHITECT);
      if (savedData) {
          if (savedData.premise) setPremise(savedData.premise);
          if (savedData.outline) setOutline(savedData.outline);
      }
  }, []);

  // Save Data
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
      setOutline(result);
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

  return (
    <div className="flex h-full relative">
      {/* Main Workspace */}
      <div className={`flex flex-col h-full transition-all duration-300 ${selectedNode ? 'w-2/3' : 'w-full'}`}>
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
                    className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
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
         
         <div className="flex-1 bg-slate-50 p-6 overflow-hidden flex flex-col">
            <MindMap data={outline} onNodeClick={setSelectedNode} />
            <p className="text-xs text-slate-500 mt-2 text-center">{t('architect.tip')}</p>
         </div>
      </div>

      {/* Slide-over Panel for Node Details */}
      {selectedNode && (
          <div className="w-1/3 bg-white border-l border-slate-200 h-full shadow-xl absolute right-0 top-0 flex flex-col animate-in slide-in-from-right duration-300">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                  <div>
                      <span className={`text-xs font-bold uppercase tracking-wider px-2 py-1 rounded ${
                          selectedNode.type === 'book' ? 'bg-red-100 text-red-700' : 
                          selectedNode.type === 'act' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                          {t(`architect.types.${selectedNode.type}`) || selectedNode.type}
                      </span>
                      <h2 className="text-xl font-bold text-slate-900 mt-2">{selectedNode.name}</h2>
                  </div>
                  <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600">×</button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                  <h3 className="text-sm font-bold text-slate-500 uppercase mb-2">{t('architect.description')}</h3>
                  <p className="text-slate-700 mb-6 leading-relaxed">{selectedNode.description}</p>
                  
                  {selectedNode.type === 'chapter' && (
                      <>
                        <hr className="my-6 border-slate-100" />
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-slate-500 uppercase">{t('architect.content')}</h3>
                            <button 
                                onClick={handleGenerateChapter}
                                disabled={generatingChapter}
                                className="text-xs bg-teal-600 text-white px-3 py-1.5 rounded hover:bg-teal-700 flex items-center gap-1 disabled:opacity-50"
                            >
                                {generatingChapter ? <Loader2 className="animate-spin" size={12}/> : <FileText size={12}/>}
                                {t('architect.generateDraft')}
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 min-h-[200px] text-sm text-slate-700 whitespace-pre-wrap">
                            {generatingChapter ? t('architect.writing') : generatedChapter || t('architect.noContent')}
                        </div>
                      </>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};
