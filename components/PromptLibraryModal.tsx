
/**
 * @file components/PromptLibraryModal.tsx
 * @description 提示词库管理组件。
 * 
 * ## 功能
 * 1. **列表展示**: 左侧显示现有提示词，支持搜索过滤。
 * 2. **增删改查**: 支持新建、编辑、删除提示词。
 * 3. **实时预览**: 右侧实时编辑提示词内容和标签。
 */

import React, { useState, useEffect } from 'react';
import { X, Library, Plus, Trash2, Save, Search, PenLine, FileText, FileJson, ArrowRightLeft, Loader2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { PromptTemplate } from '../types';
import { transformPromptFormat } from '../services/geminiService';

interface PromptLibraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose }) => {
    const { t, lang } = useI18n();
    const { promptLibrary, addPrompt, updatePrompt, deletePrompt } = useApp();
    
    // 状态管理
    const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // 编辑器状态
    const [editName, setEditName] = useState('');
    const [editContent, setEditContent] = useState('');
    const [editTags, setEditTags] = useState('');
    
    // 转换状态
    const [isTransforming, setIsTransforming] = useState(false);
    
    // 原始内容备份 (用于还原自然语言)
    const [originalNaturalContent, setOriginalNaturalContent] = useState<string | null>(null);

    // 初始化选中第一个提示词
    useEffect(() => {
        if (isOpen && promptLibrary.length > 0 && !selectedPromptId) {
            handleSelectPrompt(promptLibrary[0]);
        }
    }, [isOpen, promptLibrary]);

    // 选择提示词
    const handleSelectPrompt = (prompt: PromptTemplate) => {
        setSelectedPromptId(prompt.id);
        setEditName(prompt.name);
        setEditContent(prompt.content);
        setEditTags(prompt.tags.join(', '));
        setIsEditing(false); // 退出新建模式
        setOriginalNaturalContent(null); // 重置备份
    };

    // 进入新建模式
    const handleNewPrompt = () => {
        setSelectedPromptId(null);
        setEditName('');
        setEditContent('');
        setEditTags('');
        setIsEditing(true);
        setOriginalNaturalContent(null);
    };

    // 保存提示词 (新建或更新)
    const handleSave = () => {
        if (!editName.trim() || !editContent.trim()) return;

        const tags = editTags.split(',').map(t => t.trim()).filter(Boolean);

        if (isEditing || !selectedPromptId) {
            // 新建逻辑
            const newPrompt: PromptTemplate = {
                id: Date.now().toString(),
                name: editName,
                content: editContent,
                tags: tags
            };
            addPrompt(newPrompt);
            handleSelectPrompt(newPrompt);
        } else {
            // 更新逻辑
            updatePrompt(selectedPromptId, {
                name: editName,
                content: editContent,
                tags: tags
            });
        }
        alert(t('promptLib.saveSuccess'));
    };

    // 删除提示词
    const handleDelete = (id: string) => {
        if (confirm(t('promptLib.deleteConfirm'))) {
            deletePrompt(id);
            if (selectedPromptId === id) {
                if (promptLibrary.length > 1) {
                    // 选中列表中的另一个
                    const next = promptLibrary.find(p => p.id !== id);
                    if (next) handleSelectPrompt(next);
                } else {
                    handleNewPrompt();
                }
            }
        }
    };
    
    // 提示词格式转换
    const handleTransformFormat = async (target: 'structured' | 'natural') => {
        if (!editContent) return;
        
        // 逻辑更新：
        // 1. 如果是转结构化：备份当前的自然语言（如果还没有备份）
        // 2. 如果是转自然语言：如果有备份，直接还原，否则调用 AI
        
        if (target === 'structured') {
            // 如果还没有备份，则认为当前就是自然语言，保存它
            if (!originalNaturalContent) {
                setOriginalNaturalContent(editContent);
            }
            
            setIsTransforming(true);
            try {
                const transformed = await transformPromptFormat(editContent, target, lang);
                setEditContent(transformed);
            } catch (e) {
                alert("Transformation failed.");
            } finally {
                setIsTransforming(false);
            }
        } else {
            // 还原自然语言
            if (originalNaturalContent) {
                setEditContent(originalNaturalContent);
                // 不清空备份，允许反复切换
            } else {
                // 如果没有备份（比如打开即结构化），则调用 AI 尝试还原
                setIsTransforming(true);
                try {
                    const transformed = await transformPromptFormat(editContent, target, lang);
                    setEditContent(transformed);
                } catch (e) {
                    alert("Transformation failed.");
                } finally {
                    setIsTransforming(false);
                }
            }
        }
    };

    // 搜索过滤
    const filteredPrompts = promptLibrary.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.content.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex h-[80vh]">
                
