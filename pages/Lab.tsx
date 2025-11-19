
import React, { useState } from 'react';
import { analyzeText } from '../services/geminiService';
import { Search, Zap, BookOpen, Users } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';

export const Lab: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'viral_factors' | 'pacing' | 'characters'>('viral_factors');
  const { t, lang } = useI18n();
  const { model } = useApp();

  const handleAnalyze = async () => {
    if (!inputText) return;
    setLoading(true);
    setAnalysis('');
    try {
      const result = await analyzeText(inputText, mode, lang, model);
      setAnalysis(result);
    } catch (error) {
      setAnalysis('Error analyzing text.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Left: Input */}
      <div className="w-1/2 p-6 border-r border-slate-200 flex flex-col h-full">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{t('lab.sourceText')}</h2>
          <div className="flex gap-2">
             {/* Mode Selector */}
             <button onClick={() => setMode('viral_factors')} className={`p-2 rounded-md ${mode === 'viral_factors' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.viral')}><Zap size={18}/></button>
             <button onClick={() => setMode('pacing')} className={`p-2 rounded-md ${mode === 'pacing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.pacing')}><BookOpen size={18}/></button>
             <button onClick={() => setMode('characters')} className={`p-2 rounded-md ${mode === 'characters' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`} title={t('lab.modes.chars')}><Users size={18}/></button>
          </div>
        </div>
        <textarea
          className="flex-1 w-full p-4 bg-white border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
          placeholder={t('lab.placeholder')}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
        ></textarea>
        <button
          onClick={handleAnalyze}
          disabled={loading || !inputText}
          className="mt-4 w-full py-3 bg-slate-900 text-white font-medium rounded-lg hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
             <span className="animate-pulse">{t('lab.analyzing')}</span>
          ) : (
             <>
               <Search size={18} /> {t('lab.analyzeBtn')}
             </>
          )}
        </button>
      </div>

      {/* Right: Output */}
      <div className="w-1/2 p-6 h-full overflow-y-auto bg-white">
        <h2 className="text-xl font-bold text-slate-800 mb-4">
          {mode === 'viral_factors' ? t('lab.viralFactors') : mode === 'pacing' ? t('lab.pacing') : t('lab.characters')}
        </h2>
        
        {analysis ? (
          <div className="prose prose-slate max-w-none">
            <ReactMarkdown>{analysis}</ReactMarkdown>
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
