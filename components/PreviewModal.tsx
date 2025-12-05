import React, { useState } from 'react';
import { X, Check, AlertTriangle, FileText, GitCompare, Copy, Code } from 'lucide-react';
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
    rawResponse?: string; // 原始AI响应（JSON文本）
    isStreaming: boolean; // 是否正在流式生成
    onConfirm: () => void; // 确认替换回调
    onCancel: () => void; // 取消回调
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
    type,
    title,
    oldContent,
    newContent,
    rawResponse,
    isStreaming,
    onConfirm,
    onCancel
}) => {
    const [activeTab, setActiveTab] = useState<'old' | 'new' | 'raw'>('raw'); // 默认显示原始响应
    const [copySuccess, setCopySuccess] = useState(false);

    // 复制原始响应到剪贴板
    const handleCopyRaw = () => {
        if (rawResponse) {
            navigator.clipboard.writeText(rawResponse);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-2 animate-in fade-in duration-200">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-2xl border border-slate-700 w-full h-full max-w-[98vw] max-h-[98vh] flex flex-col overflow-hidden">{/* 扩大到98%视口 */}
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

                {/* 任务进度显示 */}
                {isStreaming && (
                    <div className="px-6 py-4 bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-b border-slate-700">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                            <span className="text-sm font-medium text-purple-300">AI正在生成思维导图...</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                )}

                {/* Tab Switcher */}
                <div className="flex border-b border-slate-700 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('raw')}
                        className={`flex-1 md:flex-none py-3 px-6 font-medium transition-colors whitespace-nowrap ${activeTab === 'raw'
                            ? 'bg-slate-800 text-white border-b-2 border-green-500'
                            : 'text-slate-400 hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-2 justify-center">
                            <Code size={16} />
                            <span>原始响应</span>
                            {isStreaming && <span className="text-xs">⏳</span>}
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('old')}
                        className={`flex-1 md:flex-none py-3 px-6 font-medium transition-colors whitespace-nowrap ${activeTab === 'old'
                            ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                            : 'text-slate-400 hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-2 justify-center">
                            <FileText size={16} />
                            <span>原内容</span>
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 md:flex-none py-3 px-6 font-medium transition-colors whitespace-nowrap ${activeTab === 'new'
                            ? 'bg-slate-800 text-white border-b-2 border-purple-500'
                            : 'text-slate-400 hover:bg-slate-800/50'
                            }`}
                    >
                        <div className="flex items-center gap-2 justify-center">
                            <GitCompare size={16} />
                            <span>新内容</span>
                        </div>
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden">
                    {/* 原始响应 */}
                    {activeTab === 'raw' && (
                        <div className="h-full flex flex-col">
                            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Code size={16} className="text-green-400" />
                                    <h3 className="font-semibold text-white">AI原始响应（JSON）</h3>
                                </div>
                                <button
                                    onClick={handleCopyRaw}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg transition-colors text-sm font-medium"
                                >
                                    <Copy size={14} />
                                    {copySuccess ? '已复制!' : '复制'}
                                </button>
                            </div>
                            <div className="flex-1 overflow-auto p-6 bg-slate-950/50">
                                <pre className="text-green-300 text-sm font-mono whitespace-pre-wrap break-words">
                                    {rawResponse || '暂无原始响应'}
                                </pre>
                            </div>
                        </div>
                    )}

                    {/* 原内容 */}
                    {activeTab === 'old' && (
                        <div className="h-full flex flex-col">
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
                    )}

                    {/* 新内容 */}
                    {activeTab === 'new' && (
                        <div className="h-full flex flex-col">
                            <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
                                <div className="flex items-center gap-2">
                                    <GitCompare size={16} className="text-purple-400" />
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
                    )}
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
