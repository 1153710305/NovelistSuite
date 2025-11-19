import React, { useState, useEffect } from 'react';
import { Search, Zap, BookOpen, Users, History, Trash2, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { STORAGE_KEYS, getHistory, deleteHistoryItem } from '../services/storageService';
import { LabRecord } from '../types';

export const Lab: React.FC = () => {
  // Local UI state
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<'viral_factors' | 'pacing' | 'characters'>('viral_factors');
  const [history, setHistory] = useState<LabRecord[]>([]);
  
  // Global state
  const { t, lang } = useI18n();
  const { labState, setLabState, startLabAnalysis } = useApp();

  const loadHistory = () => {
      setTimeout(() => {
          setHistory(getHistory<LabRecord>(STORAGE_KEYS.HISTORY_LAB));
      }, 100);
  };

  useEffect(() => {
      loadHistory();
  }, []);

  // Sync Global State to Local UI
  useEffect(() => {
      if (labState.inputText) setInputText(labState.inputText);
      if (labState.mode) setMode(labState.mode);
  }, [labState.inputText, labState.mode]);

  // Update history when analysis finishes
  useEffect(() => {
      if (!labState.isAnalyzing && labState.analysisResult) {
          loadHistory();
      }
  }, [labState.isAnalyzing, labState.analysisResult]);

  const handleAnalyze = async () => {
    if (!inputText) return;
    startLabAnalysis(inputText, mode, lang);
  };

  const loadRecord = (record: LabRecord) => {
      setLabState(prev => ({
          ...prev,
          isAnalyzing: false,
          inputText: record.inputText,
          mode: record.mode as any,
          analysisResult: record.analysis
      }));
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const updated = deleteHistoryItem<LabRecord>(STORAGE_KEYS.HISTORY_LAB, id);
      setHistory(updated);
  };

  const formatDate = (ts: number) => {
      return new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex h-full">
      {/* Left Sidebar: History */}
      <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
          <div className="p-4 border-b border-slate-200 bg-white/50 flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                  <History size={12} /> {t('lab.historyTitle')}
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
                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                  item.mode === 'viral_factors' ? 'bg-amber-100 text-amber-700' :
                                  item.mode === 'pacing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                              }`}>
                                  {t(`lab.modes.${item.mode === 'viral_factors' ? 'viral' : item.mode === 'pacing' ? 'pacing' : 'chars'}`)}
                              </span>
                              <button onClick={(e) => handleDelete(e, item.id)} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Trash2 size={12} />
                              </button>
                          </div>
                          <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                              {item.snippet}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-2 text-right">
                              {formatDate(item.timestamp)}
                          </p>
                      </div>
                  ))
              )}
          </div>
      </div>

      {/* Middle: Input */}
      <div className="w-1/3 p-6 border-r border-slate-200 flex flex-col h-full bg-white">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{t('lab.sourceText')}</h2>
          <div className="flex gap-2">
             <button onClick={() => setMode('viral_factors')} className={`p-2 rounded-md transition-colors ${mode === 'viral_factors' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.viral')}><Zap size={18}/></button>
             <button onClick={() => setMode('pacing')} className={`p-2 rounded-md transition-colors ${mode === 'pacing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.pacing')}><BookOpen size={18}/></button>
             <button onClick={() => setMode('characters')} className={`p-2 rounded-md transition-colors ${mode === 'characters' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.chars')}><Users size={18}/></button>
          </div>
        </div>
        <textarea
          className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
          placeholder={t('lab.placeholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={labState.isAnalyzing}
        ></textarea>
        <button
          onClick={handleAnalyze}
          disabled={labState.isAnalyzing || !inputText}
          className="mt-4 w-full py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all"
        >
          {labState.isAnalyzing ? (
             <span className="animate-pulse">{t('lab.analyzing')}</span>
          ) : (
             <>
               <Search size={18} /> {t('lab.analyzeBtn')}
             </>
          )}
        </button>
      </div>

      {/* Right: Output */}
      <div className="flex-1 p-6 h-full overflow-y-auto bg-white relative">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {mode === 'viral_factors' ? t('lab.viralFactors') : mode === 'pacing' ? t('lab.pacing') : t('lab.characters')}
        </h2>
        
        {labState.isAnalyzing && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 z-10">
                <div className="w-64">
                    <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
                        <span>{t('common.bgTask')}</span>
                        <span>{Math.round(labState.progress)}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div 
                            className="bg-teal-500 h-full rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${labState.progress}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between mt-2">
                        <p className="text-xs text-slate-400">{t('common.safeToLeave')}</p>
                        <p className="text-xs font-mono text-teal-600">{t('common.remainingTime').replace('{time}', labState.remainingTime.toString())}</p>
                    </div>
                </div>
             </div>
        )}

        {labState.analysisResult ? (
          <div className="prose prose-slate max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-700">
                {labState.analysisResult}
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <Zap size={48} className="mb-4 opacity-20" />
            <p>{t('lab.emptyState')}</p>
          </div>
        )}
      </div>
    </div>
  );
};