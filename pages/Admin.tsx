
import React, { useState, useEffect, useRef } from 'react';
import { STORAGE_KEYS, loadFromStorage, saveToStorage } from '../services/storageService';
import { Logger } from '../services/logger';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { Database, Trash2, RefreshCw, LogOut, FileText, PenTool, Network, Terminal, Download, Settings, Save, RotateCcw, Upload, Activity, MessageSquare, Server } from 'lucide-react';
import { LogEntry, LogLevel } from '../types';
import { ModelHealthChecker } from '../components/ModelHealthChecker';
import { PromptManager } from './PromptManager';
import { BackendMonitor } from '../components/admin/BackendMonitor';
import { ApiKeyManager } from '../components/admin/ApiKeyManager';
import { BackendAPI } from '../services/backendApi';


interface AdminProps {
    onLogout: () => void;
}

export const Admin: React.FC<AdminProps> = ({ onLogout }) => {
    const { t } = useI18n();
    const { modelConfigs, updateModelConfig, resetModelConfigs } = useApp();
    const [activeTab, setActiveTab] = useState<'monitor' | 'apikeys' | 'lab' | 'studio' | 'architect' | 'logs' | 'config' | 'prompts'>('monitor');
    const [data, setData] = useState<any[]>([]);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [refreshKey, setRefreshKey] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showHealthChecker, setShowHealthChecker] = useState(false); // 模型健康检测器显示状态

    // 本地编辑状态，用于模型配置
    const [editingConfigs, setEditingConfigs] = useState<Record<string, any>>({});
    const [backendConfig, setBackendConfig] = useState<{ maxConcurrent: number }>({ maxConcurrent: 3 });

    useEffect(() => {
        if (activeTab === 'logs') {
            setLogs(Logger.getLogs());
        } else if (activeTab === 'config') {
            // 初始化编辑状态
            const initEdit: any = {};
            modelConfigs.forEach(m => {
                initEdit[m.id] = { ...m };
            });
            setEditingConfigs(initEdit);

            // Fetch backend config
            BackendAPI.tasks.queueStatus().then(res => {
                if (res.success) {
                    setBackendConfig({ maxConcurrent: res.data.maxConcurrent });
                }
            });
        } else if (['lab', 'studio', 'architect'].includes(activeTab)) {
            let key = '';
            switch (activeTab) {
                case 'lab': key = STORAGE_KEYS.HISTORY_LAB; break;
                case 'studio': key = STORAGE_KEYS.HISTORY_STUDIO; break;
                case 'architect': key = STORAGE_KEYS.HISTORY_ARCHITECT; break;
            }
            setData(loadFromStorage(key) || []);
        }
    }, [activeTab, refreshKey, modelConfigs]);

    const handleRefresh = () => setRefreshKey(prev => prev + 1);

    const handleClearAll = () => {
        if (confirm('Are you sure you want to wipe this category?')) {
            if (activeTab === 'logs') {
                Logger.clearLogs();
            } else {
                let key = '';
                switch (activeTab) {
                    case 'lab': key = STORAGE_KEYS.HISTORY_LAB; break;
                    case 'studio': key = STORAGE_KEYS.HISTORY_STUDIO; break;
                    case 'architect': key = STORAGE_KEYS.HISTORY_ARCHITECT; break;
                }
                saveToStorage(key, []);
            }
            handleRefresh();
        }
    };

    // ... (keep existing export/import logic) ...
    const handleExportAll = () => {
        const allData: Record<string, any> = {};
        Object.values(STORAGE_KEYS).forEach(key => {
            allData[key] = loadFromStorage(key);
        });

        const dataStr = JSON.stringify(allData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `inkflow_full_backup_${new Date().toISOString().slice(0, 10)}.json`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImportAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files.length > 0) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target?.result as string);

                    if (typeof importedData === 'object' && importedData !== null) {
                        // Confirm overwrite
                        if (confirm(t('admin.confirmImport'))) {
                            const validKeys = Object.values(STORAGE_KEYS);
                            let importedCount = 0;

                            Object.keys(importedData).forEach(key => {
                                // Only import keys that match known STORAGE_KEYS to allow system data restore
                                if (validKeys.includes(key)) {
                                    saveToStorage(key, importedData[key]);
                                    importedCount++;
                                }
                            });

                            alert(t('admin.importSuccess') + ` (${importedCount} keys restored)`);
                            window.location.reload();
                        }
                    } else {
                        alert("Invalid file format.");
                    }
                } catch (error) {
                    console.error(error);
                    alert("Failed to import data. Check file format.");
                }
            };
        }
    };

    const handleConfigChange = (id: string, field: string, value: any) => {
        setEditingConfigs(prev => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: Number(value)
            }
        }));
    };

    const saveConfig = (id: string) => {
        if (editingConfigs[id]) {
            updateModelConfig(id, editingConfigs[id]);
            alert(t('admin.config.saved'));
        }
    };

    const handleResetConfig = () => {
        if (confirm("Reset all models to default settings?")) {
            resetModelConfigs();
        }
    }

    const handleBackendConfigChange = (val: number) => {
        setBackendConfig({ maxConcurrent: val });
    };

    const saveBackendConfig = async () => {
        try {
            await BackendAPI.tasks.configQueue({ maxConcurrent: backendConfig.maxConcurrent });
            alert(t('admin.config.saved'));
        } catch (error) {
            alert('Failed to save backend config');
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleString();

    const tabs = [
        { id: 'monitor', label: 'Backend Monitor', icon: Activity },
        { id: 'apikeys', label: 'API Keys', icon: Network },
        { id: 'config', label: t('admin.tabConfig'), icon: Settings },
        { id: 'prompts', label: '提示词管理', icon: MessageSquare },
        { id: 'lab', label: t('admin.tabLab'), icon: FileText },
        { id: 'studio', label: t('admin.tabStudio'), icon: PenTool },
        { id: 'architect', label: t('admin.tabArchitect'), icon: Network },
        { id: 'logs', label: t('common.logs'), icon: Terminal },
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
                            <p className="text-slate-500 text-sm">System Monitor & Storage Inspector</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        {/* Hidden File Input for Import */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            accept=".json"
                            onChange={handleImportAll}
                        />

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors border border-slate-300"
                        >
                            <Upload size={18} /> {t('admin.importAll')}
                        </button>

                        <button
                            onClick={handleExportAll}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors border border-slate-300"
                        >
                            <Download size={18} /> {t('admin.exportAll')}
                        </button>
                        <button
                            onClick={onLogout}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors"
                        >
                            <LogOut size={18} /> {t('admin.exit')}
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[600px] flex flex-col">
                    <div className="border-b border-slate-200 flex items-center justify-between p-2 bg-slate-50">
                        <div className="flex gap-2 overflow-x-auto">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === tab.id
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
                            {!['config', 'monitor', 'apikeys'].includes(activeTab) && (
                                <button onClick={handleClearAll} className="p-2 text-slate-500 hover:text-red-600 rounded-lg hover:bg-red-50" title={t('admin.clearAll')}>
                                    <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="p-0 overflow-x-auto flex-1">
                        {activeTab === 'monitor' ? (
                            <BackendMonitor />
                        ) : activeTab === 'apikeys' ? (
                            <ApiKeyManager />
                        ) : activeTab === 'config' ? (
                            // --- CONFIG VIEW ---
                            <div className="p-6 space-y-8">
                                {/* Backend Configuration */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Server size={18} className="text-teal-600" /> Backend Configuration
                                        </h3>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1">
                                                <label className="block text-sm font-medium text-slate-700 mb-1">Max Concurrent Tasks</label>
                                                <p className="text-xs text-slate-500">Maximum number of AI tasks running simultaneously.</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="10"
                                                    value={backendConfig.maxConcurrent}
                                                    onChange={(e) => handleBackendConfigChange(parseInt(e.target.value) || 1)}
                                                    className="w-20 p-2 border border-slate-200 rounded text-sm"
                                                />
                                                <button
                                                    onClick={saveBackendConfig}
                                                    className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700 transition-colors"
                                                    title="Save Backend Config"
                                                >
                                                    <Save size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Frontend Model Configuration */}
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                            <Settings size={18} className="text-teal-600" /> Frontend Model Configuration
                                        </h3>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setShowHealthChecker(true)}
                                                className="flex items-center gap-2 text-sm text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded transition-colors border border-teal-200"
                                            >
                                                <Activity size={14} /> Test Health
                                            </button>
                                            <button onClick={handleResetConfig} className="flex items-center gap-2 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded transition-colors">
                                                <RotateCcw size={14} /> Reset Defaults
                                            </button>
                                        </div>
                                    </div>
                                    <div className="overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm">
                                        <table className="w-full text-left text-sm border-collapse">
                                            <thead className="bg-slate-50 text-slate-500">
                                                <tr>
                                                    <th className="p-4 font-medium border-b border-slate-200">{t('admin.config.modelName')}</th>
                                                    <th className="p-4 font-medium border-b border-slate-200">{t('admin.config.rpm')}</th>
                                                    <th className="p-4 font-medium border-b border-slate-200">{t('admin.config.rpd')}</th>
                                                    <th className="p-4 font-medium border-b border-slate-200">{t('admin.config.context')}</th>
                                                    <th className="p-4 font-medium border-b border-slate-200 w-24">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {modelConfigs.map((model) => (
                                                    <tr key={model.id} className="hover:bg-slate-50">
                                                        <td className="p-4 font-medium text-slate-700">
                                                            {t(model.nameKey)}
                                                            <div className="text-xs text-slate-400 font-mono mt-1">{model.id}</div>
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="number"
                                                                value={editingConfigs[model.id]?.rpm ?? model.rpm}
                                                                onChange={(e) => handleConfigChange(model.id, 'rpm', e.target.value)}
                                                                className="w-24 p-2 border border-slate-200 rounded text-sm bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="number"
                                                                value={editingConfigs[model.id]?.dailyLimit ?? model.dailyLimit}
                                                                onChange={(e) => handleConfigChange(model.id, 'dailyLimit', e.target.value)}
                                                                className="w-24 p-2 border border-slate-200 rounded text-sm bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <input
                                                                type="number"
                                                                value={editingConfigs[model.id]?.contextWindow ?? model.contextWindow}
                                                                onChange={(e) => handleConfigChange(model.id, 'contextWindow', e.target.value)}
                                                                className="w-32 p-2 border border-slate-200 rounded text-sm bg-white"
                                                            />
                                                        </td>
                                                        <td className="p-4">
                                                            <button
                                                                onClick={() => saveConfig(model.id)}
                                                                className="p-2 bg-teal-50 text-teal-600 rounded hover:bg-teal-100 transition-colors"
                                                                title={t('admin.config.save')}
                                                            >
                                                                <Save size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        ) : activeTab === 'prompts' ? (
                            // --- PROMPTS VIEW ---
                            <div className="h-full">
                                <PromptManager />
                            </div>
                        ) : activeTab === 'logs' ? (
                            // --- LOGS VIEW ---
                            <div className="h-full overflow-y-auto">
                                <table className="w-full text-left text-xs font-mono border-collapse">
                                    <thead className="bg-slate-900 text-slate-400 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-3 w-32">{t('admin.timestamp')}</th>
                                            <th className="p-3 w-20">{t('common.level')}</th>
                                            <th className="p-3 w-24">Category</th>
                                            <th className="p-3">{t('common.message')}</th>
                                            <th className="p-3 w-20">Session</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {logs.map((log) => (
                                            <tr key={log.id} className={`hover:bg-slate-50 ${log.level === LogLevel.ERROR ? 'bg-red-50' : ''}`}>
                                                <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                                <td className="p-3">
                                                    <span className={`px-1.5 py-0.5 rounded font-bold ${log.level === LogLevel.INFO ? 'text-blue-600 bg-blue-50' :
                                                        log.level === LogLevel.WARN ? 'text-amber-600 bg-amber-50' :
                                                            log.level === LogLevel.ERROR ? 'text-red-600 bg-red-100' : 'text-purple-600'
                                                        }`}>
                                                        {log.level}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-slate-600 font-semibold">{log.category}</td>
                                                <td className="p-3 text-slate-800 break-all">
                                                    {log.message}
                                                    {log.data && (
                                                        <pre className="mt-1 text-[10px] text-slate-500 bg-slate-100 p-1 rounded overflow-x-auto max-h-20">
                                                            {JSON.stringify(log.data, null, 2)}
                                                        </pre>
                                                    )}
                                                </td>
                                                <td className="p-3 text-slate-400 text-[10px]">{log.sessionId.slice(0, 6)}</td>
                                            </tr>
                                        ))}
                                        {logs.length === 0 && (
                                            <tr><td colSpan={5} className="p-8 text-center text-slate-400">No logs found.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // --- DATA VIEW ---
                            data.length === 0 ? (
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
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* 模型健康检测器 */}
            {showHealthChecker && (
                <ModelHealthChecker
                    apiKey={process.env.API_KEY || ''}
                    onClose={() => setShowHealthChecker(false)}
                />
            )}
        </div>
    );
};
