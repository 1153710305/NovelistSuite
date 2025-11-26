
import React, { useState, useEffect } from 'react';
import { Palette, Image as ImageIcon, Download, Trash2, RefreshCw, Sparkles, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { generateCover } from '../services/geminiService';
import { ImageModel, CoverRecord } from '../types';
import { addHistoryItem, getHistory, deleteHistoryItem, STORAGE_KEYS } from '../services/storageService';

export const CoverStudio: React.FC = () => {
    const { t } = useI18n();
    const { model } = useApp(); // Use general model context if needed, but we have local state for image model
    
    const styleOptions = [
        { id: 'epic', value: 'Epic Fantasy (Xianxia), ethereal, majestic, chinese traditional art' },
        { id: 'cyberpunk', value: 'Cyberpunk, neon lights, high tech low life, futuristic city' },
        { id: 'watercolor', value: 'Watercolor painting, soft artistic, fluid, dreamy' },
        { id: 'oil', value: 'Oil painting, textured, classic, rich colors' },
        { id: 'anime', value: 'Anime style, vibrant, cel shaded, japanese animation' },
        { id: 'horror', value: 'Realistic Horror, dark, cinematic lighting, eerie' },
        { id: 'vector', value: 'Minimalist Vector, flat design, clean lines, simple' },
        { id: 'gothic', value: 'Gothic, dark fantasy, ornate, mysterious' }
    ];
    
    const [prompt, setPrompt] = useState('');
    const [style, setStyle] = useState(styleOptions[0].value);
    const [selectedModel, setSelectedModel] = useState<string>(ImageModel.IMAGEN);
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentImage, setCurrentImage] = useState<string>('');
    const [history, setHistory] = useState<CoverRecord[]>([]);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = () => {
        setHistory(getHistory<CoverRecord>(STORAGE_KEYS.HISTORY_COVERS));
    };

    const handleGenerate = async () => {
        if (!prompt) return;
        setIsGenerating(true);
        setCurrentImage('');

        const fullPrompt = `Book Cover Art. Style: ${style}. Description: ${prompt}. No text overlay. High quality, detailed, 4k.`;

        try {
            const base64 = await generateCover(fullPrompt, selectedModel);
            setCurrentImage(base64);
            
            // Save to history
            const newRecord: CoverRecord = {
                id: Date.now().toString(),
                timestamp: Date.now(),
                prompt: prompt,
                style: style,
                model: selectedModel,
                imageBase64: base64
            };
            addHistoryItem(STORAGE_KEYS.HISTORY_COVERS, newRecord);
            loadHistory();

        } catch (error) {
            alert(t('common.errorDesc'));
        } finally {
            setIsGenerating(false);
        }
    };

    const handleDelete = (id: string) => {
        deleteHistoryItem(STORAGE_KEYS.HISTORY_COVERS, id);
        loadHistory();
    };

    const handleDownload = (base64: string, id: string) => {
        const link = document.createElement('a');
        link.href = base64;
        link.download = `cover-${id}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-8 max-w-7xl mx-auto h-full flex gap-6">
            {/* Left Panel: Controls */}
            <div className="w-1/3 bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col h-full">
                <div className="mb-6 flex items-center gap-2 text-xl font-bold text-slate-800">
                    <Palette className="text-teal-600" />
                    {t('nav.coverStudio')}
                </div>

                <div className="space-y-6 flex-1 overflow-y-auto">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('architect.cover.promptLabel')}</label>
                        <textarea 
                            value={prompt} 
                            onChange={(e) => setPrompt(e.target.value)} 
                            rows={5} 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-teal-500 text-sm resize-none"
                            placeholder="Describe your protagonist, scene, or key elements..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('architect.cover.styleLabel')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {styleOptions.map(s => (
                                <button 
                                    key={s.id} 
                                    onClick={() => setStyle(s.value)}
                                    className={`p-2 text-xs rounded border text-left transition-all ${style === s.value ? 'bg-teal-50 border-teal-500 text-teal-700 ring-1 ring-teal-500' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'}`}
                                >
                                    {t(`architect.cover.styles.${s.id}`)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('architect.cover.modelLabel')}</label>
                        <select 
                            value={selectedModel} 
                            onChange={(e) => setSelectedModel(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                        >
                             <option value={ImageModel.IMAGEN}>Imagen 4.0 (Best Quality)</option>
                             <option value={ImageModel.GEMINI_FLASH_IMAGE}>Gemini Flash Image (Fast)</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 pt-6 border-t border-slate-100">
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating || !prompt}
                        className="w-full py-3 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                    >
                        {isGenerating ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />}
                        {t('architect.cover.generate')}
                    </button>
                </div>
            </div>

            {/* Right Panel: Display & History */}
            <div className="flex-1 flex flex-col gap-6 h-full overflow-hidden">
                {/* Current Result */}
                <div className="flex-1 bg-slate-100 rounded-xl border border-slate-200 flex items-center justify-center relative group overflow-hidden shadow-inner">
                    {currentImage ? (
                        <>
                            <img src={currentImage} alt="Generated Cover" className="h-full w-auto object-contain shadow-2xl" />
                            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleDownload(currentImage, 'latest')} className="p-2 bg-white rounded-full shadow hover:text-teal-600" title="Download">
                                    <Download size={20} />
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="text-slate-400 flex flex-col items-center gap-2">
                            {isGenerating ? <Loader2 className="animate-spin h-10 w-10 text-teal-500" /> : <ImageIcon size={48} className="opacity-20" />}
                            <p className="text-sm">{isGenerating ? t('architect.cover.regenerating') : 'Ready to paint your world.'}</p>
                        </div>
                    )}
                </div>

                {/* History Gallery */}
                <div className="h-40 bg-white rounded-xl border border-slate-200 p-4 flex flex-col">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                            <RefreshCw size={12} /> {t('common.history')}
                        </h3>
                    </div>
                    <div className="flex-1 overflow-x-auto flex gap-4 items-center pb-2">
                        {history.length === 0 && <span className="text-xs text-slate-400 italic pl-2">No previous covers.</span>}
                        {history.map(item => (
                            <div key={item.id} className="relative flex-shrink-0 w-24 h-32 rounded-lg overflow-hidden border border-slate-200 group cursor-pointer" onClick={() => setCurrentImage(item.imageBase64)}>
                                <img src={item.imageBase64} alt="History" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="text-white hover:text-red-400"><Trash2 size={14}/></button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDownload(item.imageBase64, item.id); }} className="text-white hover:text-teal-400"><Download size={14}/></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
