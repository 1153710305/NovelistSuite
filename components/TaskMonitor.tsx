import React, { useState, useEffect, useRef } from 'react';
import { Activity, X, ChevronDown, ChevronUp, Terminal, Clock, CheckCircle, AlertTriangle, Square, Cpu, Zap, Copy, Download, Database, UserCog, ArrowUpCircle, ArrowDownCircle, RotateCw, FileText, Play, Eye, FastForward, Columns, HelpCircle, Info, Code } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useI18n } from '../i18n';
import { BackgroundTask } from '../types';

export const TaskMonitor: React.FC = () => {
    const { activeTasks, dismissTask, cancelTask, retryTask, resumeTask, autoExecute, toggleAutoExecute } = useApp();
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);

    // Resize State
    const [size, setSize] = useState({ width: 450, height: 600 });
    const [isResizing, setIsResizing] = useState(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 0, height: 0 });

    // Track which tasks have debug info open
    const [openDebugIds, setOpenDebugIds] = useState<Set<string>>(new Set());
    // Track which tasks have comparison view open
    const [openComparisonIds, setOpenComparisonIds] = useState<Set<string>>(new Set());
    // Track which tasks have API Payload view open
    const [openApiIds, setOpenApiIds] = useState<Set<string>>(new Set());
    // Legend Modal State
    const [showLegend, setShowLegend] = useState(false);

    // Opacity Control
    const [opacity, setOpacity] = useState(1);

    // 移除自动展开逻辑 - 任务监控器默认隐藏,仅在用户手动点击时展开
    // useEffect(() => {
    //     if (activeTasks.some(t => t.status === 'running')) {
    //         setIsExpanded(true);
    //     }
    // }, [activeTasks.length]); 

    // Handle Resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            const deltaX = startPos.current.x - e.clientX;
            const deltaY = startPos.current.y - e.clientY;

            setSize({
                width: Math.max(350, Math.min(1000, startSize.current.width + deltaX)),
                height: Math.max(300, Math.min(900, startSize.current.height + deltaY))
            });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing]);

    const handleResizeStart = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
        startPos.current = { x: e.clientX, y: e.clientY };
        startSize.current = { width: size.width, height: size.height };
    };

    const toggleDebug = (taskId: string) => {
        setOpenDebugIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
    };

    const toggleComparison = (taskId: string) => {
        setOpenComparisonIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
    }

    const toggleApi = (taskId: string) => {
        setOpenApiIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(taskId)) newSet.delete(taskId);
            else newSet.add(taskId);
            return newSet;
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    const handleDownloadDebug = (task: BackgroundTask) => {
        if (!task.debugInfo) return;
        const debugPayload = {
            taskId: task.id,
            timestamp: new Date(task.startTime).toISOString(),
            type: task.type,
            status: task.status,
            logs: task.logs,
            metrics: task.metrics,
            debugInfo: task.debugInfo
        };

        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(debugPayload, null, 2));
        const filename = `debug_task_${task.id}_${task.type}.json`;
        const linkElement = document.createElement('a');
        linkElement.href = dataUri;
        linkElement.download = filename;
        linkElement.click();
    };

    const isHighDensityContext = (text: string) => {
        return text && (text.includes('[CMD]') || text.includes('[TASK]') || text.includes('[FACTS]'));
    }

    // Helper to render prompt with syntax highlighting for specific sections
    const renderColoredPrompt = (text: string) => {
        if (!text) return null;

        // Split by newlines but keep empty lines
        const lines = text.split('\n');
        const renderedLines = lines.map((line, i) => {
            if (!line.trim()) return <div key={i} className="h-2"></div>;

            if (line.startsWith('[COMMAND]:')) {
                return (
                    <div key={i} className="text-teal-300 border-b border-slate-700 pb-1 mb-1 font-bold">
                        {line}
                    </div>
                );
            }
            if (line.startsWith('[USER_INSTRUCTION]:')) {
                return (
                    <div key={i} className="text-blue-100 bg-blue-900/30 p-2 rounded border border-blue-500/30">
                        <span className="font-bold text-blue-400 block mb-1 text-[11px]">【额外补充】(User Instruction):</span>
                        <span className="whitespace-pre-wrap block">{line.substring(19) || '(无)'}</span>
                    </div>
                );
            }
            if (line.startsWith('[CONSTRAINTS]:')) {
                return (
                    <div key={i} className="text-red-100 bg-red-900/30 p-2 rounded border border-red-500/30">
                        <span className="font-bold text-red-400 block mb-1 text-[11px]">【硬性约束】(Mandatory Requirements):</span>
                        <span className="font-bold whitespace-pre-wrap block">{line.substring(14) || '(无)'}</span>
                    </div>
                );
            }
            if (line.startsWith('[STYLE]:')) {
                return (
                    <div key={i} className="text-purple-100 bg-purple-900/30 p-2 rounded border border-purple-500/30">
                        <span className="font-bold text-purple-400 block mb-1 text-[11px]">【文风预设】(Style Preset):</span>
                        <span className="whitespace-pre-wrap block">{line.substring(8) || '(无)'}</span>
                    </div>
                );
            }
            // Support for Chinese localized style tag from writeChapter
            // Fix: Enhanced pattern matching for style preset
            if (line.includes('【文风要求】')) {
                return (
                    <div key={i} className="text-purple-100 bg-purple-900/30 p-2 rounded border border-purple-500/30 mt-1 mb-1">
                        <span className="font-bold text-purple-400 block mb-1 text-[11px]">【文风预设】(Style Preset):</span>
                        <span className="whitespace-pre-wrap block">{line.replace(/.*【文风要求】[：:]?/, '') || '(无)'}</span>
                    </div>
                );
            }
            // Hide Context from prompt display if it accidentally leaked in
            if (line.includes('【全局上下文】') || line.includes('Context from Previous Chapter') || line.includes('Context Layer Hidden')) {
                return (
                    <div key={i} className="text-slate-600 italic border-l-2 border-slate-700 pl-2 mt-1">
                        [Context Hidden in Debug View]
                    </div>
                );
            }

            return <div key={i} className="text-green-300/80">{line}</div>;
        });

        return <div className="flex flex-col gap-1">{renderedLines}</div>;
    };

    if (activeTasks.length === 0) return null;

    const runningTasks = activeTasks.filter(t => t.status === 'running' || t.status === 'paused');
    const completedTasks = activeTasks.filter(t => t.status !== 'running' && t.status !== 'paused');
    const displayTasks = [...runningTasks, ...completedTasks.sort((a, b) => b.startTime - a.startTime)];

    const formatDuration = (task: BackgroundTask) => {
        const end = task.endTime || Date.now();
        const duration = Math.floor((end - task.startTime) / 1000);
        return `${duration}s`;
    };

    return (
        <div
            className={`fixed bottom-4 right-4 z-50 transition-all duration-300 flex flex-col items-end shadow-2xl rounded-xl bg-white border border-slate-200`}
            style={{
                width: isExpanded ? `${size.width}px` : 'auto',
                height: isExpanded ? `${size.height}px` : 'auto',
                opacity: opacity
            }}
        >
            {/* Resize Handle (Top-Left Corner) */}
            {isExpanded && (
                <div
                    className="absolute -top-2 -left-2 w-6 h-6 bg-slate-400 rounded-full cursor-nwse-resize z-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center shadow-md"
                    onMouseDown={handleResizeStart}
                >
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
            )}

            {/* Header / Toggle Button */}
            <div className="w-full flex-shrink-0">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`w-full flex items-center justify-between gap-2 px-4 py-3 bg-slate-900 text-white hover:bg-slate-800 transition-colors ${isExpanded ? 'rounded-t-xl' : 'rounded-xl'}`}
                >
                    <div className="flex items-center gap-2">
                        {runningTasks.length > 0 ? (
                            <Activity size={18} className="text-teal-400 animate-pulse" />
                        ) : (
                            <CheckCircle size={18} className="text-green-400" />
                        )}
                        <span className="font-bold text-sm">
                            {isExpanded ? t('taskMonitor.title') : `${runningTasks.length} ${t('taskMonitor.active')}`}
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 w-full overflow-hidden flex flex-col relative">
                    {/* Controls Bar */}
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50">
                        {/* Opacity Control */}
                        <div className="flex items-center gap-2 flex-1">
                            <Eye size={14} className="text-slate-400" />
                            <input
                                type="range"
                                min="0.2"
                                max="1"
                                step="0.1"
                                value={opacity}
                                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                                className="flex-1 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-500 max-w-[80px]"
                            />
                        </div>

                        {/* Auto-Execute Toggle */}
                        <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                            <input
                                type="checkbox"
                                id="auto-exec"
                                checked={autoExecute}
                                onChange={toggleAutoExecute}
                                className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 w-3.5 h-3.5"
                            />
                            <label htmlFor="auto-exec" className={`text-[10px] font-bold uppercase cursor-pointer flex items-center gap-1 ${autoExecute ? 'text-teal-600' : 'text-slate-400'}`}>
                                <FastForward size={12} /> Auto-Run
                            </label>
                        </div>
                    </div>

                    {/* Drag overlay to prevent iframe stealing events if any */}
                    {isResizing && <div className="absolute inset-0 z-50 cursor-nwse-resize"></div>}

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 relative">
                        {displayTasks.map(task => (
                            <div key={task.id} className={`bg-slate-50 border border-slate-100 rounded-lg p-3 relative group ${task.status === 'paused' ? 'ring-2 ring-yellow-400' : ''}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${task.status === 'running' ? 'bg-teal-500 animate-pulse' :
                                                    task.status === 'paused' ? 'bg-yellow-500' :
                                                        task.status === 'completed' ? 'bg-green-500' :
                                                            task.status === 'cancelled' ? 'bg-slate-400' : 'bg-red-500'
                                                }`}></span>
                                            <span className="font-bold text-sm text-slate-800">
                                                {task.labelKey ? t(`taskMonitor.labels.${task.labelKey}`) : task.type}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Clock size={10} /> {formatDuration(task)} • {task.status === 'running' ? task.currentStage : task.status === 'paused' ? 'Paused (Waiting)' : t(`taskMonitor.status.${task.status}`)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        {/* Resume Button for Paused Tasks */}
                                        {task.status === 'paused' && (
                                            <button
                                                onClick={() => resumeTask(task.id)}
                                                className="p-1.5 bg-green-500 text-white rounded hover:bg-green-600 mr-2 flex items-center gap-1 px-2 shadow-sm animate-pulse"
                                                title="Resume Task"
                                            >
                                                <Play size={14} fill="currentColor" /> <span className="text-xs font-bold">Run</span>
                                            </button>
                                        )}

                                        {/* Debug Toggle */}
                                        {task.debugInfo && (
                                            <button
                                                onClick={() => toggleDebug(task.id)}
                                                className={`p-1 rounded hover:bg-slate-200 transition-colors ${openDebugIds.has(task.id) ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}
                                                title={t('taskMonitor.debug.title')}
                                            >
                                                <Terminal size={14} />
                                            </button>
                                        )}

                                        {/* Comparison Toggle */}
                                        {task.debugInfo?.comparison && (
                                            <button
                                                onClick={() => toggleComparison(task.id)}
                                                className={`p-1 rounded hover:bg-slate-200 transition-colors ${openComparisonIds.has(task.id) ? 'text-purple-600 bg-purple-50' : 'text-slate-400'}`}
                                                title={t('taskMonitor.debug.comparison')}
                                            >
                                                <Columns size={14} />
                                            </button>
                                        )}

                                        {/* API Payload Toggle */}
                                        {task.debugInfo?.apiPayload && (
                                            <button
                                                onClick={() => toggleApi(task.id)}
                                                className={`p-1 rounded hover:bg-slate-200 transition-colors ${openApiIds.has(task.id) ? 'text-orange-600 bg-orange-50' : 'text-slate-400'}`}
                                                title={t('taskMonitor.debug.api')}
                                            >
                                                <Code size={14} />
                                            </button>
                                        )}

                                        {(task.status === 'running' || task.status === 'paused') && (
                                            <button
                                                onClick={() => cancelTask(task.id)}
                                                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
                                                title={t('common.cancel')}
                                            >
                                                <Square size={14} fill="currentColor" />
                                            </button>
                                        )}

                                        {/* Retry Button */}
                                        {task.status === 'error' && (
                                            <button
                                                onClick={() => retryTask(task.id)}
                                                className="p-1 text-slate-400 hover:text-teal-600 rounded hover:bg-teal-50"
                                                title={t('common.retry') || "Retry"}
                                            >
                                                <RotateCw size={14} />
                                            </button>
                                        )}

                                        {task.status !== 'running' && task.status !== 'paused' && (
                                            <button onClick={() => dismissTask(task.id)} className="text-slate-300 hover:text-slate-500" title="Dismiss">
                                                <X size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Metrics Dashboard */}
                                {task.metrics && (
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded mb-3 border border-slate-200 text-[10px]">
                                        <div className="col-span-2 flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                                            <span className="text-slate-500 font-bold flex items-center gap-1">
                                                <Cpu size={10} /> {task.metrics.model.split('-').slice(-1)[0]}
                                            </span>
                                            <span className="text-slate-500 font-mono">{(task.metrics.latency / 1000).toFixed(2)}s</span>
                                        </div>

                                        <div className="flex items-center gap-2 text-indigo-600 font-medium bg-white p-1 rounded border border-indigo-100">
                                            <ArrowUpCircle size={12} className="text-indigo-400" />
                                            <span>In: {task.metrics.inputTokens.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-teal-600 font-medium bg-white p-1 rounded border border-teal-100">
                                            <ArrowDownCircle size={12} className="text-teal-400" />
                                            <span>Out: {task.metrics.outputTokens.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Error Display */}
                                {task.status === 'error' && (
                                    <div className="bg-red-50 border border-red-100 rounded p-3 mb-3 text-xs text-red-800">
                                        <div className="font-bold flex items-center gap-1 mb-1 text-red-600">
                                            <AlertTriangle size={12} /> Error Details
                                        </div>
                                        <div className="bg-white p-2 rounded border border-red-100 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[10px]">
                                            {task.logs.slice().reverse().find(l => l.message.startsWith('Error:'))?.message.replace('Error: ', '') || 'Unknown error occurred.'}
                                        </div>
                                    </div>
                                )}

                                {/* Comparison View */}
                                {openComparisonIds.has(task.id) && task.debugInfo?.comparison && (
                                    <div className="bg-slate-800 rounded p-3 mb-3 text-xs text-slate-300 space-y-4 font-mono border border-slate-700 shadow-inner animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2">
                                            <Columns size={14} className="text-purple-400" />
                                            <span className="font-bold text-purple-400">{t('taskMonitor.debug.comparison')}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* Original Column */}
                                            <div className="border-r border-slate-700 pr-3">
                                                <h5 className="text-[10px] font-bold text-slate-500 mb-1 uppercase">{t('taskMonitor.debug.original')}</h5>
                                                <div className="space-y-3">
                                                    {task.debugInfo.comparison.originalContext && (
                                                        <div>
                                                            <div className="text-[9px] text-slate-500 mb-0.5">Context ({task.debugInfo.comparison.originalContext.length})</div>
                                                            <div className="bg-slate-900/50 p-1.5 rounded max-h-40 overflow-y-auto text-red-200/80 text-[9px] leading-relaxed break-all border border-red-900/20">
                                                                {task.debugInfo.comparison.originalContext}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {task.debugInfo.comparison.originalPrompt && (
                                                        <div>
                                                            <div className="text-[9px] text-slate-500 mb-0.5">Prompt ({task.debugInfo.comparison.originalPrompt.length})</div>
                                                            <div className="bg-slate-900/50 p-1.5 rounded max-h-40 overflow-y-auto text-red-200/80 text-[9px] leading-relaxed break-all border border-red-900/20">
                                                                {task.debugInfo.comparison.originalPrompt}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Optimized Column */}
                                            <div>
                                                <h5 className="text-[10px] font-bold text-teal-500 mb-1 uppercase">{t('taskMonitor.debug.optimized')}</h5>
                                                <div className="space-y-3">
                                                    {task.debugInfo.comparison.optimizedContext && (
                                                        <div>
                                                            <div className="text-[9px] text-teal-600/70 mb-0.5">Context ({task.debugInfo.comparison.optimizedContext.length})</div>
                                                            <div className="bg-teal-900/10 p-1.5 rounded max-h-40 overflow-y-auto text-teal-100 text-[9px] leading-relaxed break-all border border-teal-500/20">
                                                                {task.debugInfo.comparison.optimizedContext}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {task.debugInfo.comparison.optimizedPrompt && (
                                                        <div>
                                                            <div className="text-[9px] text-teal-600/70 mb-0.5">Prompt ({task.debugInfo.comparison.optimizedPrompt.length})</div>
                                                            <div className="bg-teal-900/10 p-1.5 rounded max-h-40 overflow-y-auto text-teal-100 text-[9px] leading-relaxed break-all border border-teal-500/20">
                                                                {task.debugInfo.comparison.optimizedPrompt}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* API Payload View */}
                                {openApiIds.has(task.id) && task.debugInfo?.apiPayload && (
                                    <div className="bg-slate-800 rounded p-3 mb-3 text-xs text-slate-300 space-y-4 font-mono border border-slate-700 shadow-inner animate-in fade-in duration-200">
                                        <div className="flex items-center gap-2 border-b border-slate-700 pb-2 mb-2">
                                            <Code size={14} className="text-orange-400" />
                                            <span className="font-bold text-orange-400">{t('taskMonitor.debug.api')}</span>
                                            <span className="text-[9px] text-slate-500 ml-2">{t('taskMonitor.debug.apiDesc')}</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="border-r border-slate-700 pr-3">
                                                <div className="flex justify-between items-center mb-1">
                                                    <h5 className="text-[10px] font-bold text-slate-500 uppercase">{t('taskMonitor.debug.request')}</h5>
                                                    <button onClick={() => copyToClipboard(task.debugInfo?.apiPayload?.request || '')} className="text-slate-500 hover:text-orange-400" title="Copy">
                                                        <Copy size={10} />
                                                    </button>
                                                </div>
                                                <div className="bg-slate-900/50 p-1.5 rounded max-h-60 overflow-y-auto text-slate-300 text-[9px] leading-relaxed break-all border border-slate-700">
                                                    {task.debugInfo.apiPayload.request}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <h5 className="text-[10px] font-bold text-teal-500 uppercase">{t('taskMonitor.debug.response')}</h5>
                                                    <button onClick={() => copyToClipboard(task.debugInfo?.apiPayload?.response || '')} className="text-slate-500 hover:text-teal-400" title="Copy">
                                                        <Copy size={10} />
                                                    </button>
                                                </div>
                                                <div className="bg-slate-900/50 p-1.5 rounded max-h-60 overflow-y-auto text-teal-100 text-[9px] leading-relaxed break-all border border-slate-700">
                                                    {task.debugInfo.apiPayload.response}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Debug Info Panel */}
                                {openDebugIds.has(task.id) && task.debugInfo && (
                                    <div className="bg-slate-800 rounded p-3 mb-3 text-xs text-slate-300 space-y-4 font-mono border border-slate-700 shadow-inner relative">

                                        {/* Legend Popup (Absolute) */}
                                        {showLegend && (
                                            <div className="absolute top-10 right-4 w-64 bg-slate-900 border border-slate-700 p-4 rounded-lg shadow-xl z-50 text-xs text-slate-300 space-y-3 animate-in fade-in duration-200">
                                                <h4 className="font-bold text-white border-b border-slate-700 pb-2 mb-2 flex items-center gap-2">
                                                    <Info size={14} className="text-teal-400" />
                                                    {t('taskMonitor.legend.title')}
                                                </h4>
                                                <div>
                                                    <div className="text-slate-400 font-bold mb-1">{t('taskMonitor.legend.systemTitle')}</div>
                                                    <div className="text-[10px] text-slate-500 leading-snug">{t('taskMonitor.legend.systemDesc')}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 font-bold mb-1">{t('taskMonitor.legend.contextTitle')}</div>
                                                    <div className="text-[10px] text-slate-500 leading-snug">{t('taskMonitor.legend.contextDesc')}</div>
                                                </div>
                                                <div>
                                                    <div className="text-slate-400 font-bold mb-1">{t('taskMonitor.legend.promptTitle')}</div>
                                                    <div className="text-[10px] text-slate-500 leading-snug">{t('taskMonitor.legend.promptDesc')}</div>
                                                </div>
                                                <div className="mt-2 text-[10px] text-orange-300/80 italic bg-slate-800 p-2 rounded border border-orange-900/30">
                                                    {t('taskMonitor.legend.formatNote')}
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                                            <div className="flex items-center gap-2">
                                                <Terminal size={12} className="text-teal-400" />
                                                <span className="font-bold text-teal-400">{t('taskMonitor.debug.title')}</span>
                                                <button onClick={() => setShowLegend(!showLegend)} className="text-slate-500 hover:text-white transition-colors" title={t('taskMonitor.debug.legendHelp')}>
                                                    <HelpCircle size={12} className={showLegend ? "text-white" : ""} />
                                                </button>
                                            </div>
                                            <button onClick={() => handleDownloadDebug(task)} className="text-slate-400 hover:text-white flex items-center gap-1">
                                                <Download size={12} /> JSON
                                            </button>
                                        </div>

                                        {/* System Instruction */}
                                        {task.debugInfo.systemInstruction && (
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                                                        <UserCog size={10} /> {t('taskMonitor.debug.system')} ({task.debugInfo.systemInstruction.length} chars):
                                                    </div>
                                                    <button onClick={() => copyToClipboard(task.debugInfo?.systemInstruction || '')} className="text-slate-500 hover:text-teal-400" title="Copy">
                                                        <Copy size={10} />
                                                    </button>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap text-blue-300 text-[10px] leading-relaxed border border-slate-800">
                                                    {task.debugInfo.systemInstruction}
                                                </div>
                                            </div>
                                        )}

                                        {/* Source Data */}
                                        {task.debugInfo.sourceData && Array.isArray(task.debugInfo.sourceData) && (
                                            <div>
                                                <div className="flex items-center gap-2 text-slate-500 font-bold mb-1">
                                                    <Database size={10} /> Source Data ({task.debugInfo.sourceData.length}):
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded max-h-32 overflow-y-auto border border-slate-800">
                                                    <table className="w-full text-left text-[10px] text-slate-400">
                                                        <thead>
                                                            <tr className="border-b border-slate-700 text-slate-500">
                                                                <th className="pb-1">Platform</th>
                                                                <th className="pb-1">Title</th>
                                                                <th className="pb-1 text-right">Heat</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {task.debugInfo.sourceData.map((item: any, idx: number) => (
                                                                <tr key={idx} className="border-b border-slate-800 last:border-0 hover:bg-slate-800/50">
                                                                    <td className="py-1 text-teal-500">{item.platform}</td>
                                                                    <td className="py-1 text-slate-300">{item.title}</td>
                                                                    <td className="py-1 text-right font-mono text-orange-400">{item.hot}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}

                                        {/* Context */}
                                        {task.debugInfo.context && !task.debugInfo.sourceData && (
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                                                        <FileText size={10} /> {t('taskMonitor.debug.context')} ({task.debugInfo.context.length} chars):
                                                    </div>
                                                    <button onClick={() => copyToClipboard(task.debugInfo?.context || '')} className="text-slate-500 hover:text-teal-400" title="Copy">
                                                        <Copy size={10} />
                                                    </button>
                                                </div>

                                                {/* High Density Badge */}
                                                {isHighDensityContext(task.debugInfo.context) && (
                                                    <div className="mb-2 text-[9px] text-amber-300 bg-amber-900/30 p-1.5 rounded border border-amber-800/50 flex items-center gap-1">
                                                        <Zap size={10} className="text-amber-400" />
                                                        {t('taskMonitor.debug.compressed_note')}
                                                    </div>
                                                )}

                                                <div className="bg-slate-900 p-2 rounded max-h-60 overflow-y-auto whitespace-pre-wrap text-slate-400 text-[10px] leading-relaxed border border-slate-800">
                                                    {task.debugInfo.context}
                                                </div>
                                            </div>
                                        )}

                                        {/* Prompt */}
                                        {task.debugInfo.prompt && (
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                                                        <span className="text-slate-500 font-bold">{t('taskMonitor.debug.prompt')} ({task.debugInfo.prompt.length} chars):</span>
                                                    </div>
                                                    <button onClick={() => copyToClipboard(task.debugInfo?.prompt || '')} className="text-slate-500 hover:text-teal-400" title="Copy">
                                                        <Copy size={10} />
                                                    </button>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded max-h-60 overflow-y-auto whitespace-pre-wrap text-[10px] leading-relaxed border border-slate-800">
                                                    {renderColoredPrompt(task.debugInfo.prompt)}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
                                    <div
                                        className={`h-full transition-all duration-300 ${task.status === 'error' ? 'bg-red-500' :
                                                task.status === 'cancelled' ? 'bg-slate-400' :
                                                    task.status === 'paused' ? 'bg-yellow-500' :
                                                        task.status === 'completed' ? 'bg-green-500' : 'bg-teal-500'
                                            }`}
                                        style={{ width: `${task.progress}%` }}
                                    ></div>
                                </div>

                                {/* Logs Console */}
                                <div className="bg-slate-900 rounded p-2 max-h-24 overflow-y-auto">
                                    {task.logs.slice().reverse().map((log, idx) => (
                                        <div key={idx} className="text-[10px] font-mono text-slate-300 flex gap-2 mb-1 last:mb-0">
                                            <span className="text-slate-500 flex-shrink-0">
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                            </span>
                                            <span className={idx === 0 && (task.status === 'running' || task.status === 'paused') ? 'text-teal-300 font-bold' : ''}>
                                                {log.message}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {displayTasks.length === 0 && (
                            <div className="text-center text-slate-400 py-4 italic text-sm">
                                {t('taskMonitor.noTasks')}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};