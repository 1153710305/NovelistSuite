
/**
 * @file pages/Architect.tsx
 * @description 故事架构师 (Story Architect) 核心页面。
 */

import React, { useState, useEffect, useMemo } from 'react';
import { generateChapterContent, expandNodeContent, generateNovelArchitecture, optimizeContextWithAI, retrieveRelevantContext } from '../services/geminiServiceAdapter';
import { OutlineNode, ArchitectRecord, ContextConfig } from '../types';
import { MindMap } from '../components/MindMap';
import { Network, Loader2, FileText, Trash2, FolderOpen, RefreshCw, BookOpen, ImageIcon, Edit2, Plus, CopyPlus, Sparkles, Settings2, X, BarChart, Hash, Eye, Link as LinkIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem, updateHistoryItem, addHistoryItem } from '../services/storageService';

/**
 * 架构师组件
 */
export const Architect: React.FC = () => {
    const { t, lang } = useI18n();
    const { architectState, setArchitectState, startArchitectGeneration, model, promptLibrary, globalPersona } = useApp();

    // --- 状态定义 ---

    // 核心输入 (Local state synced with Global)
    const [premise, setPremise] = useState(''); // 小说前提/核心脑洞

    // 视图模式: 'map' (导图) 或 'manuscript' (线性文档)
    const [viewMode, setViewMode] = useState<'map' | 'manuscript'>('map');

    // 编辑状态
    const [selectedNode, setSelectedNode] = useState<OutlineNode | null>(null); // 当前选中的大纲节点
    const [isEditing, setIsEditing] = useState(false); // 是否处于编辑模式
    const [editName, setEditName] = useState(''); // 编辑中的节点名称
    const [editDesc, setEditDesc] = useState(''); // 编辑中的节点描述

    // 生成状态
    const [generatingChapter, setGeneratingChapter] = useState(false); // 正在生成草稿
    const [expandingNode, setExpandingNode] = useState(false); // 正在扩展子节点

    // 草稿配置
    const [draftWordCount, setDraftWordCount] = useState<number>(2000); // 目标字数

    // 提示词选择
    const [selectedPromptId, setSelectedPromptId] = useState<string>('');
    const [expandPromptId, setExpandPromptId] = useState<string>('');

    const [history, setHistory] = useState<ArchitectRecord[]>([]);

    // Sync Global State to Local
    useEffect(() => {
        if (architectState.premise) setPremise(architectState.premise);
    }, [architectState.premise]);

    // Load History
    useEffect(() => {
        setHistory(getHistory<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT));
    }, [architectState.activeRecordId]); // Reload when active record changes (e.g. new generation)

    // Handlers

    const handleGenerateArchitecture = () => {
        if (!premise) return;
        startArchitectGeneration(premise, lang);
    };

    const handleLoadHistory = (record: ArchitectRecord) => {
        setArchitectState(prev => ({
            ...prev,
            premise: record.premise,
            synopsis: record.synopsis,
            outline: record.outline,
            activeRecordId: record.id,
            isGenerating: false
        }));
        setPremise(record.premise);
        setSelectedNode(null);
    };

    const handleDeleteHistory = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const updated = deleteHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, id);
        setHistory(updated);
        if (architectState.activeRecordId === id) {
            setArchitectState(prev => ({ ...prev, activeRecordId: undefined, outline: null, premise: '', synopsis: '' }));
        }
    };

    const handleNodeClick = (node: OutlineNode) => {
        setSelectedNode(node);
        setEditName(node.name);
        setEditDesc(node.description || '');
        setIsEditing(false);
    };

    const updateNodeInTree = (root: OutlineNode, targetId: string, updates: Partial<OutlineNode>): OutlineNode => {
        if (root.id === targetId) return { ...root, ...updates };
        if (root.children) return { ...root, children: root.children.map(child => updateNodeInTree(child, targetId, updates)) };
        return root;
    };

    const handleSaveNode = () => {
        if (!architectState.outline || !selectedNode?.id) return;
        const newOutline = updateNodeInTree(architectState.outline, selectedNode.id, { name: editName, description: editDesc });
        setArchitectState(prev => ({ ...prev, outline: newOutline }));
        setSelectedNode({ ...selectedNode, name: editName, description: editDesc });
        setIsEditing(false);

        if (architectState.activeRecordId) {
            updateHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, architectState.activeRecordId, { outline: newOutline });
        }
    };

    const handleExpandNode = async () => {
        if (!selectedNode || !architectState.outline) return;
        setExpandingNode(true);
        try {
            const context = selectedNode.description || selectedNode.name;
            const style = expandPromptId ? promptLibrary.find(p => p.id === expandPromptId)?.content : undefined;

            const newChildren = await expandNodeContent(selectedNode, context, lang, model, style, globalPersona);

            if (newChildren && newChildren.length > 0) {
                const newOutline = updateNodeInTree(architectState.outline, selectedNode.id || '', { children: [...(selectedNode.children || []), ...newChildren] });
                setArchitectState(prev => ({ ...prev, outline: newOutline }));
                if (architectState.activeRecordId) {
                    updateHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, architectState.activeRecordId, { outline: newOutline });
                }
                setSelectedNode({ ...selectedNode, children: [...(selectedNode.children || []), ...newChildren] });
            }
        } catch (e) {
            console.error(e);
            alert(t('common.errorDesc'));
        } finally {
            setExpandingNode(false);
        }
    };

    const handleGenerateDraft = async () => {
        if (!selectedNode) return;
        setGeneratingChapter(true);
        try {
            // Simple context: node description + parent context if possible
            const context = selectedNode.description || '';
            const style = selectedPromptId ? promptLibrary.find(p => p.id === selectedPromptId)?.content : undefined;

            const content = await generateChapterContent(
                selectedNode,
                context,
                lang,
                model,
                style,
                draftWordCount,
                globalPersona
            );

            const newOutline = updateNodeInTree(architectState.outline!, selectedNode.id!, { content });
            setArchitectState(prev => ({ ...prev, outline: newOutline }));
            setSelectedNode({ ...selectedNode, content });

            if (architectState.activeRecordId) {
                updateHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, architectState.activeRecordId, { outline: newOutline });
            }
        } catch (e) {
            console.error(e);
            alert(t('common.errorDesc'));
        } finally {
            setGeneratingChapter(false);
        }
    };

    const handleDeleteNode = () => {
        if (!selectedNode || !architectState.outline) return;
        if (!confirm(t('architect.confirmDelete'))) return;

        const deleteFromTree = (node: OutlineNode, targetId: string): OutlineNode | null => {
            if (node.id === targetId) return null;
            if (node.children) {
                node.children = node.children.map(c => deleteFromTree(c, targetId)).filter(Boolean) as OutlineNode[];
            }
            return node;
        };

        // Prevent deleting root
        if (selectedNode.id === architectState.outline.id) {
            alert("Cannot delete root node.");
            return;
        }

        const newOutline = deleteFromTree({ ...architectState.outline }, selectedNode.id!);
        if (newOutline) {
            setArchitectState(prev => ({ ...prev, outline: newOutline }));
            setSelectedNode(null);
            if (architectState.activeRecordId) {
                updateHistoryItem<ArchitectRecord>(STORAGE_KEYS.HISTORY_ARCHITECT, architectState.activeRecordId, { outline: newOutline });
            }
        }
    };

    // Render Helpers
    const renderManuscriptView = (node: OutlineNode, depth = 0): React.ReactElement => {
        return (
            <div key={node.id} className="mb-4" style={{ marginLeft: `${depth * 20}px` }}>
                <div className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 bg-slate-200 rounded text-slate-600 uppercase">{node.type}</span>
                    {node.name}
                </div>
                <div className="text-sm text-slate-600 mt-1 pl-2 border-l-2 border-slate-200">{node.description}</div>
                {node.content && (
                    <div className="mt-2 p-4 bg-white border border-slate-100 rounded text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {node.content}
                    </div>
                )}
                {node.children && node.children.map(child => renderManuscriptView(child, depth + 1))}
            </div>
        );
    };

    return (
        <div className="flex h-full bg-slate-100">
            {/* Left Sidebar: History */}
            <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                        <FolderOpen size={14} /> {t('architect.historyTitle')}
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {history.map(item => (
                        <div
                            key={item.id}
                            onClick={() => handleLoadHistory(item)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all relative group ${architectState.activeRecordId === item.id ? 'bg-white border-teal-400 shadow-sm' : 'bg-white/50 border-transparent hover:bg-white hover:border-slate-200'}`}
                        >
                            <div className="text-sm font-bold text-slate-700 truncate pr-6">{item.premise}</div>
                            <div className="text-[10px] text-slate-400 mt-1">{new Date(item.timestamp).toLocaleDateString()}</div>
                            <button
                                onClick={(e) => handleDeleteHistory(e, item.id)}
                                className="absolute right-2 top-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                    {history.length === 0 && <div className="text-center text-slate-400 text-xs mt-4">{t('common.noHistory')}</div>}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Top Bar */}
                <div className="bg-white border-b border-slate-200 p-4 flex items-center justify-between shadow-sm z-10">
                    <div className="flex-1 max-w-2xl flex gap-2">
                        <input
                            value={premise}
                            onChange={(e) => setPremise(e.target.value)}
                            placeholder={t('architect.placeholder')}
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            disabled={architectState.isGenerating}
                        />
                        <button
                            onClick={handleGenerateArchitecture}
                            disabled={!premise || architectState.isGenerating}
                            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                        >
                            {architectState.isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
                            {t('architect.designBtn')}
                        </button>
                    </div>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setViewMode('map')} className={`p-2 rounded ${viewMode === 'map' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><Network size={16} /></button>
                        <button onClick={() => setViewMode('manuscript')} className={`p-2 rounded ${viewMode === 'manuscript' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><FileText size={16} /></button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden relative bg-slate-50">
                    {architectState.isGenerating ? (
                        <div className="flex flex-col items-center justify-center h-full">
                            <div className="w-64 space-y-2">
                                <div className="flex justify-between text-xs text-slate-500 font-bold">
                                    <span>{architectState.generationStage || t('process.init')}</span>
                                    <span>{Math.round(architectState.progress)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div className="h-full bg-teal-500 rounded-full transition-all duration-300" style={{ width: `${architectState.progress}%` }}></div>
                                </div>
                                <div className="text-center text-xs text-slate-400 mt-2">{t('common.safeToLeave')}</div>
                            </div>
                        </div>
                    ) : !architectState.outline ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400">
                            <Network size={64} className="opacity-10 mb-4" />
                            <p>{t('architect.noContent')}</p>
                        </div>
                    ) : viewMode === 'map' ? (
                        <MindMap data={architectState.outline} onNodeClick={handleNodeClick} />
                    ) : (
                        <div className="h-full overflow-y-auto p-8 max-w-4xl mx-auto">
                            <div className="bg-white p-12 shadow-sm min-h-full">
                                <h1 className="text-3xl font-bold text-slate-900 mb-4">{architectState.outline.name}</h1>
                                <p className="text-slate-600 mb-8 italic border-l-4 border-teal-500 pl-4 bg-slate-50 p-2">{architectState.synopsis}</p>
                                {architectState.outline.children?.map(child => renderManuscriptView(child))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Inspector */}
            {selectedNode && (
                <div className="w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col z-20 animate-in slide-in-from-right duration-200">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm">
                            <Settings2 size={16} /> {t('studio.inspector.title')}
                        </h3>
                        <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('architect.nodeName')}</label>
                                {isEditing ? (
                                    <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full p-2 border rounded text-sm" />
                                ) : (
                                    <div className="text-sm font-bold text-slate-800 flex justify-between items-center group">
                                        {selectedNode.name}
                                        <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-teal-600"><Edit2 size={12} /></button>
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase">{t('architect.nodeDesc')}</label>
                                {isEditing ? (
                                    <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} className="w-full p-2 border rounded text-xs h-24" />
                                ) : (
                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 min-h-[60px]">{selectedNode.description}</div>
                                )}
                            </div>
                            {isEditing && (
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => setIsEditing(false)} className="px-3 py-1 text-xs text-slate-500">{t('common.cancel')}</button>
                                    <button onClick={handleSaveNode} className="px-3 py-1 bg-teal-600 text-white rounded text-xs">{t('common.save')}</button>
                                </div>
                            )}
                        </div>

                        {/* Expansion Tools */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2"><Network size={12} /> {t('architect.aiExpand')}</h4>
                            <select
                                value={expandPromptId}
                                onChange={e => setExpandPromptId(e.target.value)}
                                className="w-full p-2 border rounded text-xs bg-slate-50"
                            >
                                <option value="">{t('architect.defaultStyle')}</option>
                                {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button
                                onClick={handleExpandNode}
                                disabled={expandingNode}
                                className="w-full py-2 bg-indigo-50 text-indigo-600 rounded border border-indigo-100 text-xs font-bold hover:bg-indigo-100 flex items-center justify-center gap-2"
                            >
                                {expandingNode ? <Loader2 className="animate-spin" size={12} /> : <CopyPlus size={12} />}
                                {t('architect.expandBtn')}
                            </button>
                        </div>

                        {/* Drafting Tools */}
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-2"><FileText size={12} /> {t('architect.generateDraft')}</h4>
                            <div className="flex gap-2 items-center">
                                <input type="number" value={draftWordCount} onChange={e => setDraftWordCount(Number(e.target.value))} className="w-16 p-1 border rounded text-xs text-center" />
                                <span className="text-xs text-slate-400">words</span>
                            </div>
                            <select
                                value={selectedPromptId}
                                onChange={e => setSelectedPromptId(e.target.value)}
                                className="w-full p-2 border rounded text-xs bg-slate-50"
                            >
                                <option value="">{t('studio.inspector.selectTemplate')}</option>
                                {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            <button
                                onClick={handleGenerateDraft}
                                disabled={generatingChapter}
                                className="w-full py-2 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 flex items-center justify-center gap-2"
                            >
                                {generatingChapter ? <Loader2 className="animate-spin" size={12} /> : <Sparkles size={12} />}
                                {t('architect.generateDraft')}
                            </button>
                        </div>

                        <div className="pt-4 border-t border-slate-100">
                            <button onClick={handleDeleteNode} className="w-full py-2 text-red-500 hover:bg-red-50 rounded text-xs font-bold flex items-center justify-center gap-2">
                                <Trash2 size={12} /> {t('architect.deleteNode')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