                {/* 左侧：列表区 */}
                <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
                    {/* 头部 */}
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Library size={16} className="text-teal-600" />
                            {t('promptLib.title')}
                        </h2>
                        <button 
                            onClick={handleNewPrompt}
                            className="p-1.5 bg-slate-900 text-white rounded hover:bg-teal-600 transition-colors"
                            title={t('promptLib.newPrompt')}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    
                    {/* 搜索栏 */}
                    <div className="p-2 border-b border-slate-200 bg-white">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-2.5 text-slate-400"/>
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 bg-slate-100 border-none rounded text-xs focus:ring-1 focus:ring-teal-500"
                                placeholder={t('common.search')}
                            />
                        </div>
                    </div>

                    {/* 列表 */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredPrompts.length === 0 ? (
                            <div className="text-center text-slate-400 py-10 text-xs italic">{t('promptLib.empty')}</div>
                        ) : (
                            filteredPrompts.map(p => (
                                <div 
                                    key={p.id}
                                    onClick={() => handleSelectPrompt(p)}
                                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-center group transition-colors ${selectedPromptId === p.id && !isEditing ? 'bg-white border border-teal-200 shadow-sm' : 'hover:bg-slate-200 border border-transparent'}`}
                                >
                                    <div className="min-w-0">
                                        <div className={`text-sm font-bold truncate ${selectedPromptId === p.id && !isEditing ? 'text-teal-700' : 'text-slate-700'}`}>{p.name}</div>
                                        <div className="flex gap-1 mt-1">
                                            {p.tags.slice(0, 2).map((tag, i) => (
                                                <span key={i} className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded truncate max-w-[60px]">{tag}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 右侧：编辑区 */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center h-14">
                        <h3 className="text-sm font-bold text-slate-800">
                            {isEditing || !selectedPromptId ? t('promptLib.newPrompt') : t('promptLib.editPrompt')}
                        </h3>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        {/* 名称输入 */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('promptLib.name')}</label>
                            <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2 focus-within:ring-2 focus-within:ring-teal-500">
                                <PenLine size={16} className="text-slate-400" />
                                <input 
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="flex-1 text-sm outline-none font-bold text-slate-800 placeholder:font-normal"
                                    placeholder={t('promptLib.namePlaceholder')}
                                />
                            </div>
                        </div>

                        {/* 内容输入 */}
                        <div className="flex-1 flex flex-col">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase">{t('promptLib.instruction')}</label>
                                <div className="flex gap-2 items-center">
                                    <span className="text-[10px] text-slate-400 mr-2">{t('promptLib.transform')}:</span>
                                    <button 
                                        onClick={() => handleTransformFormat('structured')} 
                                        disabled={isTransforming}
                                        className="text-[10px] flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-teal-600 transition-colors"
                                        title="Convert to Structured (JSON/Markdown)"
                                    >
                                        <FileJson size={12}/> {isTransforming ? t('promptLib.transforming') : t('promptLib.toStructured')}
                                    </button>
                                    <button 
                                        onClick={() => handleTransformFormat('natural')} 
                                        disabled={isTransforming}
                                        className="text-[10px] flex items-center gap-1 bg-slate-100 px-2 py-1 rounded text-slate-600 hover:bg-slate-200 hover:text-teal-600 transition-colors"
                                        title={originalNaturalContent ? "Restore Original Natural Language" : "Convert to Natural Language"}
                                    >
                                        <FileText size={12}/> {isTransforming ? t('promptLib.transforming') : (originalNaturalContent ? t('common.retry') /*Using retry icon concept for Restore*/ : t('promptLib.toNatural'))}
                                        {originalNaturalContent && <span className="text-[8px] bg-green-100 text-green-700 px-1 rounded ml-1">Cached</span>}
                                    </button>
                                </div>
                            </div>
                            <div className="relative w-full flex-1 min-h-[300px]">
                                <textarea 
                                    value={editContent}
                                    onChange={(e) => {
                                        setEditContent(e.target.value);
                                        // 如果用户手动修改了内容，原本的“原始备份”可能就不再适用了，
                                        // 但这里我们选择保留备份，让用户依然能回退到“刚打开时的状态”。
                                        // 这是一个设计选择。
                                    }}
                                    className="absolute inset-0 w-full h-full p-4 border border-slate-200 rounded-lg text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-600 bg-slate-50 focus:bg-white transition-colors"
                                    placeholder={t('promptLib.contentPlaceholder')}
                                    disabled={isTransforming}
                                />
                                {isTransforming && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/50 backdrop-blur-sm rounded-lg">
                                        <Loader2 className="animate-spin text-teal-600" size={24} />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 标签输入 */}
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Tags</label>
                            <input 
                                value={editTags}
                                onChange={(e) => setEditTags(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                placeholder={t('promptLib.tagsPlaceholder')}
                            />
                        </div>
                    </div>

                    {/* 底部操作栏 */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button 
                            onClick={handleSave}
                            className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-900/10 transition-transform active:scale-95"
                        >
                            <Save size={16} /> {t('common.save')}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};
