
import React, { useState, useEffect } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../services/storageService';
import { useI18n } from '../i18n';
import { Database, Trash2, RefreshCw, LogOut, FileText, PenTool, Network } from 'lucide-react';

interface AdminProps {
    onLogout: () => void;
}

export const Admin: React.FC<AdminProps> = ({ onLogout }) => {
    const { t } = useI18n();
    const [activeTab, setActiveTab] = useState<'lab' | 'studio' | 'architect'>('lab');
    const [data, setData] = useState<any[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        let key = '';
        switch(activeTab) {
            case 'lab': key = STORAGE_KEYS.HISTORY_LAB; break;
            case 'studio': key = STORAGE_KEYS.HISTORY_STUDIO; break;
            case 'architect': key = STORAGE_KEYS.HISTORY_ARCHITECT; break;
        }
        setData(loadFromStorage(key) || []);
    }, [activeTab, refreshKey]);

    const handleRefresh = () => setRefreshKey(prev => prev + 1);

    const handleClearAll = () => {
        if(confirm('Are you sure you want to wipe this category?')) {
            let key = '';
            switch(activeTab) {
                case 'lab': key = STORAGE_KEYS.HISTORY_LAB; break;
                case 'studio': key = STORAGE_KEYS.HISTORY_STUDIO; break;
                case 'architect': key = STORAGE_KEYS.HISTORY_ARCHITECT; break;
            }
            saveToStorage(key, []);
            handleRefresh();
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleString();

    const tabs = [
        { id: 'lab', label: t('admin.tabLab'), icon: FileText },
        { id: 'studio', label: t('admin.tabStudio'), icon: PenTool },
        { id: 'architect', label: t('admin.tabArchitect'), icon: Network },
    ];

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 p-3 rounded-lg text-white">
                            <Database size={24} />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900">{t('admin.title')}</h1>
                            <p className="text-slate-500 text-sm">Local Storage Inspector</p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                    >
                        <LogOut size={18} /> {t('admin.exit')}
                    </button>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="border-b border-slate-200 flex items-center justify-between p-2 bg-slate-50">
                        <div className="flex gap-2">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-teal-600 shadow-sm ring-1 ring-slate-200' 
                                        : 'text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    <tab.icon size={16} /> {tab.label}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 mr-2">
                            <button onClick={handleRefresh} className="p-2 text-slate-500 hover:text-teal-600 rounded-lg hover:bg-slate-100" title={t('admin.refresh')}>
                                <RefreshCw size={18} />
                            </button>
                            <button onClick={handleClearAll} className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50" title={t('admin.clearAll')}>
                                <Trash2 size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        {data.length === 0 ? (
                            <div className="p-12 text-center text-slate-400 italic">
                                {t('admin.empty')}
                            </div>
                        ) : (
                            <table className="w-full text-left text-sm border-collapse">
                                <thead className="bg-slate-50 text-slate-500">
                                    <tr>
                                        <th className="p-4 font-medium border-b border-slate-200 w-24">{t('admin.id')}</th>
                                        <th className="p-4 font-medium border-b border-slate-200 w-48">{t('admin.timestamp')}</th>
                                        <th className="p-4 font-medium border-b border-slate-200">{t('admin.content')}</th>
                                        <th className="p-4 font-medium border-b border-slate-200 w-32">{t('admin.type')}</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {data.map((item) => (
                                        <tr key={item.id} className="hover:bg-slate-50">
                                            <td className="p-4 font-mono text-xs text-slate-400">{item.id ? item.id.slice(-6) : '---'}</td>
                                            <td className="p-4 text-slate-600">{formatDate(item.timestamp)}</td>
                                            <td className="p-4">
                                                <div className="max-w-lg truncate text-slate-800 font-medium">
                                                    {activeTab === 'lab' ? item.inputText : 
                                                     activeTab === 'studio' ? (item.trendFocus || 'No Topic') : 
                                                     item.premise}
                                                </div>
                                                <div className="max-w-lg truncate text-slate-400 text-xs mt-1">
                                                     {activeTab === 'lab' ? (item.snippet || '') : 
                                                     activeTab === 'studio' ? (item.content ? item.content.substring(0, 50) : '') : 
                                                     item.outline?.name}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-medium border border-slate-200">
                                                     {activeTab === 'lab' ? item.mode : 'General'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
