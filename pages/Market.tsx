
import React, { useState, useEffect } from 'react';
import { Novel, NovelPlatform, LabRecord } from '../types';
import { Filter, Star, Book, Link, Search, Zap, BookOpen, Users, History, Trash2, RefreshCw } from 'lucide-react';
import { useI18n } from '../i18n';
import ReactMarkdown from 'react-markdown';
import { useApp } from '../contexts/AppContext';
import { STORAGE_KEYS, getHistory, deleteHistoryItem } from '../services/storageService';

const MOCK_NOVELS: Novel[] = [
  { id: '1', title: 'The Celestial Mechanic', author: 'StarWalker', category: 'Sci-Fi', hotScore: 98500, platform: NovelPlatform.QIDIAN, summary: 'In a universe where machines cultivation is the path to immortality...' },
  { id: '2', title: 'Empress of the Boardroom', author: 'CityLight', category: 'Urban', hotScore: 89000, platform: NovelPlatform.JINJIANG, summary: 'Reborn back to 2010, she decides to crush her rivals...' },
  { id: '3', title: 'Global Dungeon System', author: 'DungeonMaster', category: 'System', hotScore: 85400, platform: NovelPlatform.FANQIE, summary: 'Dungeons appeared on Earth. He got the only admin key.' },
  { id: '4', title: 'Sword of the Northern Night', author: 'ColdSteel', category: 'Wuxia', hotScore: 76000, platform: NovelPlatform.QIDIAN, summary: 'The sect was destroyed. He walks the lonely path of vengeance.' },
];

