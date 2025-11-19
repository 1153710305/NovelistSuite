
import React, { useState, useEffect } from 'react';
import { manipulateText } from '../services/geminiService';
import { Sparkles, RefreshCw, PenLine, Wand2, Copy, Save, Database, History, Trash2, Clock, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem } from '../services/storageService';
import { StudioRecord } from '../types';

export const Studio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'daily' | 'tools'>('daily');
  
  // 从 AppContext 获取全局状态，替代本地状态
  const { model, sources, studioState, setStudioState, startStudioGeneration } = useApp();
  const { t, lang, getToolLabel, getProcessLabel } = useI18n();

  // Local state for History UI only
  const [history, setHistory] = useState<StudioRecord[]>([]);
  
  // 工具模式状态 (仍保持本地，因为不需要后台长时间运行)
  const [editorText, setEditorText] = useState('');
  const [toolMode, setToolMode] = useState<'continue' | 'rewrite' | 'polish'>('continue');
  const [toolLoading, setToolLoading] = useState(false);

  const loadHistory = () => {
      // 稍微延迟以确保 Storage 写入完成
      setTimeout(() => {
          setHistory(getHistory<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO));
      }, 100);
  };

  // 生命周期：加载历史记录和本地缓存的编辑器文本
  useEffect(() => {
      const savedData = loadFromStorage(STORAGE_KEYS.STUDIO);
      if (savedData) {
          if (savedData.editorText) setEditorText(savedData.editorText);
      }
      loadHistory();
  }, []);

  // 当全局状态的生成完成时，刷新历史记录列表
  useEffect(() => {
      if (!studioState.isGenerating && studioState.generatedContent) {
          loadHistory();
      }
  }, [studioState.isGenerating, studioState.generatedContent]);

  // 生命周期：数据变化时自动保存工具栏文本缓存
  useEffect(() => {
      const timeoutId = setTimeout(() => {
          const currentSaved = loadFromStorage(STORAGE_KEYS.STUDIO) || {};
          saveToStorage(STORAGE_KEYS.STUDIO, {
              ...currentSaved,
              editorText,
          });
      }, 1000); 
      return () => clearTimeout(timeoutId);
  }, [editorText]);

  // 处理每日故事生成 (调用全局后台方法)
  const handleDailyGen = () => {
    startStudioGeneration(studioState.trendFocus, lang);
  };

  const handleInputChange = (val: string) => {
      setStudioState(prev => ({ ...prev, trendFocus: val }));
  }

  const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, id);
      setHistory(updated);
  };

  const handleHistoryClick = (content: string, focus: string) => {
      if (studioState.isGenerating) return; // Prevent switching while generating
      setStudioState(prev => ({
          ...prev,
          generatedContent: content,
          trendFocus: focus
      }));
  }

  const formatDate = (ts: number) => {
      return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 处理工具操作 (保持本地)
  const handleToolAction = async () => {
      if(!editorText) return;
      setToolLoading(true);
      try {
        const result = await manipulateText(editorText, toolMode, lang, model);
        // 工具模式的结果通常直接替换或追加，这里简单起见直接显示在右侧
        // 或者我们可以复用 studioState 的 content 来显示工具结果，但这会混淆
        // 暂时我们在 Daily Tab 显示 Daily 结果，Tools Tab 保持独立
        setStudioState(prev => ({ ...prev, generatedContent: result }));
      } catch (e) {
          console.error(e);
      } finally {
          setToolLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-full p-6 max-w-7xl mx-auto">
      {/* 顶部标签页切换 */}
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
            <Save size={12} /> <span>Auto-saved</span>
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {activeTab === 'daily' ? (
             // 每日生成器视图
             <div className="w-full flex gap-6">
                {/* 左侧：生成控制面板 + 历史列表 */}
                <div className="w-1/3 flex flex-col gap-4 h-full">
                    {/* Generator Control */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex-shrink-0">
                        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Sparkles className="text-yellow-500" size={20}/> {t('studio.dailyGenTitle')}
                        </h3>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{t('studio.trendLabel')}</label>
                        <input 
                            type="text" 
                            value={studioState.trendFocus}
                            onChange={(e) => handleInputChange(e.target.value)}
                            placeholder={t('studio.trendPlaceholder')}
                            className="w-full p-2 text-sm border border-slate-300 rounded-md mb-4 focus:ring-2 focus:ring-teal-500 focus:outline-none"
                            disabled={studioState.isGenerating}
                        />
                        
                        <div className="mb-4 p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Database size={12} /> <span>{sources.length} Sources</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleDailyGen}
                            disabled={studioState.isGenerating}
                            className="w-full py-2 bg-slate-900 text-white rounded-md text-sm font-medium hover:bg-slate-800 disabled:opacity-50 shadow-lg shadow-slate-900/20 flex items-center justify-center gap-2"
                        >
                            {studioState.isGenerating ? (
                                <><Loader2 className="animate-spin" size={16}/> {t('studio.generating')}</>
                            ) : t('studio.generateBtn')}
                        </button>
                    </div>

                    {/* History List */}
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl p-4 overflow-y-auto">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                                <History size={12} /> {t('studio.historyTitle')}
                            </h4>
                            <button onClick={loadHistory} className="text-slate-400 hover:text-teal-600 transition-colors" title={t('common.refresh')}>
                                <RefreshCw size={12} />
                            </button>
                        </div>
                        {history.length === 0 ? (
                            <div className="text-center text-slate-400 text-xs mt-4">{t('common.noHistory')}</div>
                        ) : (
                            <div className="space-y-2">
                                {history.map(item => (
                                    <div 
                                        key={item.id}
                                        onClick={() => handleHistoryClick(item.content, item.trendFocus)}
                                        className={`p-3 bg-white rounded-lg border cursor-pointer group transition-all shadow-sm ${
                                            studioState.generatedContent === item.content ? 'border-teal-500 ring-1 ring-teal-500' : 'border-slate-100 hover:border-teal-200'
                                        }`}
                                    >
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-bold text-slate-700 truncate w-2/3">{item.trendFocus}</span>
                                            <button onClick={(e) => handleDeleteHistory(e, item.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                            <Clock size={10} /> {formatDate(item.timestamp)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
                
                {/* 右侧：生成结果显示区域 */}
                <div className="w-2/3 bg-white p-8 rounded-xl shadow-sm border border-slate-100 overflow-y-auto relative">
                    {studioState.isGenerating ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
                            <div className="w-64">
                                <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                                    <span>{t('studio.generatingBackground')}</span>
                                    <span>{Math.round(studioState.progress)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                                        style={{ width: `${studioState.progress}%` }}
                                    ></div>
                                </div>
                                <p className="text-xs text-slate-400 mt-4 text-center">{t('studio.backgroundTip')}</p>
                            </div>
                        </div>
                    ) : null}

                    {studioState.generatedContent ? (
                        <div className="prose prose-slate prose-sm max-w-none animate-in fade-in">
                            <ReactMarkdown>{studioState.generatedContent}</ReactMarkdown>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400 italic flex-col gap-2">
                            <Sparkles size={32} className="opacity-20" />
                            {t('studio.emptyDaily')}
                        </div>
                    )}
                </div>
             </div>
        ) : (
            // AI 编辑工具视图
            <div className="w-full flex gap-6 h-full">
                 <div className="w-1/2 flex flex-col h-full">
                    {/* 工具选择栏 */}
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
                        disabled={toolLoading || !editorText}
                        className="mt-4 w-full py-2 bg-teal-600 text-white rounded-md text-sm font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {toolLoading ? <><Loader2 className="animate-spin" size={16}/>{t('studio.processing')}</> : getProcessLabel(toolMode)}
                    </button>
                 </div>
                 <div className="w-1/2 bg-slate-50 border border-slate-200 rounded-lg p-6 overflow-y-auto relative">
                    <button 
                        onClick={() => navigator.clipboard.writeText(studioState.generatedContent)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm border border-slate-200"
                        title="Copy"
                    >
                        <Copy size={16} />
                    </button>
                    {/* Note: Tools output also updates studioState.generatedContent for simplicity in this version */}
                    {studioState.generatedContent ? (
                         <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap">
                             {studioState.generatedContent}
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
