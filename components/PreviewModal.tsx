import React, { useState } from 'react';
import { X, Check, AlertTriangle, FileText, GitCompare } from 'lucide-react';
import { OutlineNode } from '../types';
import { MindMap } from './MindMap';

/**
 * 预览Modal组件
 * 用于在替换内容前显示新旧内容对比，让用户确认是否替换
 */

interface PreviewModalProps {
    type: 'map' | 'draft'; // 预览类型：思维导图或正文草稿
    title: string; // Modal标题
    oldContent: OutlineNode | string; // 原内容
    newContent: OutlineNode | string; // 新生成的内容
    isStreaming: boolean; // 是否正在流式生成
    onConfirm: () => void; // 确认替换回调
    onCancel: () => void; // 取消回调
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
    type,
    title,
    oldContent,
    newContent,
    isStreaming,
    onConfirm,
    onCancel
}) => {
    const [activeTab, setActiveTab] = useState<'old' | 'new'>('new');

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700 max-w-7xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700 bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <GitCompare className="text-purple-400" size={24} />
                        <div>
                            <h2 className="text-xl font-bold text-white">{title}</h2>
                            <p className="text-sm text-slate-400 mt-1">
                                {isStreaming ? '⏳ 正在生成中...' : '✅ 生成完成，请确认是否替换'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                        disabled={isStreaming}
                    >
                        <X className="text-slate-400" size={20} />
                    </button>
                </div>

                {/* Tab Switcher (Mobile) */}
                <div className="md:hidden flex border-b border-slate-700">
                    <button
                        onClick={() => setActiveTab('old')}
                        className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'old'
                            ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                            : 'text-slate-400 hover:bg-slate-800/50'
                            }`}
                    >
                        原内容
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-3 px-4 font-medium transition-colors ${activeTab === 'new'
                            ? 'bg-slate-800 text-white border-b-2 border-purple-500'
                            : 'text-slate-400 hover:bg-slate-800/50'
                            }`}
                    >
                        新内容 {isStreaming && <span className="ml-2 text-xs">⏳</span>}
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    {/* Desktop: Side-by-side */}
                    <div className="hidden md:grid md:grid-cols-2 h-full">
                        {/* Old Content */}
                        <div className="border-r border-slate-700 flex flex-col">
                            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-blue-400" />
                                    <h3 className="font-semibold text-white">原内容</h3>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-6">
                                {renderContent(type, oldContent)}
                            </div>
                        </div>

                        {/* New Content */}
                        <div className="flex flex-col">
                            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <FileText size={16} className="text-purple-400" />
                                    <h3 className="font-semibold text-white">新生成内容</h3>
                                    {isStreaming && (
                                        <span className="ml-auto text-xs text-purple-400 animate-pulse">
                                            生成中...
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto p-6">
                                {renderContent(type, newContent)}
                            </div>
                        </div>
                    </div>

                    {/* Mobile: Tabbed */}
                    <div className="md:hidden h-full overflow-auto p-6">
                        {activeTab === 'old' ? renderContent(type, oldContent) : renderContent(type, newContent)}
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700 bg-slate-900/50">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                        <AlertTriangle size={16} />
                        <span>替换后原内容将被覆盖，无法恢复</span>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            disabled={isStreaming}
                            className="px-6 py-2.5 rounded-lg font-medium bg-slate-700 hover:bg-slate-600 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            放弃
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isStreaming}
                            className="px-6 py-2.5 rounded-lg font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Check size={18} />
                            替换
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

/**
 * 渲染内容（根据类型）
 */
function renderContent(type: 'map' | 'draft', content: OutlineNode | string) {
    if (type === 'map') {
        // 思维导图预览
        const mapContent = content as OutlineNode;
        if (!mapContent || !mapContent.name) {
            return (
                <div className="text-slate-500 text-center py-12">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>暂无内容</p>
                </div>
            );
        }
        return <MindMap data={mapContent} onNodeClick={() => { }} />;
    } else {
        // 正文草稿预览
        const draftContent = content as string;
        if (!draftContent || !draftContent.trim()) {
            return (
                <div className="text-slate-500 text-center py-12">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>暂无内容</p>
                </div>
            );
        }
        return (
            <div className="prose prose-invert prose-slate max-w-none">
                <div className="whitespace-pre-wrap text-slate-300 leading-relaxed">
                    {draftContent}
                </div>
            </div>
        );
    }
}
