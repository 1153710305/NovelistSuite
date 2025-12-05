
import React, { useState, useEffect, useRef } from 'react';
import { Bot, Play, Square, Loader2, FileText, CheckCircle } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { generateNovelArchitecture, generateChapterContent, extractContextFromTree } from '../services/geminiServiceAdapter';
import { STORAGE_KEYS, addHistoryItem, updateHistoryItem } from '../services/storageService';
import { OutlineNode, StudioRecord } from '../types';

export const Workflow: React.FC = () => {
    const { t, lang } = useI18n();
    const { model, promptLibrary, globalPersona } = useApp(); // Get globalPersona

    // Config State
    const [idea, setIdea] = useState('');
    const [wordCount, setWordCount] = useState(2000);
    const [styleId, setStyleId] = useState('');

    // Execution State
    const [status, setStatus] = useState<'idle' | 'running' | 'paused' | 'complete'>('idle');
    const [logs, setLogs] = useState<string[]>([]);
    const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);

    const stopSignal = useRef(false);

    // Logging Helper
    const log = (msg: string) => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg}`, ...prev]);
    };

    // Safe Architecture Extraction
    const getChapterNodes = (root: OutlineNode): OutlineNode[] => {
        let chapters: OutlineNode[] = [];
        const traverse = (node: OutlineNode) => {
            if (node.type === 'chapter') chapters.push(node);
            if (node.children) node.children.forEach(traverse);
        };
        if (root.children) {
            // If the structure has volumes/acts, traverse them to find chapters
            root.children.forEach(traverse);
        }
        return chapters;
    };

    const startAutomation = async () => {
        if (!idea.trim()) return;

        setStatus('running');
        stopSignal.current = false;
        setLogs([]);
        log(t('workflow.logs.start'));

        try {
            // Step 1: Generate Architecture (Pass globalPersona)
            log(t('workflow.logs.generatingArch'));
            const arch = await generateNovelArchitecture(
                idea,
                lang,
                model,
                globalPersona,
                (stage, percent) => log(`${stage}: ${percent}%`)
            );

            if (stopSignal.current) throw new Error("Stopped by user");

            // Step 2: Create Record
            const title = idea.split('\n')[0].substring(0, 20);
            const newId = Date.now().toString();

            const newRecord: StudioRecord = {
                id: newId,
                timestamp: Date.now(),
                recordType: 'story',
                title: title,
                storyType: 'long',
                config: { type: 'long', wordCount: 0, styleId: styleId },
                content: "Auto-generated project",
                architecture: arch,
                chapters: [] // Start empty
            };

            addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, newRecord);
            setCurrentRecordId(newId);
            log(t('workflow.logs.archComplete').replace('{title}', title));

            // Step 3: Extract Context and Chapters
            const context = extractContextFromTree(arch.world) + extractContextFromTree(arch.character);
            // Look into 'chapters' map first, if empty, look into 'structure'
            let chapterNodes = getChapterNodes(arch.chapters);

            if (chapterNodes.length === 0) {
                log("No chapters found in architecture. Stopping.");
                setStatus('complete');
                return;
            }

            // Step 4: Loop Generation
            const stylePrompt = styleId ? promptLibrary.find(p => p.id === styleId)?.content : undefined;

            for (let i = 0; i < chapterNodes.length; i++) {
                if (stopSignal.current) {
                    log("Process paused/stopped.");
                    setStatus('paused');
                    break;
                }

                const node = chapterNodes[i];
                log(t('workflow.logs.generatingChap').replace('{title}', node.name));

                // Pass globalPersona
                const content = await generateChapterContent(node, context, lang, model, stylePrompt, wordCount, globalPersona);

                if (stopSignal.current) {
                    break;
                }

                // Update Record
                const newChapter = {
                    title: node.name,
                    content: content,
                    nodeId: node.id
                };

                // Fetch latest to ensure we append safely
                updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, newId, {
                    chapters: [...(newRecord.chapters || []), newChapter] // Note: this uses closure 'newRecord', in real world fetch latest.
                });

                // Push to local accumulator
                newRecord.chapters?.push(newChapter);

                log(t('workflow.logs.chapComplete').replace('{index}', (i + 1).toString()));

                // Small delay to be nice to API
                await new Promise(r => setTimeout(r, 1000));
            }

            if (!stopSignal.current) {
                setStatus('complete');
                log(t('workflow.logs.done'));
            }

        } catch (e: any) {
            log(`Error: ${e.message}`);
            setStatus('idle');
        }
    };

    const handleStop = () => {
        stopSignal.current = true;
        setStatus('paused');
    };

    return (
        <div className="flex h-full p-6 gap-6 bg-slate-100">

            {/* Left: Configuration */}
            <div className="w-1/3 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex items-center gap-2 mb-6 text-slate-800 text-lg font-bold">
                        <Bot className="text-teal-600" />
                        {t('workflow.config')}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t('workflow.idea')}</label>
                            <textarea
                                value={idea}
                                onChange={e => setIdea(e.target.value)}
                                className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32 resize-none focus:ring-2 focus:ring-teal-500 outline-none"
                                placeholder="Describe your novel idea..."
                                disabled={status === 'running'}
                            />
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t('workflow.style')}</label>
                            <select
                                value={styleId}
                                onChange={e => setStyleId(e.target.value)}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white"
                                disabled={status === 'running'}
                            >
                                <option value="">Default (Standard)</option>
                                {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">{t('workflow.wordCount')}</label>
                            <input
                                type="number"
                                value={wordCount}
                                onChange={e => setWordCount(Number(e.target.value))}
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                min={500}
                                step={500}
                                disabled={status === 'running'}
                            />
                        </div>

                        <div className="pt-4 flex gap-3">
                            {status === 'running' ? (
                                <button
                                    onClick={handleStop}
                                    className="flex-1 py-3 bg-red-50 text-red-600 rounded-lg font-bold hover:bg-red-100 flex items-center justify-center gap-2"
                                >
                                    <Square size={18} fill="currentColor" /> {t('workflow.stop')}
                                </button>
                            ) : (
                                <button
                                    onClick={startAutomation}
                                    disabled={!idea}
                                    className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    <Play size={18} /> {status === 'paused' ? 'Resume' : t('workflow.start')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex-1">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-4">Status</div>
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${status === 'idle' ? 'bg-slate-300' :
                                status === 'running' ? 'bg-teal-500 animate-pulse' :
                                    status === 'paused' ? 'bg-amber-500' : 'bg-green-500'
                            }`}></div>
                        <span className="font-bold text-slate-700 capitalize">{status}</span>
                    </div>
                    {status === 'running' && <Loader2 className="animate-spin text-teal-500 mt-4" size={24} />}
                    {status === 'complete' && <CheckCircle className="text-green-500 mt-4" size={24} />}
                </div>
            </div>

            {/* Right: Logs */}
            <div className="flex-1 bg-slate-900 rounded-xl p-6 flex flex-col shadow-inner overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-slate-400 font-mono text-sm border-b border-slate-800 pb-2">
                    <FileText size={16} />
                    {t('workflow.progress')}
                </div>
                <div className="flex-1 overflow-y-auto font-mono text-xs space-y-2">
                    {logs.length === 0 && <span className="text-slate-600 italic">Ready to start...</span>}
                    {logs.map((log, idx) => (
                        <div key={idx} className="text-green-400 border-l-2 border-slate-700 pl-2">
                            {log}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
