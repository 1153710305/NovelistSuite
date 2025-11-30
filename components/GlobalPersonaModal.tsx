
import React, { useState, useEffect } from 'react';
import { X, UserCog, RotateCcw, Save, Plus, CheckCircle2, Trash2, Library, PenLine, ArrowRight } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { PersonaTemplate } from '../types';

interface GlobalPersonaModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const GlobalPersonaModal: React.FC<GlobalPersonaModalProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { globalPersona, updateGlobalPersona, personaLibrary, addPersona, updatePersona, deletePersona } = useApp();
    
    // 状态管理
    const [selectedPersonaId, setSelectedPersonaId] = useState<string | null>(null);
    const [isEditingNew, setIsEditingNew] = useState(false);

    // 编辑器表单状态
    const [editName, setEditName] = useState('');
    const [editDesc, setEditDesc] = useState('');
    const [editContent, setEditContent] = useState('');

    // 初始化加载
    useEffect(() => {
        if (isOpen) {
            // 尝试匹配当前激活的 globalPersona 是否在库中
            const matched = personaLibrary.find(p => p.content === globalPersona);
            if (matched) {
                handleSelectPersona(matched);
            } else {
                // 如果是自定义或未匹配的，默认选中第一个或清空
                if (personaLibrary.length > 0) {
                     handleSelectPersona(personaLibrary[0]);
                } else {
                     handleNewPersona();
                }
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // --- 逻辑处理 ---

    const handleSelectPersona = (p: PersonaTemplate) => {
        setSelectedPersonaId(p.id);
        setIsEditingNew(false);
        setEditName(p.name);
        setEditDesc(p.description);
        setEditContent(p.content);
    };

    const handleNewPersona = () => {
        setSelectedPersonaId(null);
        setIsEditingNew(true);
        setEditName('');
        setEditDesc('');
        setEditContent('');
    };

    const handleApply = () => {
        updateGlobalPersona(editContent);
        // 如果是新编辑的内容但还没保存到库，也可以应用，但最好提示用户
        alert(t('globalPersona.saveSuccess'));
        // onClose(); // 可选：应用后关闭或保持打开
    };

    const handleSaveToLib = () => {
        if (!editName.trim() || !editContent.trim()) return alert("Name and Content are required.");

        if (isEditingNew || !selectedPersonaId) {
            const newPersona: PersonaTemplate = {
                id: Date.now().toString(),
                name: editName,
                description: editDesc,
                content: editContent,
                isDefault: false
            };
            addPersona(newPersona);
            handleSelectPersona(newPersona);
        } else {
            // 更新现有
            updatePersona(selectedPersonaId, {
                name: editName,
                description: editDesc,
                content: editContent
            });
        }
    };

    const handleDelete = (id: string) => {
        if(confirm(t('promptLib.deleteConfirm'))) {
            deletePersona(id);
            if (selectedPersonaId === id) {
                 if(personaLibrary.length > 1) {
                     handleSelectPersona(personaLibrary.find(p => p.id !== id)!);
                 } else {
                     handleNewPersona();
                 }
            }
        }
    }

    // 判断当前编辑内容是否就是正在生效的全局身份
    const isActive = globalPersona === editContent;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex h-[80vh]">
                
                {/* 左侧：身份库列表 */}
                <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
                    <div className="p-4 border-b border-slate-200 bg-white flex justify-between items-center">
                        <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Library size={16} className="text-teal-600" />
                            {t('globalPersona.library')}
                        </h2>
                        <button 
                            onClick={handleNewPersona}
                            className="p-1.5 bg-slate-900 text-white rounded hover:bg-teal-600 transition-colors"
                            title={t('globalPersona.new')}
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {personaLibrary.map(p => {
                            const isCurrentActive = globalPersona === p.content;
                            return (
                                <div 
                                    key={p.id}
                                    onClick={() => handleSelectPersona(p)}
                                    className={`p-3 rounded-lg cursor-pointer flex justify-between items-start group transition-colors ${selectedPersonaId === p.id && !isEditingNew ? 'bg-white border border-teal-200 shadow-sm' : 'hover:bg-slate-200 border border-transparent'}`}
                                >
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-bold truncate ${selectedPersonaId === p.id ? 'text-teal-700' : 'text-slate-700'}`}>{p.name}</span>
                                            {isCurrentActive && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 rounded-full flex items-center gap-0.5"><CheckCircle2 size={10}/> {t('globalPersona.active')}</span>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 line-clamp-1">{p.description}</div>
                                    </div>
                                    {!p.isDefault && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                                            className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 右侧：编辑与详情 */}
                <div className="flex-1 flex flex-col bg-white">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center h-14 bg-white">
                        <div className="flex items-center gap-2">
                             <UserCog className="text-teal-600" size={20}/>
                             <h3 className="text-sm font-bold text-slate-800">
                                {isEditingNew || !selectedPersonaId ? t('globalPersona.new') : editName}
                             </h3>
                             {isActive && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-medium">{t('globalPersona.active')}</span>}
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Editor Fields */}
                    <div className="flex-1 p-6 overflow-y-auto space-y-6">
                        
                        {/* 顶部信息提示 */}
                        <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg text-xs text-slate-600 leading-relaxed">
                            {t('globalPersona.desc')}
                        </div>

                        {/* 名称与描述 */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('globalPersona.name')}</label>
                                <div className="flex items-center gap-2 border border-slate-200 rounded-lg p-2 focus-within:ring-2 focus-within:ring-teal-500">
                                    <PenLine size={16} className="text-slate-400" />
                                    <input 
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="flex-1 text-sm outline-none font-bold text-slate-800 placeholder:font-normal bg-transparent"
                                        placeholder="e.g. Strict Editor"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('globalPersona.description')}</label>
                                <input 
                                    value={editDesc}
                                    onChange={(e) => setEditDesc(e.target.value)}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                                    placeholder="Brief description..."
                                />
                            </div>
                        </div>

                        {/* System Instruction */}
                        <div className="flex-1 flex flex-col">
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('globalPersona.instruction')}</label>
                            <textarea 
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="w-full h-64 p-4 border border-slate-200 rounded-lg text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-slate-700 bg-slate-50 focus:bg-white transition-colors"
                                placeholder={t('globalPersona.placeholder')}
                            />
                        </div>

                    </div>

                    {/* Footer Actions */}
                    <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                        <div className="flex gap-2">
                             <button 
                                onClick={handleSaveToLib}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-100 hover:text-teal-600 flex items-center gap-2 transition-colors"
                            >
                                <Save size={16} /> {t('globalPersona.saveToLib')}
                            </button>
                        </div>
                        
                        <div className="flex gap-2">
                             <button 
                                onClick={onClose}
                                className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium text-sm"
                            >
                                {t('common.cancel')}
                            </button>
                            <button 
                                onClick={handleApply}
                                disabled={isActive}
                                className={`px-6 py-2 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${isActive ? 'bg-green-600 text-white cursor-default' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                            >
                                {isActive ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
                                {isActive ? t('globalPersona.active') : t('globalPersona.apply')}
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};