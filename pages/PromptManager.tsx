/**
 * @file pages/PromptManager.tsx
 * @description 提示词管理界面
 * 
 * 管理员可以在这里查看和编辑所有的AI提示词配置
 */

import React, { useState, useEffect } from 'react';
import {
    loadPromptConfig,
    savePromptConfig,
    updatePromptConfig,
    resetPromptConfig,
    exportPromptConfig,
    importPromptConfig,
    PromptConfigItem,
    PROMPT_CATEGORIES
} from '../promptConfig';
import { Settings, Save, RotateCcw, Download, Upload, Search, Edit2, X, Check, AlertTriangle } from 'lucide-react';

/**
 * 提示词管理器组件
 */
export const PromptManager: React.FC = () => {
    const [prompts, setPrompts] = useState<PromptConfigItem[]>([]);
    const [selectedPrompt, setSelectedPrompt] = useState<PromptConfigItem | null>(null);
    const [editingContent, setEditingContent] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [importText, setImportText] = useState('');

    // 加载提示词配置
    useEffect(() => {
        loadPrompts();
    }, []);

    const loadPrompts = () => {
        const config = loadPromptConfig();
        setPrompts(config);
    };

    // 过滤提示词
    const filteredPrompts = prompts.filter(prompt => {
        const matchesSearch = prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            prompt.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || prompt.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    // 开始编辑
    const handleEdit = (prompt: PromptConfigItem) => {
        setSelectedPrompt(prompt);
        setEditingContent(prompt.content);
        setIsEditing(true);
    };

    // 保存编辑
    const handleSave = () => {
        if (selectedPrompt) {
            updatePromptConfig(selectedPrompt.id, { content: editingContent });
            loadPrompts();
            setIsEditing(false);
            alert('保存成功!');
        }
    };

    // 取消编辑
    const handleCancel = () => {
        setIsEditing(false);
        setEditingContent(selectedPrompt?.content || '');
    };

    // 重置所有配置
    const handleReset = () => {
        if (confirm('确定要重置所有提示词配置为默认值吗?这将清除所有自定义修改!')) {
            resetPromptConfig();
            loadPrompts();
            setSelectedPrompt(null);
            setIsEditing(false);
            alert('已重置为默认配置!');
        }
    };

    // 导出配置
    const handleExport = () => {
        const json = exportPromptConfig();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompt-config-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // 导入配置
    const handleImport = () => {
        if (importPromptConfig(importText)) {
            loadPrompts();
            setShowImportDialog(false);
            setImportText('');
            alert('导入成功!');
        } else {
            alert('导入失败!请检查JSON格式是否正确。');
        }
    };

    // 获取分类列表
    const categories = ['all', ...Object.values(PROMPT_CATEGORIES)];

    return (
        <div className="flex h-full bg-slate-100">
            {/* 左侧列表 */}
            <div className="w-80 bg-white border-r border-slate-200 flex flex-col">
                {/* 头部 */}
                <div className="p-4 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 mb-4">
                        <Settings size={20} />
                        提示词管理
                    </h2>

                    {/* 搜索 */}
                    <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索提示词..."
                            className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                        />
                    </div>

                    {/* 分类筛选 */}
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                    >
                        <option value="all">全部分类</option>
                        {Object.values(PROMPT_CATEGORIES).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                {/* 提示词列表 */}
                <div className="flex-1 overflow-y-auto p-2">
                    {filteredPrompts.map(prompt => (
                        <div
                            key={prompt.id}
                            onClick={() => {
                                setSelectedPrompt(prompt);
                                setEditingContent(prompt.content);
                                setIsEditing(false);
                            }}
                            className={`p-3 mb-2 rounded-lg cursor-pointer transition-all ${selectedPrompt?.id === prompt.id
                                    ? 'bg-teal-50 border-2 border-teal-500'
                                    : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                                }`}
                        >
                            <div className="font-bold text-sm text-slate-800 mb-1">{prompt.name}</div>
                            <div className="text-xs text-slate-500 mb-2">{prompt.description}</div>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] px-2 py-0.5 bg-slate-200 rounded text-slate-600">
                                    {prompt.category}
                                </span>
                                <span className="text-[10px] text-slate-400">v{prompt.version}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 底部操作 */}
                <div className="p-3 border-t border-slate-200 space-y-2">
                    <button
                        onClick={handleExport}
                        className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold hover:bg-blue-100 flex items-center justify-center gap-2"
                    >
                        <Download size={14} />
                        导出配置
                    </button>
                    <button
                        onClick={() => setShowImportDialog(true)}
                        className="w-full py-2 bg-green-50 text-green-600 rounded-lg text-sm font-bold hover:bg-green-100 flex items-center justify-center gap-2"
                    >
                        <Upload size={14} />
                        导入配置
                    </button>
                    <button
                        onClick={handleReset}
                        className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                    >
                        <RotateCcw size={14} />
                        重置为默认
                    </button>
                </div>
            </div>

            {/* 右侧编辑区 */}
            <div className="flex-1 flex flex-col">
                {selectedPrompt ? (
                    <>
                        {/* 头部信息 */}
                        <div className="bg-white border-b border-slate-200 p-4">
                            <div className="flex items-start justify-between mb-2">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-800">{selectedPrompt.name}</h3>
                                    <p className="text-sm text-slate-600 mt-1">{selectedPrompt.description}</p>
                                </div>
                                {!isEditing && selectedPrompt.editable && (
                                    <button
                                        onClick={() => handleEdit(selectedPrompt)}
                                        className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2"
                                    >
                                        <Edit2 size={14} />
                                        编辑
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span>分类: {selectedPrompt.category}</span>
                                <span>版本: {selectedPrompt.version}</span>
                                {selectedPrompt.lastModified && (
                                    <span>最后修改: {new Date(selectedPrompt.lastModified).toLocaleString()}</span>
                                )}
                            </div>
                        </div>

                        {/* 内容区 */}
                        <div className="flex-1 p-6 overflow-y-auto">
                            {isEditing ? (
                                <div className="h-full flex flex-col">
                                    <textarea
                                        value={editingContent}
                                        onChange={(e) => setEditingContent(e.target.value)}
                                        className="flex-1 p-4 border border-slate-300 rounded-lg font-mono text-sm resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                                        placeholder="输入提示词内容..."
                                    />
                                    <div className="flex justify-end gap-2 mt-4">
                                        <button
                                            onClick={handleCancel}
                                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200 flex items-center gap-2"
                                        >
                                            <X size={14} />
                                            取消
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700 flex items-center gap-2"
                                        >
                                            <Check size={14} />
                                            保存
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
                                    <pre className="whitespace-pre-wrap font-mono text-sm text-slate-700 leading-relaxed">
                                        {selectedPrompt.content}
                                    </pre>
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400">
                        <div className="text-center">
                            <Settings size={64} className="mx-auto mb-4 opacity-20" />
                            <p>请从左侧选择一个提示词配置</p>
                        </div>
                    </div>
                )}
            </div>

            {/* 导入对话框 */}
            {showImportDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-[600px] max-h-[80vh] flex flex-col">
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Upload size={20} />
                            导入配置
                        </h3>
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <p className="text-sm text-slate-600 mb-3">
                                粘贴导出的JSON配置内容:
                            </p>
                            <textarea
                                value={importText}
                                onChange={(e) => setImportText(e.target.value)}
                                className="flex-1 p-3 border border-slate-300 rounded-lg font-mono text-xs resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder='{"prompts": [...]}'
                            />
                        </div>
                        <div className="flex justify-end gap-2 mt-4">
                            <button
                                onClick={() => {
                                    setShowImportDialog(false);
                                    setImportText('');
                                }}
                                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-200"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleImport}
                                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700"
                            >
                                导入
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