export const Market: React.FC = () => {
  const { t, lang } = useI18n();
  const [activeTab, setActiveTab] = useState<'rankings' | 'analysis'>('rankings');
  
  // Market Rankings State
  const [filter, setFilter] = useState<string>('All');
  const filteredNovels = filter === 'All' ? MOCK_NOVELS : MOCK_NOVELS.filter(n => n.category === filter);

  // Analysis Lab State
  const [inputUrl, setInputUrl] = useState('');
  const [mode, setMode] = useState<'viral_factors' | 'pacing' | 'characters'>('viral_factors');
  const [history, setHistory] = useState<LabRecord[]>([]);
  const { labState, setLabState, startLabAnalysis } = useApp();

  const loadHistory = () => {
      setTimeout(() => {
          setHistory(getHistory<LabRecord>(STORAGE_KEYS.HISTORY_LAB));
      }, 100);
  };

  useEffect(() => {
      loadHistory();
  }, []);

  useEffect(() => {
      if (labState.inputText && labState.inputText.startsWith('http')) setInputUrl(labState.inputText);
      if (labState.mode) setMode(labState.mode);
  }, [labState.inputText, labState.mode]);

  useEffect(() => {
      if (!labState.isAnalyzing && labState.analysisResult) {
          loadHistory();
      }
  }, [labState.isAnalyzing, labState.analysisResult]);

  const handleAnalyze = async () => {
    if (!inputUrl) return;
    startLabAnalysis(inputUrl, mode, lang);
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

  const renderRankings = () => (
      <div className="space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-slate-800">{t('market.tabs.rankings')}</h3>
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
                <Filter size={16} className="text-slate-400" />
                <select 
                    className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                >
                    <option value="All">{t('market.allCategories')}</option>
                    <option value="Sci-Fi">Sci-Fi</option>
                    <option value="Urban">Urban</option>
                    <option value="System">System</option>
                    <option value="Wuxia">Wuxia</option>
                </select>
            </div>
          </div>

          {filteredNovels.map((novel, index) => (
            <div key={novel.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex gap-6 transition-all hover:shadow-md">
                <div className="flex-shrink-0 w-16 h-24 bg-slate-200 rounded-md flex items-center justify-center text-slate-400 font-bold text-2xl">
                    {index + 1}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{novel.title}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">{novel.platform}</span>
                                <span className="text-slate-400">•</span>
                                <span>{novel.author}</span>
                                <span className="text-slate-400">•</span>
                                <span>{novel.category}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-orange-500 font-bold">
                                <Star size={16} fill="currentColor" />
                                <span>{(novel.hotScore / 10000).toFixed(1)}w</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{t('market.hotScore')}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                        {novel.summary}
                    </p>
                    <div className="mt-4 flex gap-2">
                        <button className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100 transition-colors flex items-center gap-1">
                             <Book size={12} /> {t('market.deconstruct')}
                        </button>
                    </div>
                </div>
            </div>
          ))}
      </div>
  );

  const renderAnalysis = () => (
      <div className="flex h-[calc(100vh-180px)] animate-in fade-in duration-300">
        {/* Left Sidebar: History */}
        <div className="w-64 bg-slate-50 border border-slate-200 rounded-l-xl flex flex-col h-full">
            <div className="p-4 border-b border-slate-200 bg-white/50 flex justify-between items-center rounded-tl-xl">
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
                            <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed break-all">
                                {item.inputText}
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
        <div className="w-1/3 p-6 border-y border-slate-200 flex flex-col h-full bg-white">
            <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">{t('lab.sourceText')}</h2>
            <div className="flex gap-2">
                <button onClick={() => setMode('viral_factors')} className={`p-2 rounded-md transition-colors ${mode === 'viral_factors' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.viral')}><Zap size={18}/></button>
                <button onClick={() => setMode('pacing')} className={`p-2 rounded-md transition-colors ${mode === 'pacing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.pacing')}><BookOpen size={18}/></button>
                <button onClick={() => setMode('characters')} className={`p-2 rounded-md transition-colors ${mode === 'characters' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.chars')}><Users size={18}/></button>
            </div>
            </div>
            
            <div className="flex-1 flex flex-col gap-4">
                <div className="relative">
                    <Link className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="url"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                        placeholder={t('market.urlPlaceholder')}
                        value={inputUrl}
                        onChange={(e) => setInputUrl(e.target.value)}
                        disabled={labState.isAnalyzing}
                    />
                </div>
                
                <div className="flex-1 bg-slate-50 rounded-lg border border-slate-200 border-dashed flex items-center justify-center p-4">
                     <p className="text-sm text-slate-400 text-center">
                         {t('lab.placeholder')} <br/>
                         (Simulating content fetch for analysis)
                     </p>
                </div>
            </div>

            <button
            onClick={handleAnalyze}
            disabled={labState.isAnalyzing || !inputUrl}
            className="mt-4 w-full py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 transition-all"
            >
            {labState.isAnalyzing ? (
                <span className="animate-pulse">{t('lab.analyzing')}</span>
            ) : (
                <>
                <Search size={18} /> {t('market.analyzeBtn')}
                </>
            )}
            </button>
        </div>

        {/* Right: Output */}
        <div className="flex-1 p-6 h-full overflow-y-auto bg-white border-y border-r border-slate-200 rounded-r-xl relative">
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
                <ReactMarkdown>{labState.analysisResult}</ReactMarkdown>
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

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center gap-6 mb-8 border-b border-slate-200 pb-1">
        <h2 className="text-3xl font-bold text-slate-800 pr-6 border-r border-slate-200">{t('market.title')}</h2>
        <div className="flex gap-4">
            <button 
                onClick={() => setActiveTab('rankings')} 
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'rankings' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('market.tabs.rankings')}
                {activeTab === 'rankings' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full"></div>}
            </button>
            <button 
                onClick={() => setActiveTab('analysis')} 
                className={`pb-4 px-2 font-medium text-sm transition-colors relative ${activeTab === 'analysis' ? 'text-teal-600' : 'text-slate-500 hover:text-slate-700'}`}
            >
                {t('market.tabs.analysis')}
                {activeTab === 'analysis' && <div className="absolute bottom-0 left-0 w-full h-1 bg-teal-600 rounded-t-full"></div>}
            </button>
        </div>
      </div>

      {activeTab === 'rankings' ? renderRankings() : renderAnalysis()}
    </div>
  );
};
