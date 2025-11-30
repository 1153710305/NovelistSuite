
import React, { useState, useEffect, useRef } from 'react';
import { Activity, X, ChevronDown, ChevronUp, Terminal, Clock, CheckCircle, AlertTriangle, Square, Cpu, Zap, GripHorizontal, Copy, Download, Database, UserCog, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { useI18n } from '../i18n';
import { BackgroundTask } from '../types';

export const TaskMonitor: React.FC = () => {
    const { activeTasks, dismissTask, cancelTask } = useApp();
    const { t } = useI18n();
    const [isExpanded, setIsExpanded] = useState(false);
    
    // Resize State
    const [size, setSize] = useState({ width: 450, height: 600 }); // Default: slightly wider
    const [isResizing, setIsResizing] = useState(false);
    const startPos = useRef({ x: 0, y: 0 });
    const startSize = useRef({ width: 0, height: 0 });

    // Track which tasks have debug info open
    const [openDebugIds, setOpenDebugIds] = useState<Set<string>>(new Set());

    // Auto-expand when a new task starts running
    useEffect(() => {
        if (activeTasks.some(t => t.status === 'running')) {
            setIsExpanded(true);
        }
    }, [activeTasks.length]); 

    // Handle Resize
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing) return;
            // Since anchored bottom-right: 
            // Dragging Left (negative delta X) -> Increases Width
            // Dragging Up (negative delta Y) -> Increases Height
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
        
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify(debugPayload, null, 2));
        const filename = `debug_task_${task.id}_${task.type}.json`;
        const linkElement = document.createElement('a');
        linkElement.href = dataUri;
        linkElement.download = filename;
        linkElement.click();
    };

    if (activeTasks.length === 0) return null;

    const runningTasks = activeTasks.filter(t => t.status === 'running');
    const completedTasks = activeTasks.filter(t => t.status !== 'running');
    const displayTasks = [...runningTasks, ...completedTasks.sort((a,b) => b.startTime - a.startTime)];

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
                height: isExpanded ? `${size.height}px` : 'auto'
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
                            <Activity size={18} className="text-teal-400 animate-pulse"/>
                        ) : (
                            <CheckCircle size={18} className="text-green-400"/>
                        )}
                        <span className="font-bold text-sm">
                            {isExpanded ? t('taskMonitor.title') : `${runningTasks.length} ${t('taskMonitor.active')}`}
                        </span>
                    </div>
                    {isExpanded ? <ChevronDown size={16}/> : <ChevronUp size={16}/>}
                </button>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="flex-1 w-full overflow-hidden flex flex-col relative">
                     {/* Drag overlay to prevent iframe stealing events if any */}
                     {isResizing && <div className="absolute inset-0 z-50 cursor-nwse-resize"></div>}
                     
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {displayTasks.map(task => (
                            <div key={task.id} className="bg-slate-50 border border-slate-100 rounded-lg p-3 relative group">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${
                                                task.status === 'running' ? 'bg-teal-500 animate-pulse' :
                                                task.status === 'completed' ? 'bg-green-500' : 
                                                task.status === 'cancelled' ? 'bg-slate-400' : 'bg-red-500'
                                            }`}></span>
                                            <span className="font-bold text-sm text-slate-800">
                                                {task.labelKey ? t(`taskMonitor.labels.${task.labelKey}`) : task.type}
                                            </span>
                                        </div>
                                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                            <Clock size={10}/> {formatDuration(task)} • {task.status === 'running' ? task.currentStage : t(`taskMonitor.status.${task.status}`)}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-1">
                                        {/* Debug Toggle */}
                                        {task.debugInfo && (
                                            <button 
                                                onClick={() => toggleDebug(task.id)}
                                                className={`p-1 rounded hover:bg-slate-200 transition-colors ${openDebugIds.has(task.id) ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}
                                                title={t('taskMonitor.debug.title')}
                                            >
                                                <Terminal size={14}/>
                                            </button>
                                        )}

                                        {task.status === 'running' && (
                                            <button 
                                                onClick={() => cancelTask(task.id)} 
                                                className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-red-50"
                                                title={t('common.cancel')}
                                            >
                                                <Square size={14} fill="currentColor"/>
                                            </button>
                                        )}
                                        {task.status !== 'running' && (
                                            <button onClick={() => dismissTask(task.id)} className="text-slate-300 hover:text-slate-500">
                                                <X size={14}/>
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Metrics Dashboard (New: Split Input/Output) */}
                                {task.metrics && (
                                    <div className="grid grid-cols-2 gap-2 bg-slate-100 p-2 rounded mb-3 border border-slate-200 text-[10px]">
                                        <div className="col-span-2 flex justify-between items-center border-b border-slate-200 pb-1 mb-1">
                                            <span className="text-slate-500 font-bold flex items-center gap-1">
                                                <Cpu size={10} /> {task.metrics.model.split('-').slice(-1)[0]}
                                            </span>
                                            <span className="text-slate-500 font-mono">{(task.metrics.latency / 1000).toFixed(2)}s</span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2 text-indigo-600 font-medium bg-white p-1 rounded border border-indigo-100">
                                            <ArrowUpCircle size={12} className="text-indigo-400"/> 
                                            <span>In: {task.metrics.inputTokens.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-teal-600 font-medium bg-white p-1 rounded border border-teal-100">
                                            <ArrowDownCircle size={12} className="text-teal-400"/> 
                                            <span>Out: {task.metrics.outputTokens.toLocaleString()}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Error Display (New) */}
                                {task.status === 'error' && (
                                    <div className="bg-red-50 border border-red-100 rounded p-3 mb-3 text-xs text-red-800">
                                        <div className="font-bold flex items-center gap-1 mb-1 text-red-600">
                                            <AlertTriangle size={12}/> Error Details
                                        </div>
                                        <div className="bg-white p-2 rounded border border-red-100 max-h-24 overflow-y-auto whitespace-pre-wrap font-mono text-[10px]">
                                            {task.logs.slice().reverse().find(l => l.message.startsWith('Error:'))?.message.replace('Error: ', '') || 'Unknown error occurred.'}
                                        </div>
                                    </div>
                                )}

                                {/* Debug Info Panel */}
                                {openDebugIds.has(task.id) && task.debugInfo && (
                                    <div className="bg-slate-800 rounded p-3 mb-3 text-xs text-slate-300 space-y-3 font-mono border border-slate-700 shadow-inner">
                                        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <Terminal size={12} className="text-teal-400"/> 
                                                <span className="font-bold text-teal-400">{t('taskMonitor.debug.title')}</span>
                                            </div>
                                            <button onClick={() => handleDownloadDebug(task)} className="text-slate-400 hover:text-white flex items-center gap-1">
                                                <Download size={12} /> JSON
                                            </button>
                                        </div>
                                        
                                        {/* System Instruction */}
                                        {task.debugInfo.systemInstruction && (
                                            <div>
                                                <div className="flex items-center gap-2 text-slate-500 font-bold mb-1">
                                                    <UserCog size={10} /> System Persona:
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap text-blue-300 text-[10px] leading-relaxed border border-slate-800">
                                                    {task.debugInfo.systemInstruction}
                                                </div>
                                            </div>
                                        )}

                                        {/* Source Data (Mock Crawler Results) */}
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
                                                <div className="text-slate-500 font-bold mb-1">{t('taskMonitor.debug.context')}:</div>
                                                <div className="bg-slate-900 p-2 rounded max-h-24 overflow-y-auto whitespace-pre-wrap text-slate-400 text-[10px] leading-relaxed border border-slate-800">
                                                    {task.debugInfo.context}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {/* Prompt */}
                                        {task.debugInfo.prompt && (
                                            <div>
                                                <div className="flex justify-between items-center mb-1">
                                                     <span className="text-slate-500 font-bold">{t('taskMonitor.debug.prompt')}:</span>
                                                     <button onClick={() => copyToClipboard(task.debugInfo?.prompt || '')} className="text-slate-500 hover:text-teal-400" title="Copy">
                                                         <Copy size={10}/>
                                                     </button>
                                                </div>
                                                <div className="bg-slate-900 p-2 rounded max-h-32 overflow-y-auto whitespace-pre-wrap text-green-300 text-[10px] leading-relaxed border border-slate-800">
                                                    {task.debugInfo.prompt}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Progress Bar */}
                                <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
                                    <div 
                                        className={`h-full transition-all duration-300 ${
                                            task.status === 'error' ? 'bg-red-500' : 
                                            task.status === 'cancelled' ? 'bg-slate-400' :
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
                                                {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                                            </span>
                                            <span className={idx === 0 && task.status === 'running' ? 'text-teal-300 font-bold' : ''}>
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
