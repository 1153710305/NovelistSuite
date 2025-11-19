
import React, { useState, useEffect } from 'react';
import { generateDailyStories, manipulateText } from '../services/geminiService';
import { Sparkles, RefreshCw, PenLine, Wand2, Copy, Save, Database } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../services/storageService';

export const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'tools'>('daily');
  const [trendFocus, setTrendFocus] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { t, lang, getToolLabel, getProcessLabel } = useI18n();
  const { model, sources } = useApp();
  
  // Tools State
  const [editorText, setEditorText] = useState('');
  const [toolMode, setToolMode] = useState<'continue' | 'rewrite' | 'polish'>('continue');

  // Load Data on Mount
  useEffect(() => {
      const savedData = loadFromStorage(STORAGE_KEYS.STUDIO);
      if (savedData) {
          if (savedData.trendFocus) setTrendFocus(savedData.trendFocus);
          if (savedData.generatedContent) setGeneratedContent(savedData.generatedContent);
          if (savedData.editorText) setEditorText(savedData.editorText);
      }
  }, []);

  // Save Data on Change
  useEffect(() => {
      const timeoutId = setTimeout(() => {
          saveToStorage(STORAGE_KEYS.STUDIO, {
              trendFocus,
              generatedContent,
              editorText,
          });
      }, 1000); // Debounce save
      return () => clearTimeout(timeoutId);
  }, [trendFocus, generatedContent, editorText]);

  const handleDailyGen = async () => {
    setLoading(true);
    try {
      // Use global sources from AppContext
      const result = await generateDailyStories(trendFocus, sources, lang, model);
      setGeneratedContent(result);
    } catch (e) {
      setGeneratedContent("Error.");
    } finally {
      setLoading(false);
    }
  };

  const handleToolAction = async () => {
      if(!editorText) return;
      setLoading(true);
      try {
        const result = await manipulateText(editorText, toolMode, lang, model);
        setGeneratedContent(result);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      {/* Header Tabs */}
      <div className="flex gap-4 mb-6 border-b border-slate-200 pb-2 justify-between items-center">
        <div className="flex gap-4">
            <button 
                onClick={() => setActiveTab('daily')}
                className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'daily' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('studio.tabDaily')}
            </button>
            <button 
                onClick={() => setActiveTab('tools')}
                className={`pb-2 px-4 font-medium text-sm transition-colors ${activeTab === 'tools' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('studio.tabTools')}
            </button>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
            <Save size={12} /> <span>Auto-saved locally</span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {activeTab === 'daily' ? (
             <div className="w-full flex gap-6">
                <div className="w-1/3 flex flex-col gap-4 overflow-y-auto">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles className="text-yellow-500" size={20}/> {t('studio.dailyGenTitle')}
                        </h3>
                        <p className="text-sm text-slate-500 mb-4">{t('studio.dailyGenDesc')}</p>
                        
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t('studio.trendLabel')}</label>
                        <input 
                            type="text" 
                            value={trendFocus}
                            onChange={(e) => setTrendFocus(e.target.value)}
                            placeholder={t('studio.trendPlaceholder')}
                            className="w-full p-2 text-sm border border-slate-300 rounded-md mb-4 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                        />
                        
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                                <Database size={12} /> <span>Active Intelligence Sources:</span>
                            </div>
                            <p className="text-xs font-medium text-slate-800">
                                {sources.length > 0 ? `${sources.length} sources selected` : 'No sources selected'}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-1">Configure in Dashboard</p>
                        </div>

                        <button 
                            onClick={handleDailyGen}
                            disabled={loading}
                            className="w-full py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                        >
                            {loading ? t('studio.generating') : t('studio.generateBtn')}
                        </button>
                        <p className="text-xs text-slate-400 mt-2 text-center">Using: {model}</p>
                    </div>
                </div>
                <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-slate-100 overflow-y-auto">
                    {generatedContent ? (
                        <div className="prose prose-slate prose-sm max-w-none">
                            <ReactMarkdown>{generatedContent}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 italic">
                            {t('studio.emptyDaily')}
                        </div>
                    )}
                </div>
             </div>
        ) : (
            <div className="w-full flex gap-6 h-full">
                 <div className="w-1/2 flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-2 bg-white p-1 rounded-lg border border-slate-200 w-fit">
                        <button onClick={() => setToolMode('continue')} className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${toolMode === 'continue' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}><PenLine size={12}/> {getToolLabel('continue')}</button>
                        <button onClick={() => setToolMode('rewrite')} className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${toolMode === 'rewrite' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}><RefreshCw size={12}/> {getToolLabel('rewrite')}</button>
                        <button onClick={() => setToolMode('polish')} className={`px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1 ${toolMode === 'polish' ? 'bg-teal-50 text-teal-700' : 'text-slate-600 hover:bg-slate-50'}`}><Wand2 size={12}/> {getToolLabel('polish')}</button>
                    </div>
                    <textarea
                        value={editorText}
                        onChange={(e) => setEditorText(e.target.value)}
                        placeholder={t('studio.toolPlaceholder')}
                        className="flex-1 p-4 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm leading-relaxed"
                    ></textarea>
                    <button 
                        onClick={handleToolAction}
                        disabled={loading || !editorText}
                        className="mt-4 w-full py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 disabled:opacity-50"
                    >
                        {loading ? t('studio.processing') : getProcessLabel(toolMode)}
                    </button>
                 </div>
                 <div className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-6 overflow-y-auto relative">
                    <button 
                        onClick={() => navigator.clipboard.writeText(generatedContent)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm border border-slate-200"
                        title="Copy"
                    >
                        <Copy size={16} />
                    </button>
                    {generatedContent ? (
                         <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                             {generatedContent}
                         </div>
                    ) : (
                        <div className="text-slate-400 italic mt-10 text-center">{t('studio.emptyTool')}</div>
                    )}
                 </div>
            </div>
        )}
      </div>
    </div>
  );
};
