
import React, { useState, useEffect, useRef } from 'react';
import { X, Database, Download, Upload, CheckSquare, Square, FileText, Library } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { loadFromStorage, STORAGE_KEYS, saveToStorage } from '../services/storageService';
import { PromptTemplate, StudioRecord } from '../types';

interface DataManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DataManagerModal: React.FC<DataManagerModalProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { promptLibrary, addPrompt } = useApp();
    const [activeTab, setActiveTab] = useState<'prompts' | 'novels'>('prompts');
    
    // Data State
    const [novels, setNovels] = useState<StudioRecord[]>([]);
    
    // Selection State
    const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
    const [selectedNovels, setSelectedNovels] = useState<Set<string>>(new Set());
    
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            // Load novels on open
            const storedNovels = loadFromStorage(STORAGE_KEYS.HISTORY_STUDIO) || [];
            // Filter only actual story records, not inspiration dumps
            const stories = storedNovels.filter((r: StudioRecord) => r.recordType === 'story');
            setNovels(stories);
            
            // Clear selections
            setSelectedPrompts(new Set());
            setSelectedNovels(new Set());
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- Selection Handlers ---

    const togglePrompt = (id: string) => {
        const newSet = new Set(selectedPrompts);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedPrompts(newSet);
    };

    const toggleNovel = (id: string) => {
        const newSet = new Set(selectedNovels);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedNovels(newSet);
    };

    const handleSelectAll = () => {
        if (activeTab === 'prompts') {
            if (selectedPrompts.size === promptLibrary.length) setSelectedPrompts(new Set());
            else setSelectedPrompts(new Set(promptLibrary.map(p => p.id)));
        } else {
            if (selectedNovels.size === novels.length) setSelectedNovels(new Set());
            else setSelectedNovels(new Set(novels.map(n => n.id)));
        }
    };

    // --- Export Handler ---

    const handleExport = () => {
        const exportData: any = {
            type: 'inkflow_export',
            version: 1,
            timestamp: Date.now(),
            prompts: [],
            novels: []
        };

        if (selectedPrompts.size > 0) {
            exportData.prompts = promptLibrary.filter(p => selectedPrompts.has(p.id));
        }

        if (selectedNovels.size > 0) {
            exportData.novels = novels.filter(n => selectedNovels.has(n.id));
        }

        if (exportData.prompts.length === 0 && exportData.novels.length === 0) {
            alert("Please select items to export.");
            return;
        }

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `inkflow_data_export_${new Date().toISOString().slice(0,10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    // --- Import Handler ---

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files.length > 0) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target?.result as string);
                    
                    if (importedData.type !== 'inkflow_export') {
                        // Attempt fallback for legacy prompt imports or raw arrays if necessary, 
                        // but sticking to strict format is safer.
                        alert("Invalid file format. Please use files exported from InkFlow.");
                        return;
                    }

                    // Import Prompts
                    if (importedData.prompts && Array.isArray(importedData.prompts)) {
                        let importedCount = 0;
                        const existingIds = new Set(promptLibrary.map(p => p.id));
                        
                        importedData.prompts.forEach((p: PromptTemplate) => {
                            // Simple ID collision check - in a real app might want to generate new IDs
                            if (!existingIds.has(p.id)) {
                                addPrompt(p);
                                importedCount++;
                            }
                        });
                        if (importedCount > 0) alert(`Imported ${importedCount} prompts.`);
                    }
                    
                    // Note: Novels import is tricky because it interacts with the Studio History state directly.
                    // For now, prompt specifically requested Prompt Library import support. 
                    // Studio import is technically feasible but requires updating the history storage directly.
                    
                    if (importedData.novels && Array.isArray(importedData.novels)) {
                         const currentHistory = loadFromStorage(STORAGE_KEYS.HISTORY_STUDIO) || [];
                         const historyIds = new Set(currentHistory.map((h: any) => h.id));
                         const newNovels = importedData.novels.filter((n: any) => !historyIds.has(n.id));
                         
                         if (newNovels.length > 0) {
                             const updatedHistory = [...newNovels, ...currentHistory];
                             saveToStorage(STORAGE_KEYS.HISTORY_STUDIO, updatedHistory);
                             alert(`Imported ${newNovels.length} novels to Studio history.`);
                             // Force page reload or state update might be needed if Studio is active, 
                             // but since we are in settings modal, a refresh usually happens via state or simple reload hint.
                         }
                    }

                    onClose();

                } catch (error) {
                    console.error(error);
                    alert(t('dataManager.errorImport'));
                }
            };
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
                
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Database className="text-teal-600" size={20}/>
                        {t('dataManager.title')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                    <button 
                        onClick={() => setActiveTab('prompts')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'prompts' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <Library size={16} /> {t('dataManager.tabs.prompts')}
                    </button>
                    <button 
                        onClick={() => setActiveTab('novels')}
                        className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'novels' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        <FileText size={16} /> {t('dataManager.tabs.novels')}
                    </button>
                </div>

                {/* Toolbar */}
                <div className="p-2 border-b border-slate-100 flex justify-between items-center bg-white">
                    <button onClick={handleSelectAll} className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded flex items-center gap-1">
                        <CheckSquare size={14} /> {t('common.selectAll')}
                    </button>
                    <div className="text-xs text-slate-400">
                        {activeTab === 'prompts' ? selectedPrompts.size : selectedNovels.size} {t('common.selected')}
                    </div>
                </div>

                {/* List Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-slate-50">
                    {activeTab === 'prompts' ? (
                        promptLibrary.length === 0 ? <div className="text-center text-slate-400 py-10 italic">No prompts found.</div> :
                        promptLibrary.map(p => (
                            <div 
                                key={p.id} 
                                onClick={() => togglePrompt(p.id)}
                                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${selectedPrompts.has(p.id) ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-500' : 'bg-white border-slate-200 hover:border-teal-200'}`}
                            >
                                <div className={`flex-shrink-0 text-teal-600 ${selectedPrompts.has(p.id) ? 'opacity-100' : 'opacity-30'}`}>
                                    {selectedPrompts.has(p.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-800">{p.name}</div>
                                    <div className="text-xs text-slate-500 truncate">{p.content}</div>
                                </div>
                            </div>
                        ))
                    ) : (
                        novels.length === 0 ? <div className="text-center text-slate-400 py-10 italic">No novels found.</div> :
                        novels.map(n => (
                            <div 
                                key={n.id} 
                                onClick={() => toggleNovel(n.id)}
                                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-all ${selectedNovels.has(n.id) ? 'bg-teal-50 border-teal-300 ring-1 ring-teal-500' : 'bg-white border-slate-200 hover:border-teal-200'}`}
                            >
                                <div className={`flex-shrink-0 text-teal-600 ${selectedNovels.has(n.id) ? 'opacity-100' : 'opacity-30'}`}>
                                    {selectedNovels.has(n.id) ? <CheckSquare size={18} /> : <Square size={18} />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-bold text-sm text-slate-800">{n.title || 'Untitled'}</div>
                                    <div className="text-xs text-slate-500">
                                        {n.chapters?.length || 0} Chapters • {new Date(n.timestamp).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-between items-center">
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => fileInputRef.current?.click()} 
                            className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-600 flex items-center gap-2"
                         >
                             <Upload size={16} /> {t('dataManager.importBtn')}
                         </button>
                         <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
                         <span className="text-[10px] text-slate-400 hidden sm:inline-block">{t('dataManager.importTip')}</span>
                    </div>

                    <button 
                        onClick={handleExport}
                        className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-900/10"
                    >
                        <Download size={16} /> {t('dataManager.exportBtn')}
                    </button>
                </div>
            </div>
        </div>
    );
};
