
/**
 * @file pages/Studio.tsx
 * @description 写作工作室 (Studio) 的核心页面组件。
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
    Sparkles, RefreshCw, Loader2, ChevronDown, ChevronUp, BookOpen, Tag, Globe, Network, Wrench, RefreshCcw, CheckSquare, Square, Zap as ZapIcon, AlertTriangle, Hash, FileText, History, Trash2, PenLine, Wand2, Settings2, Link as LinkIcon, ArrowRightCircle, Flame, Target, Anchor, Eraser, GitBranch
} from 'lucide-react';

import {
    manipulateText, rewriteChapterWithContext, extractContextFromTree, analyzeTrendKeywords, generateChapterContent, generateImage, generateIllustrationPrompt, generateNovelArchitecture, generateStoryFromIdea, regenerateSingleMap, generateDailyStories, optimizeContextWithAI, retrieveRelevantContext, expandNodeContent
} from '../services/geminiServiceAdapter';

import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import {
    saveToStorage, loadFromStorage, STORAGE_KEYS, getHistory, deleteHistoryItem, updateHistoryItem, addHistoryItem
} from '../services/storageService';

import {
    StudioRecord, AVAILABLE_SOURCES, GenerationConfig, OutlineNode, ArchitectureMap, ContextConfig, EmbeddingModel
} from '../types';

import { MindMap } from '../components/MindMap';
import { StudioSidebar } from '../components/studio/StudioSidebar';
import { StudioEditor } from '../components/studio/StudioEditor';
import { StudioFileList } from '../components/studio/StudioFileList';
import { DataManagerModal } from '../components/DataManagerModal';
import { PromptLibraryModal } from '../components/PromptLibraryModal';
import { InspirationRules, PromptService } from '../services/promptService';

declare global { interface Window { JSZip: any; } }

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    return isMobile;
};

const serializeMapToText = (node: OutlineNode, depth: number = 0): string => {
    const indent = "  ".repeat(depth);
    let text = `${indent}- [${node.type}] ${node.name}`;
    if (node.description) text += `: ${node.description}`;
    text += "\n";
    if (node.children) {
        node.children.forEach(child => {
            text += serializeMapToText(child, depth + 1);
        });
    }
    return text;
};

const serializeMapToTextLean = (node: OutlineNode, depth: number = 0): string => {
    if (depth > 2) return "";
    const indent = "  ".repeat(depth);
    let text = `${indent}- [${node.type}] ${node.name}`;
    if (node.description) {
        const desc = node.description.length > 60 ? node.description.substring(0, 60) + "..." : node.description;
        text += `: ${desc}`;
    }
    text += "\n";
    if (node.children) {
        const children = node.children.slice(0, 8);
        children.forEach(child => {
            text += serializeMapToTextLean(child, depth + 1);
        });
        if (node.children.length > 8) {
            text += `${indent}  ... (${node.children.length - 8} more items)\n`;
        }
    }
    return text;
};

const getPastContextNodes = (root: OutlineNode, currentId: string): OutlineNode[] => {
    const flattened: OutlineNode[] = [];
    const traverse = (n: OutlineNode) => {
        const { children, ...rest } = n;
        flattened.push(rest as OutlineNode);
        if (n.children) {
            n.children.forEach(traverse);
        }
    };
    traverse(root);
    const idx = flattened.findIndex(n => n.id === currentId);
    if (idx === -1) return flattened;
    return flattened.slice(0, idx + 1);
};

// 辅助函数：构建核心元数据上下文块
const buildCoreMetadataContext = (record: StudioRecord): string => {
    let ctx = "[CORE_METADATA / 核心档案]\n";
    ctx += `书名: ${record.title || '未命名'}\n`;
    if (record.metadata) {
        const m = record.metadata;
        ctx += `分类: ${m.majorCategory || '无'}\n`;
        ctx += `题材/标签: ${m.theme || '无'}\n`;
        ctx += `核心梗 (Trope): ${m.trope || '无'}\n`;
        ctx += `金手指 (Cheat): ${m.goldenFinger || '无'}\n`;
        ctx += `爽点 (Cool Point): ${m.coolPoint || '无'}\n`;
        ctx += `爆点 (Burst Point): ${m.burstPoint || '无'}\n`;
        ctx += `记忆锚点: ${m.memoryAnchor || '无'}\n`;
    }
    if (record.architecture && record.architecture.synopsis) {
        ctx += `简介: ${record.architecture.synopsis}\n`;
    }
    return ctx + "\n";
};

export const Studio: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'daily' | 'tools'>('daily');
    const [mainViewMode, setMainViewMode] = useState<'quick-tools' | 'story-map' | 'story-files' | 'story-editor'>('quick-tools');

    const { model, studioState, setStudioState, startBackgroundTask, updateTaskProgress, promptLibrary, activeTasks, globalPersona, pauseTask, enableCache } = useApp();
    const { t, lang, getToolLabel, getProcessLabel } = useI18n();
    const isMobile = useIsMobile();

    const [history, setHistory] = useState<StudioRecord[]>([]);
    const [selectedSources, setSelectedSources] = useState<string[]>(['fanqie']);
    const [targetAudience, setTargetAudience] = useState<string>('male');
    const [showSourceSelector, setShowSourceSelector] = useState(false);

    const [showInspirationConfig, setShowInspirationConfig] = useState(false);
    const [inspirationRules, setInspirationRules] = useState<InspirationRules>({
        title: '具有强烈的网文风格，吸睛，包含核心梗或金手指。',
        synopsis: '必须是“新媒体爆款文案”风格。前三句必须抛出冲突、悬念或金手指。',
        coolPoint: '明确指出读者的情绪价值来源（如：人前显圣、极致反差）。',
        burstPoint: '核心冲突的高潮点或反转点。'
    });

    const [editorText, setEditorText] = useState('');
    const [toolMode, setToolMode] = useState<'continue' | 'rewrite' | 'polish'>('continue');
    const [toolLoading, setToolLoading] = useState(false);

    const [showDataManager, setShowDataManager] = useState(false);
    const [showPromptLib, setShowPromptLib] = useState(false);

    const [draftWordCount, setDraftWordCount] = useState<number>(4000);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [selectedIdea, setSelectedIdea] = useState<string>('');

    const [config, setConfig] = useState<GenerationConfig>({ type: 'long', wordCount: 2000, chapterCount: 10, wordsPerChapter: 3000, styleId: '' });

    const [showRegenModal, setShowRegenModal] = useState(false);
    const [regenIdea, setRegenIdea] = useState('');
    const [regenContextMapKeys, setRegenContextMapKeys] = useState<string[]>([]);
    // 新增：用于跟踪哪些 Context 开启了 AI 清洗
    const [regenOptimizeMapKeys, setRegenOptimizeMapKeys] = useState<string[]>([]);

    const [regenPromptId, setRegenPromptId] = useState('');
    const [regenStyleContent, setRegenStyleContent] = useState('');
    const [regenRequirements, setRegenRequirements] = useState('');

    const [showContextWarning, setShowContextWarning] = useState(false);
    const [contextWarningData, setContextWarningData] = useState<{ original: number, truncated: number, preview: string, fullContext: string }>({ original: 0, truncated: 0, preview: '', fullContext: '' });

    // 扩展节点相关状态
    const [showExpandModal, setShowExpandModal] = useState(false);
    const [expandingNode, setExpandingNode] = useState<OutlineNode | null>(null);
    const [expandIdea, setExpandIdea] = useState('');
    const [expandRequirements, setExpandRequirements] = useState('');
    const [expandPromptId, setExpandPromptId] = useState('');
    const [expandStyleContent, setExpandStyleContent] = useState('');
    const [expandContextMapKeys, setExpandContextMapKeys] = useState<string[]>([]);
    const [expandOptimizeMapKeys, setExpandOptimizeMapKeys] = useState<string[]>([]);
    const [isExpandingNode, setIsExpandingNode] = useState(false);
    const [pendingContextAction, setPendingContextAction] = useState<((truncatedContext: string) => void) | null>(null);

    const [showNewChapModal, setShowNewChapModal] = useState(false);
    const [newChapTitle, setNewChapTitle] = useState('');
    const [activeStoryRecord, setActiveStoryRecord] = useState<StudioRecord | null>(null);
    const [expandedStoryId, setExpandedStoryId] = useState<string>('');
    const [modifyingRecordId, setModifyingRecordId] = useState<string | null>(null);

    const [currentChapterIndex, setCurrentChapterIndex] = useState<number | null>(null);

    const [selectedMapType, setSelectedMapType] = useState<Exclude<keyof ArchitectureMap, 'synopsis'>>('world');
    const [selectedMapNode, setSelectedMapNode] = useState<OutlineNode | null>(null);

    // Computed states for loading indicators based on activeTasks
    const isGeneratingDaily = activeTasks.some(t => t.type === 'inspiration' && t.status === 'running');
    const isRegeneratingMap = activeTasks.some(t => t.type === 'map_regen' && t.status === 'running');
    const isAnalyzingTrend = activeTasks.some(t => t.labelKey === 'analyzeTrend' && t.status === 'running');

    const [isRewriting, setIsRewriting] = useState(false);
    const [isGeneratingChapter, setIsGeneratingChapter] = useState(false);
    const [isGeneratingIllu, setIsGeneratingIllu] = useState(false);

    const [editNodeName, setEditNodeName] = useState('');
    const [editNodeDesc, setEditNodeDesc] = useState('');

    const [manualDraftTitle, setManualDraftTitle] = useState('');
    const [selectedPromptId, setSelectedPromptId] = useState<string>('');
    const [customPromptContent, setCustomPromptContent] = useState('');

    const [contextConfig, setContextConfig] = useState<ContextConfig>({
        includePrevChapter: true,
        selectedMaps: [],
        limitMode: 'auto',
        manualLimit: 25000,
        previousChapterId: undefined,
        nextChapterId: undefined,
        enableRAG: false,
        ragThreshold: 0.25, // Default 0.25
        embeddingModel: EmbeddingModel.LOCAL_MINILM, // Default to LOCAL_MINILM
        prevContextLength: 1000 // Default previous context length
    });
    const [showContextConfig, setShowContextConfig] = useState(false);
    const [enableContextOptimization, setEnableContextOptimization] = useState(false);

    // 定义所有可用的导图类型
    const coreMaps = ['world', 'character', 'system', 'anchor', 'mission'];
    const plotMaps = ['structure', 'events', 'chapters'];
    const allMaps = [...coreMaps, ...plotMaps];

    const loadHistory = () => setTimeout(() => setHistory(getHistory<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO)), 100);

    useEffect(() => {
        const savedData = loadFromStorage(STORAGE_KEYS.STUDIO);
        if (savedData && savedData.editorText) setEditorText(savedData.editorText);
        loadHistory();
    }, []);

    // Sync state with activeTasks to handle cancellations correctly
    useEffect(() => {
        // Check if drafting task is running
        const isDrafting = activeTasks.some(t => t.type === 'draft' && (t.status === 'running' || t.status === 'paused'));
        if (!isDrafting && isGeneratingChapter) {
            setIsGeneratingChapter(false);
        }

        const lastInspTask = activeTasks.find(t => t.type === 'inspiration' && t.status === 'completed');
        if (lastInspTask && lastInspTask.result) {
            setStudioState(prev => ({ ...prev, generatedContent: lastInspTask.result }));
            loadHistory();
        }
        if (activeTasks.some(t => t.type === 'story' && t.status === 'completed')) loadHistory();
    }, [activeTasks]);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            const currentSaved = loadFromStorage(STORAGE_KEYS.STUDIO) || {};
            saveToStorage(STORAGE_KEYS.STUDIO, { ...currentSaved, editorText });
        }, 1000);
        return () => clearTimeout(timeoutId);
    }, [editorText]);

    useEffect(() => {
        if (selectedMapNode) {
            setEditNodeName(selectedMapNode.name);
            setEditNodeDesc(selectedMapNode.description || '');
            setManualDraftTitle(selectedMapNode.name);
        }
    }, [selectedMapNode]);

    // Robust recursive search for all chapters
    const allChapterNodes = useMemo(() => {
        const nodes: OutlineNode[] = [];
        // Use activeStoryRecord?.architecture?.chapters as the root for finding chapters
        const root = activeStoryRecord?.architecture?.chapters;

        if (root) {
            const traverse = (n: OutlineNode) => {
                if (n.type === 'chapter' || n.type === 'scene') {
                    nodes.push(n);
                }
                if (n.children) n.children.forEach(traverse);
            };
            traverse(root);
        }
        return nodes;
    }, [activeStoryRecord, activeStoryRecord?.architecture]);

    const isFirstChapter = useMemo(() => {
        if (!selectedMapNode || allChapterNodes.length === 0) return false;
        return allChapterNodes[0].id === selectedMapNode.id;
    }, [selectedMapNode, allChapterNodes]);

    // 计算有效的上一章 ID (处理 Auto Detect 逻辑)
    // 返回值可能是 NodeID，也可能是 ChapterID 的引用字符串
    const effectivePreviousId = useMemo(() => {
        // 1. 如果用户手动指定了 ID，直接使用
        if (contextConfig.previousChapterId) return contextConfig.previousChapterId;

        // 2. 如果是自动模式 (undefined/null/empty)，则计算前一个节点
        if (selectedMapNode && allChapterNodes.length > 0) {
            const idx = allChapterNodes.findIndex(n => n.id === selectedMapNode.id);
            if (idx > 0) {
                return allChapterNodes[idx - 1].id;
            }
        }
        return undefined;
    }, [contextConfig.previousChapterId, selectedMapNode, allChapterNodes]);

    // 解析并获取上一章的实际内容和标题
    const resolvePreviousContext = (targetId: string | undefined): { content: string, title: string, type: 'chapter' | 'outline' } | null => {
        if (!targetId) return null;

        // 1. Explicit Chapter Reference (prefix 'chapter:')
        if (targetId.startsWith('chapter:')) {
            const ref = targetId.split(':')[1];
            const chapter = activeStoryRecord?.chapters?.find((c, i) => c.id === ref || i.toString() === ref);
            if (chapter) return { content: chapter.content, title: chapter.title, type: 'chapter' };
        }

        // 2. Explicit Node Reference (prefix 'node:')
        if (targetId.startsWith('node:')) {
            const nodeId = targetId.split(':')[1];
            // Try to find chapter with this nodeId first (Generated Content)
            const chapter = activeStoryRecord?.chapters?.find(c => c.nodeId === nodeId);
            if (chapter && chapter.content) return { content: chapter.content, title: chapter.title, type: 'chapter' };

            // Fallback to outline description
            const node = allChapterNodes.find(n => n.id === nodeId);
            if (node) return { content: node.description || '', title: node.name, type: 'outline' };
        }

        // 3. Fallback / Raw ID (Auto-detect logic usually returns raw node ID)
        const chapter = activeStoryRecord?.chapters?.find(c => c.nodeId === targetId);
        if (chapter && chapter.content) return { content: chapter.content, title: chapter.title, type: 'chapter' };

        const node = allChapterNodes.find(n => n.id === targetId);
        if (node) return { content: node.description || '', title: node.name, type: 'outline' };

        return null;
    };

    // 获取当前解析后的上一章上下文对象
    const resolvedPrevContext = useMemo(() => resolvePreviousContext(effectivePreviousId), [effectivePreviousId, activeStoryRecord, allChapterNodes]);

    useEffect(() => {
        if (selectedMapNode && allChapterNodes.length > 0) {
            const idx = allChapterNodes.findIndex(n => n.id === selectedMapNode.id);
            if (idx !== -1) {
                const next = idx < allChapterNodes.length - 1 ? allChapterNodes[idx + 1].id : undefined;
                setContextConfig(prevConfig => ({
                    ...prevConfig,
                    previousChapterId: undefined, // Reset to auto to prevent stale context
                    nextChapterId: next,
                    // Fix: Default to true unless it's the very first chapter (idx 0), but avoid persisting a false state if switching back
                    includePrevChapter: idx !== 0
                }));
            }
        }
    }, [selectedMapNode, allChapterNodes]);

    const handlePromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        setSelectedPromptId(pid);
        const p = promptLibrary.find(item => item.id === pid);
        if (p) {
            setCustomPromptContent(p.content);
        }
    };

    const handleOpenInspirationConfig = () => {
        setShowInspirationConfig(true);
    };

    const handleDailyGen = async () => {
        setShowInspirationConfig(false);
        await startBackgroundTask('inspiration', 'genInspiration', async (taskId) => {
            updateTaskProgress(taskId, t('process.init'), 5, t('process.building_prompt'));
            const result = await generateDailyStories(
                studioState.trendFocus, selectedSources, targetAudience, lang, model, globalPersona,
                inspirationRules,
                (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo)
            );
            addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, {
                id: Date.now().toString(), timestamp: Date.now(), recordType: 'inspiration',
                trendFocus: studioState.trendFocus || '通用', content: result, sources: selectedSources,
                metadata: { source: '', gender: targetAudience, majorCategory: '', trope: '' }
            });
            return result;
        });
    };

    const handleAnalyzeTrend = async () => {
        if (selectedSources.length === 0) return;
        await startBackgroundTask('inspiration', 'analyzeTrend', async (taskId) => {
            updateTaskProgress(taskId, t('process.analyzingTrend'), 20, `来源: ${selectedSources.join(',')}`);
            const trend = await analyzeTrendKeywords(selectedSources, targetAudience, lang, model, globalPersona, (debugInfo) => {
                // 如果 debugInfo 包含 metrics,传递给 updateTaskProgress
                const metrics = debugInfo.metrics;
                updateTaskProgress(taskId, t('process.analyzingTrend'), 50, undefined, metrics, debugInfo);
            });

            // 优化显示：提取纯净的关键词
            let displayTrend = trend.trim();

            // 1. 去除常见的描述性前缀
            const prefixPatterns = [
                /^根据.*?[，,：:]/,
                /^搜索.*?[，,：:]/,
                /^分析.*?[，,：:]/,
                /^推荐.*?[，,：:]/,
                /^一些.*?[，,：:]/,
                /^当前.*?[，,：:]/,
                /^热门.*?[，,：:]/
            ];

            for (const pattern of prefixPatterns) {
                displayTrend = displayTrend.replace(pattern, '');
            }

            // 2. 按行分割,取第一个非空行
            const lines = displayTrend.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);
            if (lines.length > 0) {
                displayTrend = lines[0];
            }

            // 3. 去除序号 (1. 2. 一、等)
            displayTrend = displayTrend.replace(/^[\d一二三四五]+[、.．。)\)]\s*/, '');

            // 4. 去除markdown格式 (**, __, 等)
            displayTrend = displayTrend.replace(/[*_`]/g, '');

            // 5. 去除引号
            displayTrend = displayTrend.replace(/["「」『』""'']/g, '');

            // 6. 提取冒号前的内容(如果有冒号,通常冒号前是关键词)
            if (displayTrend.includes('：') || displayTrend.includes(':')) {
                const parts = displayTrend.split(/[：:]/);
                if (parts[0].length >= 2 && parts[0].length <= 10) {
                    displayTrend = parts[0];
                }
            }

            // 7. 如果还是太长,尝试提取前面的短语
            if (displayTrend.length > 20) {
                // 尝试按标点分割
                const segments = displayTrend.split(/[，,。.！!？?、]/);
                if (segments.length > 0 && segments[0].length >= 2 && segments[0].length <= 10) {
                    displayTrend = segments[0];
                } else {
                    // 如果还是太长,直接截取前10个字符
                    displayTrend = displayTrend.substring(0, 10);
                }
            }

            // 8. 最终清理:去除首尾空格和特殊字符
            displayTrend = displayTrend.trim().replace(/^[^\u4e00-\u9fa5a-zA-Z]+|[^\u4e00-\u9fa5a-zA-Z]+$/g, '');

            // 9. 如果提取失败,使用默认值
            if (!displayTrend || displayTrend.length < 2) {
                displayTrend = '玄幻';
            }

            setStudioState(prev => ({ ...prev, trendFocus: displayTrend }));
            return trend;
        });
    }

    const handleInputChange = (val: string) => setStudioState(prev => ({ ...prev, trendFocus: val }));
    const toggleSourceSelection = (source: string) => setSelectedSources(prev => prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source]);

    const handleHistoryClick = (record: StudioRecord) => {
        if (record.recordType === 'inspiration') {
            setStudioState(prev => ({ ...prev, trendFocus: record.trendFocus || '', generatedContent: record.content }));
        } else {
            toggleStoryExpand(record);
        }
    };

    const checkContextSize = (context: string, action: (finalContext: string) => void) => {
        const WARNING_THRESHOLD = 30000;
        if (context.length > WARNING_THRESHOLD) {
            const truncated = context.substring(0, WARNING_THRESHOLD);
            setContextWarningData({ original: context.length, truncated: WARNING_THRESHOLD, preview: context.substring(WARNING_THRESHOLD, WARNING_THRESHOLD + 200) + "...", fullContext: context });
            setPendingContextAction(() => action);
            setShowContextWarning(true);
        } else action(context);
    };

    const handleExportJson = () => {
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(history, null, 2));
        const linkElement = document.createElement('a');
        linkElement.href = dataUri;
        linkElement.download = `inkflow_studio_history_${new Date().toISOString().slice(0, 10)}.json`;
        linkElement.click();
    };

    const handleExportItemJson = (item: StudioRecord) => {
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(item, null, 2));
        const linkElement = document.createElement('a');
        linkElement.href = dataUri;
        linkElement.download = `${item.title || 'inkflow_item'}.json`;
        linkElement.click();
    }

    const handleExportZip = async (item: StudioRecord) => {
        if (!window.JSZip) return alert("ZIP 库未加载");
        const zip = new window.JSZip();
        const safeTitle = (item.title || 'novel').replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_');
        const mapsFolder = zip.folder("思维导图");
        if (item.architecture) {
            Object.keys(item.architecture).forEach(key => {
                const tree = (item.architecture as any)[key] as OutlineNode;
                if (tree) {
                    let md = `# ${tree.name}\n${tree.description}\n`;
                    mapsFolder?.file(`${key}.md`, md);
                }
            });
        }
        const chaptersFolder = zip.folder("正文稿件");
        if (item.chapters && item.chapters.length > 0) {
            item.chapters.forEach((chap, idx) => {
                chaptersFolder?.file(`${String(idx + 1).padStart(2, '0')}_${chap.title}.txt`, chap.content || "");
            });
        }
        try {
            const content = await zip.generateAsync({ type: "blob" });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `${safeTitle}_backup.zip`;
            link.click();
        } catch (e) { alert("ZIP 导出失败"); }
    };

    const handleImportHistory = (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileReader = new FileReader();
        if (e.target.files && e.target.files.length > 0) {
            fileReader.readAsText(e.target.files[0], "UTF-8");
            fileReader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target?.result as string);
                    if (Array.isArray(importedData)) {
                        const updatedHistory = [...importedData, ...history];
                        saveToStorage(STORAGE_KEYS.HISTORY_STUDIO, updatedHistory);
                        setHistory(updatedHistory);
                        alert("导入成功");
                    }
                } catch (error) { alert("导入失败，格式错误"); }
            };
        }
    };

    const handleDeleteHistory = (id: string) => {
        const updated = deleteHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, id);
        setHistory(updated);
        if (activeStoryRecord?.id === id) { setActiveStoryRecord(null); setMainViewMode('quick-tools'); }
    };

    const openNewChapModal = (recordId: string) => {
        setModifyingRecordId(recordId);
        const existingCount = history.find(h => h.id === recordId)?.chapters?.length || 0;
        setNewChapTitle(`第 ${existingCount + 1} 章`);
        setShowNewChapModal(true);
    };

    const handleManualAddChapter = () => {
        if (!modifyingRecordId || !newChapTitle) return;
        const record = history.find(h => h.id === modifyingRecordId);
        if (!record) return;
        // Inject ID for stable referencing
        const newChapter = { id: Date.now().toString(), title: newChapTitle, content: '', nodeId: undefined };
        const updatedRecord = { ...record, chapters: [...(record.chapters || []), newChapter] };
        updateHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, record.id, updatedRecord);
        setHistory(prev => prev.map(item => item.id === record.id ? updatedRecord : item));
        if (activeStoryRecord?.id === record.id) setActiveStoryRecord(updatedRecord);
        setShowNewChapModal(false); setModifyingRecordId(null);
    };

    const handleOpenRegenModal = () => {
        if (!activeStoryRecord) return;
        setRegenIdea("");
        setRegenContextMapKeys([]);
        setRegenOptimizeMapKeys([]); // Reset optimization selections
        setRegenPromptId('');
        setRegenStyleContent('');
        setRegenRequirements('');
        setShowRegenModal(true);
    }

    const handleRegenerateMap = async () => {
        if (!activeStoryRecord || !selectedMapType) return;
        setShowRegenModal(false);

        // 1. Prepare Metadata Context (Always kept, never scrubbed)
        const coreMetadata = buildCoreMetadataContext(activeStoryRecord);

        // 2. Prepare Map Context (Split into Raw and To-Optimize buckets)
        let mapContextRaw = "";
        let mapContextToOptimize = "";
        let mapToOptimizeKeys: string[] = []; // for logging

        if (regenContextMapKeys.length > 0) {
            regenContextMapKeys.forEach(key => {
                if (key === selectedMapType) return; // Skip self reference

                const val = activeStoryRecord.architecture ? (activeStoryRecord.architecture as any)[key] : null;
                if (val && typeof val !== 'string') {
                    const mapRoot = val as OutlineNode;
                    const contentChunk = `\n>>> 导图: ${t('studio.maps.' + key)} <<<\n` + serializeMapToText(mapRoot);

                    if (regenOptimizeMapKeys.includes(key)) {
                        mapContextToOptimize += contentChunk;
                        mapToOptimizeKeys.push(key);
                    } else {
                        mapContextRaw += contentChunk;
                    }
                }
            });
        }

        // Context size check logic (applies to total size)
        const totalSize = coreMetadata.length + mapContextRaw.length + mapContextToOptimize.length;
        const WARNING_THRESHOLD = 30000;

        const proceedWithRegen = async () => {
            await startBackgroundTask('map_regen', 'regenMap', async (taskId) => {
                updateTaskProgress(taskId, t('process.init'), 5, t('process.init'));

                // Variable to hold the result of optimization
                let finalOptimizedContext = "";
                let originalMapContext = mapContextToOptimize; // For debug comparison

                // 1. 构建 Prompt
                const actualTaskPayload = `[COMMAND]: 重绘导图 - ${selectedMapType}\n[USER_INSTRUCTION]: ${regenIdea}\n[CONSTRAINTS]: ${regenRequirements}\n[STYLE]: ${regenStyleContent}`;

                // 2. Execute Optimization if needed
                if (mapContextToOptimize.length > 100) { // Only optimize if substantial content
                    updateTaskProgress(taskId, t('process.optimizing'), 15, t('process.scrubbing') + ` (${mapToOptimizeKeys.join(', ')})`, undefined, {
                        systemInstruction: globalPersona,
                        context: mapContextToOptimize, // Show what is being sent to scrubber
                        prompt: "Context Scrubbing Task"
                    });

                    // Call Optimization API
                    finalOptimizedContext = await optimizeContextWithAI(mapContextToOptimize, lang, enableCache);

                    // Calculate compression ratio
                    const ratio = ((1 - finalOptimizedContext.length / (originalMapContext.length || 1)) * 100).toFixed(1);
                    const logMsg = t('process.opt_success').replace('{ratio}', ratio);

                    updateTaskProgress(taskId, t('process.optimizing'), 30, logMsg, undefined, {
                        comparison: {
                            originalContext: originalMapContext, // Show original chunk
                            optimizedContext: finalOptimizedContext // Show cleaned chunk
                        }
                    });
                } else {
                    // If too small or empty, just use raw
                    finalOptimizedContext = mapContextToOptimize;
                }

                // 3. Combine Metadata + Raw Context + Optimized Context
                const finalContext = coreMetadata + mapContextRaw + finalOptimizedContext;

                await pauseTask(taskId);

                updateTaskProgress(taskId, t('process.regen_map'), 40, t('process.calling_api'), undefined, {
                    // Update debug info to show the FINAL merged context used for generation
                    // We merge everything here for the display
                    context: finalContext,
                    prompt: actualTaskPayload
                });

                const newRoot = await regenerateSingleMap(
                    selectedMapType,
                    regenIdea,
                    finalContext,
                    lang, model, regenStyleContent,
                    globalPersona,
                    (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo),
                    regenRequirements
                );
                const newArchitecture = { ...activeStoryRecord.architecture, [selectedMapType]: newRoot };
                const updatedRecord = { ...activeStoryRecord, architecture: newArchitecture };
                setActiveStoryRecord(updatedRecord);
                updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { architecture: newArchitecture });
                setHistory(prev => prev.map(item => item.id === activeStoryRecord.id ? updatedRecord : item));
                return t('process.done');
            });
        };

        if (totalSize > WARNING_THRESHOLD) {
            setContextWarningData({
                original: totalSize,
                truncated: WARNING_THRESHOLD,
                preview: (mapContextRaw + mapContextToOptimize).substring(0, 200) + "...",
                fullContext: "Context check bypassed for background task logic separation" // Not actually used here
            });
            // For simplicity in this complex flow, just warn and let user confirm action, 
            // the actual truncation logic inside generate functions is separate. 
            // Here we just warn about total payload size.
            setPendingContextAction(() => proceedWithRegen());
            setShowContextWarning(true);
        } else {
            proceedWithRegen();
        }
    };

    const toggleStoryExpand = (record: StudioRecord) => {
        if (expandedStoryId === record.id) setExpandedStoryId('');
        else { setExpandedStoryId(record.id); setActiveStoryRecord(record); setMainViewMode('story-files'); }
    };

    const handleOpenChapter = (record: StudioRecord, index: number) => {
        setActiveStoryRecord(record);
        setCurrentChapterIndex(index);
        setMainViewMode('story-editor');
    };

    const handleDeleteChapter = (e: React.MouseEvent, record: StudioRecord, index: number) => {
        e.stopPropagation();
        if (!confirm("确定删除此章节？")) return;
        const newChapters = [...(record.chapters || [])];
        newChapters.splice(index, 1);
        const updatedRecord = { ...record, chapters: newChapters };
        updateHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, record.id, updatedRecord);
        setHistory(prev => prev.map(item => item.id === record.id ? updatedRecord : item));
        if (activeStoryRecord?.id === record.id) setActiveStoryRecord(updatedRecord);
    };

    const handleResetMap = () => {
        if (!activeStoryRecord || !selectedMapType || !confirm("确定清空当前导图？")) return;
        const updatedArch = { ...activeStoryRecord.architecture } as any;
        updatedArch[selectedMapType] = undefined;
        const updatedRecord = { ...activeStoryRecord, architecture: updatedArch };
        updateHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, updatedRecord);
        setHistory(prev => prev.map(item => item.id === activeStoryRecord.id ? updatedRecord : item));
        setActiveStoryRecord(updatedRecord);
        setSelectedMapNode(null);
    };

    const updateNodeInTree = (root: OutlineNode, targetId: string, updates: Partial<OutlineNode>): OutlineNode => {
        if (root.id === targetId) return { ...root, ...updates };
        if (root.children) return { ...root, children: root.children.map(child => updateNodeInTree(child, targetId, updates)) };
        return root;
    }

    const handleSaveNodeEdit = () => {
        if (!activeStoryRecord || !activeStoryRecord.architecture || !selectedMapNode?.id) return;
        const currentTree = activeStoryRecord.architecture[selectedMapType];
        const newTree = updateNodeInTree(currentTree, selectedMapNode.id, { name: editNodeName, description: editNodeDesc });
        const newArchitecture = { ...activeStoryRecord.architecture, [selectedMapType]: newTree };
        const updatedRecord = { ...activeStoryRecord, architecture: newArchitecture };
        setActiveStoryRecord(updatedRecord);
        updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { architecture: newArchitecture });
        setSelectedMapNode({ ...selectedMapNode, name: editNodeName, description: editNodeDesc });
    }

    // 打开扩展节点模态框
    const handleOpenExpandModal = () => {
        if (!selectedMapNode) return;
        setExpandingNode(selectedMapNode);
        setExpandIdea(`基于 "${selectedMapNode.name}" 扩展更多子节点`);
        setExpandRequirements('');
        setExpandStyleContent('');
        setExpandPromptId('');
        setExpandContextMapKeys([]);
        setExpandOptimizeMapKeys([]);
        setShowExpandModal(true);
    };

    // 执行节点扩展
    const handleExpandNode = async () => {
        if (!expandingNode || !activeStoryRecord) return;

        setIsExpandingNode(true);

        try {
            await startBackgroundTask('expand_node', 'expandNode', async (taskId) => {
                updateTaskProgress(taskId, '准备扩展', 5, '正在准备扩展节点...');

                // 构建上下文 (类似重新生成)
                const coreMetadata = buildCoreMetadataContext(activeStoryRecord);

                // 收集选中的上下文
                let contextText = '';
                for (const mapKey of expandContextMapKeys) {
                    const mapData = activeStoryRecord.architecture?.[mapKey];
                    if (mapData) {
                        contextText += `\\n[${mapKey.toUpperCase()}]:\\n${serializeMapToText(mapData)}\\n`;
                    }
                }

                // 如果需要优化上下文
                let optimizedContext = contextText;
                if (expandOptimizeMapKeys.length > 0) {
                    updateTaskProgress(taskId, '优化上下文', 15, '正在清洗上下文...');
                    const toOptimize = expandOptimizeMapKeys.map(key => {
                        const mapData = activeStoryRecord.architecture?.[key];
                        return mapData ? serializeMapToText(mapData) : '';
                    }).join('\\n');
                    optimizedContext = await optimizeContextWithAI(toOptimize, lang, enableCache);
                }

                const finalContext = coreMetadata + contextText + optimizedContext;

                await pauseTask(taskId);

                updateTaskProgress(taskId, '生成子节点', 40, '正在为节点生成子内容...');

                // 调用 AI 生成子节点
                const newChildren = await regenerateSingleMap(
                    selectedMapType,
                    `扩展节点: ${expandingNode.name}\\n${expandIdea}`,
                    finalContext,
                    lang,
                    model,
                    expandStyleContent,
                    globalPersona,
                    (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo),
                    expandRequirements
                );

                // 合并新生成的子节点到原节点
                if (newChildren && newChildren.children) {
                    const mergedNode = {
                        ...expandingNode,
                        children: [...(expandingNode.children || []), ...newChildren.children]
                    };

                    // 更新树结构
                    const currentTree = activeStoryRecord.architecture[selectedMapType];
                    const newTree = updateNodeInTree(currentTree, expandingNode.id!, mergedNode);
                    const newArchitecture = { ...activeStoryRecord.architecture, [selectedMapType]: newTree };
                    const updatedRecord = { ...activeStoryRecord, architecture: newArchitecture };

                    setActiveStoryRecord(updatedRecord);
                    updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { architecture: newArchitecture });

                    updateTaskProgress(taskId, '完成', 100, `成功为 "${expandingNode.name}" 添加了 ${newChildren.children.length} 个子节点`);
                    setShowExpandModal(false);
                    setExpandingNode(null);
                } else {
                    throw new Error('生成结果为空');
                }
            });
        } catch (error: any) {
            console.error('[ExpandNode] Error:', error);
        } finally {
            setIsExpandingNode(false);
        }
    };

    const assembleSmartContext = (isLean: boolean): { context: string } => {
        if (!activeStoryRecord?.architecture) return { context: '' };

        let contextStr = buildCoreMetadataContext(activeStoryRecord); // 1. 强制加入核心元数据

        contextConfig.selectedMaps.forEach(key => {
            const mapRoot = (activeStoryRecord.architecture as any)[key];
            if (mapRoot && typeof mapRoot !== 'string') {
                contextStr += `\n>>> 设定参考: ${t('studio.maps.' + key)} <<<\n`;
                contextStr += isLean ? serializeMapToTextLean(mapRoot) : serializeMapToText(mapRoot);
            }
        });

        return { context: contextStr };
    };

    const handleGenerateNodeContent = async () => {
        if (!activeStoryRecord || !selectedMapNode || !selectedMapNode.id) return;
        setIsGeneratingChapter(true);

        await startBackgroundTask('draft', 'drafting', async (taskId) => {
            updateTaskProgress(taskId, t('process.init'), 5, t('process.init'));
            let context = "";

            // RAG Logic
            if ((contextConfig.enableRAG || enableContextOptimization) && activeStoryRecord.architecture) {
                updateTaskProgress(taskId, t('process.rag_retrieving'), 10, t('process.rag_retrieving'));
                const globalMaps = ['world', 'system', 'character', 'anchor'];
                const timelineMaps = ['chapters', 'events', 'structure', 'mission'];
                const searchTargets: OutlineNode[] = [];

                const mapsToSearch = contextConfig.enableRAG ? allMaps : contextConfig.selectedMaps;

                mapsToSearch.forEach(key => {
                    const mapRoot = (activeStoryRecord.architecture as any)[key];
                    if (mapRoot && typeof mapRoot !== 'string') {
                        if (timelineMaps.includes(key)) {
                            const safeNodes = getPastContextNodes(mapRoot, selectedMapNode.id || '');
                            searchTargets.push(...safeNodes);
                        } else {
                            searchTargets.push(mapRoot);
                        }
                    }
                });

                if (searchTargets.length > 0) {
                    const query = `${selectedMapNode.name} ${selectedMapNode.description || ''}`;
                    // Use threshold from config or default to 0.25
                    const threshold = contextConfig.ragThreshold ?? 0.25;

                    const ragResult = await retrieveRelevantContext(
                        query,
                        searchTargets,
                        15,
                        (msg) => {
                            // Localize progress messages
                            let displayMsg = msg;
                            if (msg.includes('Vectorizing')) displayMsg = t('process.vectorizing').replace('{progress}', msg.split(':')[1] || '');
                            else if (msg.includes('Indexing')) displayMsg = t('process.rag_indexing');

                            updateTaskProgress(taskId, t('process.rag_indexing'), 15, displayMsg);
                        },
                        threshold,
                        contextConfig.embeddingModel // Pass selected embedding model
                    );
                    // 强制将元数据拼接到 RAG 结果前
                    context = buildCoreMetadataContext(activeStoryRecord) + ragResult.context;
                } else {
                    // Fallback if RAG finds nothing
                    context = buildCoreMetadataContext(activeStoryRecord);
                }
            } else {
                // Standard Logic
                const standardData = assembleSmartContext(false);
                context = standardData.context;
            }

            updateTaskProgress(taskId, t('process.analyzing_dep'), 15, t('process.analyzing_dep'));
            let prevContent: string | undefined = undefined;

            // Logic updated to respect both includePrevChapter flag AND explicit manual selection
            // If previousChapterId is set manually, we should always try to resolve it
            const shouldIncludePrev = contextConfig.includePrevChapter || !!contextConfig.previousChapterId;

            if (shouldIncludePrev && resolvedPrevContext) {
                if (resolvedPrevContext.content) {
                    // Apply truncation
                    const length = contextConfig.prevContextLength || 1000;
                    prevContent = resolvedPrevContext.content.length > length
                        ? resolvedPrevContext.content.substring(resolvedPrevContext.content.length - length)
                        : resolvedPrevContext.content;
                }
                else {
                    // Fallback to outline description
                    prevContent = `(Outline Summary): ${resolvedPrevContext.content}`;
                }
            }

            let localChildrenContext = "";
            if (selectedMapNode.children && selectedMapNode.children.length > 0) {
                localChildrenContext = "\n\n【本章细纲 (CHAPTER BEATS)】:\n";
                selectedMapNode.children.forEach(child => {
                    localChildrenContext += `- [${child.type}] ${child.name}: ${child.description || ''}\n`;
                });
            }
            context += localChildrenContext;

            let nextChapInfo: { title: string, desc?: string, childrenText?: string } | undefined = undefined;
            if (contextConfig.nextChapterId) {
                const nextNode = allChapterNodes.find(n => n.id === contextConfig.nextChapterId);
                if (nextNode) {
                    let childrenText = "";
                    if (nextNode.children && nextNode.children.length > 0) childrenText = nextNode.children.map(c => `- ${c.name}`).join('\n');
                    nextChapInfo = { title: nextNode.name, desc: nextNode.description, childrenText: childrenText };
                }
            }

            const fullStyle = customPromptContent;
            const targetNode = { ...selectedMapNode, name: manualDraftTitle || selectedMapNode.name };

            // 构建显示给用户的 Prompt 摘要
            const taskPayload = PromptService.writeChapter(
                targetNode.name,
                targetNode.description || '',
                "(Context Hidden for Display)",
                draftWordCount,
                fullStyle
            );

            const originalContext = context;

            if (enableContextOptimization) {
                // 关键修复：只将 context 传给优化器，不包含 Style
                updateTaskProgress(taskId, t('process.optimizing'), 20, t('process.scrubbing'), undefined, {
                    systemInstruction: globalPersona,
                    context: context,
                    prompt: taskPayload
                });

                // 只优化 context
                context = await optimizeContextWithAI(context, lang, enableCache);

                const ratio = ((1 - context.length / (originalContext.length || 1)) * 100);
                const displayRatio = ratio < 0 ? `结构化膨胀` : t('process.opt_success').replace('{ratio}', ratio.toFixed(1));

                updateTaskProgress(taskId, t('process.optimizing'), 25, displayRatio, undefined, {
                    systemInstruction: globalPersona,
                    context: context,
                    prompt: taskPayload,
                    comparison: {
                        originalContext: originalContext,
                        optimizedContext: context,
                        systemInstruction: globalPersona
                    }
                });
            } else {
                updateTaskProgress(taskId, t('process.drafting'), 20, "Using raw context...", undefined, {
                    systemInstruction: globalPersona,
                    context: context,
                    prompt: taskPayload
                });
            }

            await pauseTask(taskId);

            updateTaskProgress(taskId, t('process.drafting'), 30, t('process.calling_api'), undefined);

            const content = await generateChapterContent(
                targetNode, context, lang, model, fullStyle, draftWordCount,
                globalPersona, // 修复：始终传递 globalPersona
                (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo),
                prevContent, nextChapInfo
            );

            updateTaskProgress(taskId, t('process.saving'), 95, t('process.saving'));
            // Inject ID for stable referencing
            const newChapter = { id: Date.now().toString(), title: targetNode.name, content: content, nodeId: targetNode.id };
            const updatedRecord = { ...activeStoryRecord, chapters: [...(activeStoryRecord.chapters || []), newChapter] };
            setActiveStoryRecord(updatedRecord);
            setHistory(prev => prev.map(item => item.id === activeStoryRecord.id ? updatedRecord : item));
            updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: updatedRecord.chapters });
            setCurrentChapterIndex(updatedRecord.chapters!.length - 1);
            setMainViewMode('story-editor');
            setIsGeneratingChapter(false);
            return t('process.done');
        });
    }

    const handleRewriteWithContext = async (pid: string) => {
        if (!activeStoryRecord || currentChapterIndex === null) return;
        const currentChapter = activeStoryRecord.chapters?.[currentChapterIndex];
        const contentToRewrite = currentChapter ? currentChapter.content : activeStoryRecord.content;
        if (!contentToRewrite) return;
        setIsRewriting(true);
        try {
            const freshContext = (activeStoryRecord.architecture?.world ? extractContextFromTree(activeStoryRecord.architecture.world) : '');
            const promptTemplate = pid ? promptLibrary.find(p => p.id === pid)?.content : undefined;
            const result = await rewriteChapterWithContext(contentToRewrite, freshContext, lang, model, promptTemplate, globalPersona);
            const newChapters = [...(activeStoryRecord.chapters || [])];
            if (newChapters[currentChapterIndex]) newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: result };
            const updatedRecord = { ...activeStoryRecord, chapters: newChapters, content: activeStoryRecord.storyType === 'short' ? result : activeStoryRecord.content };
            setActiveStoryRecord(updatedRecord);
            updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, updatedRecord);
        } catch (e) { alert("重写失败"); } finally { setIsRewriting(false); }
    }

    const insertTextAtCursor = (textToInsert: string) => {
        const textarea = document.getElementById('studio-editor-textarea') as HTMLTextAreaElement;
        if (!textarea || !activeStoryRecord) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const text = textarea.value;
        const newText = text.substring(0, start) + textToInsert + text.substring(end);
        const newChapters = [...(activeStoryRecord.chapters || [])];
        if (currentChapterIndex !== null && newChapters[currentChapterIndex]) {
            newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: newText };
            const updated = { ...activeStoryRecord, chapters: newChapters };
            setActiveStoryRecord(updated);
            updateHistoryItem<StudioRecord>(STORAGE_KEYS.HISTORY_STUDIO, activeStoryRecord.id, { chapters: newChapters });
        }
    };

    const handleGenerateIllustration = async (mode: 'context' | 'prompt' | 'upload', customPrompt?: string, file?: File) => {
        if (!activeStoryRecord) return;
        if (mode === 'upload' && file) {
            const reader = new FileReader();
            reader.onloadend = () => insertTextAtCursor(`\n\n![Uploaded Illustration](${reader.result})\n\n`);
            reader.readAsDataURL(file);
            return;
        }
        setIsGeneratingIllu(true);
        try {
            let promptToUse = customPrompt || '';
            if (mode === 'context') {
                const textarea = document.getElementById('studio-editor-textarea') as HTMLTextAreaElement;
                if (textarea) {
                    const cursor = textarea.selectionStart;
                    const text = textarea.value;
                    const contextText = text.substring(Math.max(0, cursor - 1500), Math.min(text.length, cursor + 500));
                    promptToUse = await generateIllustrationPrompt(contextText, lang, model);
                }
            }
            if (!promptToUse) throw new Error("No prompt");
            const base64Image = await generateImage(promptToUse, 'gemini-2.5-flash-image', '4:3');
            insertTextAtCursor(`\n\n![Illustration](${base64Image})\n*${promptToUse}*\n\n`);
        } catch (e) { alert("插图生成失败"); } finally { setIsGeneratingIllu(false); }
    };

    const parseInspirations = (text: string) => {
        if (!text) return [];
        try {
            let cleanText = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
            const firstBrace = cleanText.indexOf('[');
            const lastBrace = cleanText.lastIndexOf(']');
            if (firstBrace !== -1 && lastBrace !== -1) cleanText = cleanText.substring(firstBrace, lastBrace + 1);
            const parsed = JSON.parse(cleanText);
            if (Array.isArray(parsed)) return parsed.map((item, index) => ({ id: index, title: item.title, synopsis: item.synopsis, metadata: item.metadata, raw: JSON.stringify(item) }));
        } catch (e) { }
        return [];
    }

    const confirmGenerateStory = async () => {
        setShowConfigModal(false);
        setActiveTab('tools');
        await startBackgroundTask('story', 'genStory', async (taskId) => {
            const result = await generateStoryFromIdea(
                selectedIdea, config, lang, model, undefined, globalPersona,
                (stage, progress, log, metrics, debugInfo) => updateTaskProgress(taskId, stage, progress, log, metrics, debugInfo)
            );
            addHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, {
                id: Date.now().toString(), timestamp: Date.now(), recordType: 'story', title: result.title, storyType: config.type, config: config, content: result.content, chapters: result.chapters, architecture: result.architecture || undefined, metadata: result.metadata
            });
            return "小说架构已生成";
        });
    }

    const handleToolAction = async () => {
        if (!editorText) return;
        setToolLoading(true);
        try {
            const result = await manipulateText(editorText, toolMode, lang, model, globalPersona);
            setEditorText(result);
        } catch (e) { } finally { setToolLoading(false); }
    };

    const handleToolPromptSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const pid = e.target.value;
        const p = promptLibrary.find(item => item.id === pid);
        if (p) setEditorText(p.content);
    }

    const inspirationCards = parseInspirations(studioState.generatedContent);

    const handleToggleRegenKey = (type: string) => {
        setRegenContextMapKeys(prev => {
            if (prev.includes(type)) {
                // If deselecting, also remove from optimize list
                setRegenOptimizeMapKeys(opt => opt.filter(k => k !== type));
                return prev.filter(k => k !== type);
            }
            return [...prev, type];
        });
    };

    const handleToggleRegenOptimize = (type: string) => {
        setRegenOptimizeMapKeys(prev => {
            if (prev.includes(type)) return prev.filter(k => k !== type);
            return [...prev, type];
        });
    };

    // 扩展节点的上下文选择切换
    const handleToggleExpandKey = (type: string) => {
        setExpandContextMapKeys(prev => {
            if (prev.includes(type)) {
                setExpandOptimizeMapKeys(opt => opt.filter(k => k !== type));
                return prev.filter(k => k !== type);
            }
            return [...prev, type];
        });
    };

    const handleToggleExpandOptimize = (type: string) => {
        setExpandOptimizeMapKeys(prev => {
            if (prev.includes(type)) return prev.filter(k => k !== type);
            return [...prev, type];
        });
    };

    const handleContextWarningDecision = (truncate: boolean) => {
        if (!pendingContextAction) return;
        setShowContextWarning(false);
        const finalContext = truncate ? contextWarningData.fullContext.substring(0, contextWarningData.truncated) + "\n[...安全截断...]" : contextWarningData.fullContext;
        pendingContextAction(finalContext);
        setPendingContextAction(null);
    };

    return (
        <div className="flex flex-col h-full p-0 md:p-4 max-w-full mx-auto relative overflow-hidden bg-slate-100">

            {showPromptLib && (
                <PromptLibraryModal isOpen={showPromptLib} onClose={() => setShowPromptLib(false)} />
            )}

            {showDataManager && (
                <DataManagerModal isOpen={showDataManager} onClose={() => setShowDataManager(false)} />
            )}

            {showInspirationConfig && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center rounded-t-xl">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Sparkles size={16} className="text-yellow-500" /> 灵感生成规则</h3>
                            <button onClick={() => setShowInspirationConfig(false)} className="text-slate-400 hover:text-slate-600">×</button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">书名 (Title)</label>
                                    <textarea value={inspirationRules.title} onChange={e => setInspirationRules({ ...inspirationRules, title: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg text-sm h-20 leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-slate-900 bg-white" placeholder="例如：四字书名，包含‘系统’二字..." />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">简介规则 (Synopsis)</label>
                                    <textarea value={inspirationRules.synopsis} onChange={e => setInspirationRules({ ...inspirationRules, synopsis: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32 leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-slate-900 bg-white" placeholder="例如：新媒体风格，前三行必须有反转..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">爽点 (Cool Point)</label>
                                    <textarea value={inspirationRules.coolPoint} onChange={e => setInspirationRules({ ...inspirationRules, coolPoint: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg text-sm h-24 leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-slate-900 bg-white" placeholder="例如：人前显圣，扮猪吃虎..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase mb-2">爆点 (Burst Point)</label>
                                    <textarea value={inspirationRules.burstPoint} onChange={e => setInspirationRules({ ...inspirationRules, burstPoint: e.target.value })} className="w-full p-3 border border-slate-200 rounded-lg text-sm h-24 leading-relaxed focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-slate-900 bg-white" placeholder="例如：主角身世揭秘，退婚打脸..." />
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-slate-50 flex justify-end gap-2 rounded-b-xl">
                            <button onClick={() => setShowInspirationConfig(false)} className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-200 rounded-lg font-medium">取消</button>
                            <button onClick={handleDailyGen} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 flex items-center gap-2"><Sparkles size={14} /> 确认生成</button>
                        </div>
                    </div>
                </div>
            )}

            {showNewChapModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6">
                        <h3 className="font-bold text-slate-800 mb-4">{t('studio.manual.newChapTitle')}</h3>
                        <input value={newChapTitle} onChange={e => setNewChapTitle(e.target.value)} className="w-full p-2 border rounded text-sm mt-1 text-slate-900 bg-white" />
                        <div className="flex justify-end gap-2 pt-4">
                            <button onClick={() => setShowNewChapModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded text-sm">{t('common.cancel')}</button>
                            <button onClick={handleManualAddChapter} className="px-4 py-2 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">{t('studio.manual.create')}</button>
                        </div>
                    </div>
                </div>
            )}

            {showConfigModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-xl shadow-2xl">
                        <div className="p-4 border-b bg-slate-50 flex justify-between items-center"><h3 className="font-bold text-slate-800">{t('studio.config.title')}</h3><button onClick={() => setShowConfigModal(false)}>×</button></div>
                        <div className="p-6 space-y-4">
                            <div><label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.config.type')}</label><div className="flex gap-2"><button onClick={() => setConfig({ ...config, type: 'short' })} className={`flex-1 py-2 rounded border text-sm ${config.type === 'short' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200'}`}>{t('studio.config.short')}</button><button onClick={() => setConfig({ ...config, type: 'long' })} className={`flex-1 py-2 rounded border text-sm ${config.type === 'long' ? 'bg-teal-50 border-teal-500 text-teal-700' : 'border-slate-200'}`}>{t('studio.config.long')}</button></div></div>
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 text-xs text-blue-700"><Sparkles size={12} className="inline mr-1" />系统将为您创建标准的空白架构模板，后续可在各节点中进行 AI 填充。</div>
                        </div>
                        <div className="p-4 bg-slate-50 border-t flex justify-end gap-2"><button onClick={() => setShowConfigModal(false)} className="px-4 py-2 text-slate-600">{t('common.cancel')}</button><button onClick={confirmGenerateStory} className="px-4 py-2 bg-teal-600 text-white rounded">{t('studio.genStory')}</button></div>
                    </div>
                </div>
            )}

            {showRegenModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b bg-slate-50 flex justify-between rounded-t-xl"><h3 className="font-bold">{t('studio.tree.regenerate')}</h3><button onClick={() => setShowRegenModal(false)}>×</button></div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">额外补充 (Optional Instruction)</label>
                                    <button onClick={() => setRegenIdea('')} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"><Eraser size={10} /> {t('common.clear')}</button>
                                </div>
                                <textarea value={regenIdea} onChange={e => setRegenIdea(e.target.value)} className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32 leading-relaxed font-mono text-xs focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none text-slate-900 bg-white" placeholder="输入新的构思或修改意见..." />
                                <p className="text-[10px] text-slate-400 mt-1">* 核心书名、简介及爽点等元数据将自动合并到上下文中，无需重复输入。</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={12} /> {t('studio.tree.requirements')}</label>
                                <textarea value={regenRequirements} onChange={(e) => setRegenRequirements(e.target.value)} className="w-full p-3 border border-red-200 rounded-lg text-xs bg-red-50 text-slate-700 h-24 leading-relaxed resize-none focus:bg-white focus:ring-2 focus:ring-red-200 transition-all placeholder:text-slate-400" placeholder={t('studio.tree.requirementsPlaceholder')} />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.config.style')}</label>
                                <select value={regenPromptId} onChange={(e) => { const pid = e.target.value; setRegenPromptId(pid); const p = promptLibrary.find(item => item.id === pid); if (p) setRegenStyleContent(p.content); }} className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white mb-2">
                                    <option value="">{t('architect.defaultStyle')}</option>
                                    {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <textarea value={regenStyleContent} onChange={(e) => { setRegenStyleContent(e.target.value); if (regenPromptId) setRegenPromptId(''); }} className="w-full p-3 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 h-24 leading-relaxed resize-none focus:bg-white focus:ring-2 focus:ring-teal-500 transition-all placeholder:text-slate-400" placeholder="在此输入自定义提示词或风格要求..." />
                            </div>

                            {/* Granular Context Selection */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">{t('studio.tree.selectContext')}</label>
                                <div className="space-y-1">
                                    {allMaps.filter(t => t !== selectedMapType).map(type => {
                                        const isSelected = regenContextMapKeys.includes(type);
                                        const isOptimized = regenOptimizeMapKeys.includes(type);

                                        return (
                                            <div key={type} className={`flex items-center justify-between p-2 border rounded-lg transition-colors ${isSelected ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                                {/* Left: Select Context */}
                                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleToggleRegenKey(type)}>
                                                    {isSelected ? <CheckSquare size={16} className="text-teal-600" /> : <Square size={16} className="text-slate-300" />}
                                                    <span className={`text-xs ${isSelected ? 'font-bold text-slate-700' : 'text-slate-500'}`}>{t(`studio.maps.${type}`)}</span>
                                                </div>

                                                {/* Right: Optimization Toggle (Visible only if selected) */}
                                                {isSelected && (
                                                    <div className="flex items-center" title={t('studio.tree.optimizeHelp')}>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleRegenOptimize(type); }}
                                                            className={`p-1.5 rounded transition-all flex items-center gap-1 ${isOptimized ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
                                                            title={t('studio.tree.optimizeItem')}
                                                        >
                                                            <Sparkles size={14} className={isOptimized ? "fill-indigo-600" : ""} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 text-right flex justify-end items-center gap-1">
                                    <Sparkles size={10} className="text-indigo-400" /> = {t('studio.tree.optimizeItem')}
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2 rounded-b-xl"><button onClick={() => setShowRegenModal(false)} className="px-4 py-2 text-slate-600 rounded-lg hover:bg-slate-100">{t('common.cancel')}</button><button onClick={handleRegenerateMap} disabled={isRegeneratingMap} className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center gap-2">{isRegeneratingMap ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} {t('studio.tree.regenerate')}</button></div>
                    </div>
                </div>
            )}

            {/* 扩展节点模态框 */}
            {showExpandModal && expandingNode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
                        <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50 flex justify-between rounded-t-xl">
                            <h3 className="font-bold flex items-center gap-2">
                                <GitBranch size={16} className="text-purple-600" />
                                扩展节点: {expandingNode.name}
                            </h3>
                            <button onClick={() => setShowExpandModal(false)}>×</button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-4">
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-xs">
                                <p className="text-purple-800 font-medium mb-1">当前节点信息:</p>
                                <p className="text-purple-600"><strong>名称:</strong> {expandingNode.name}</p>
                                {expandingNode.description && (
                                    <p className="text-purple-600 mt-1"><strong>描述:</strong> {expandingNode.description.substring(0, 100)}{expandingNode.description.length > 100 ? '...' : ''}</p>
                                )}
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">扩展想法 (Expansion Idea)</label>
                                    <button onClick={() => setExpandIdea('')} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"><Eraser size={10} /> 清空</button>
                                </div>
                                <textarea
                                    value={expandIdea}
                                    onChange={e => setExpandIdea(e.target.value)}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-sm h-32 leading-relaxed font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-slate-900 bg-white"
                                    placeholder="输入扩展想法，例如：增加更多子情节、细化角色关系、扩展世界观细节..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-red-600 uppercase mb-2 flex items-center gap-1"><AlertTriangle size={12} /> 约束条件</label>
                                <textarea
                                    value={expandRequirements}
                                    onChange={(e) => setExpandRequirements(e.target.value)}
                                    className="w-full p-3 border border-red-200 rounded-lg text-xs bg-red-50 text-slate-700 h-24 leading-relaxed resize-none focus:bg-white focus:ring-2 focus:ring-red-200 transition-all placeholder:text-slate-400"
                                    placeholder="可选：添加约束条件，例如：不要超过5个子节点、保持风格一致..."
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">风格提示词</label>
                                <select
                                    value={expandPromptId}
                                    onChange={(e) => {
                                        const pid = e.target.value;
                                        setExpandPromptId(pid);
                                        const p = promptLibrary.find(item => item.id === pid);
                                        if (p) setExpandStyleContent(p.content);
                                    }}
                                    className="w-full p-2 border border-slate-200 rounded-lg text-sm bg-white mb-2"
                                >
                                    <option value="">默认风格</option>
                                    {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                </select>
                                <textarea
                                    value={expandStyleContent}
                                    onChange={(e) => { setExpandStyleContent(e.target.value); if (expandPromptId) setExpandPromptId(''); }}
                                    className="w-full p-3 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-700 h-24 leading-relaxed resize-none focus:bg-white focus:ring-2 focus:ring-purple-500 transition-all placeholder:text-slate-400"
                                    placeholder="在此输入自定义提示词或风格要求..."
                                />
                            </div>

                            {/* 上下文选择 */}
                            <div>
                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">选择参考上下文</label>
                                <div className="space-y-1">
                                    {allMaps.filter(t => t !== selectedMapType).map(type => {
                                        const isSelected = expandContextMapKeys.includes(type);
                                        const isOptimized = expandOptimizeMapKeys.includes(type);

                                        return (
                                            <div key={type} className={`flex items-center justify-between p-2 border rounded-lg transition-colors ${isSelected ? 'bg-slate-50 border-slate-300' : 'bg-white border-slate-100 hover:bg-slate-50'}`}>
                                                <div className="flex items-center gap-2 cursor-pointer flex-1" onClick={() => handleToggleExpandKey(type)}>
                                                    {isSelected ? <CheckSquare size={16} className="text-purple-600" /> : <Square size={16} className="text-slate-300" />}
                                                    <span className={`text-xs ${isSelected ? 'font-bold text-slate-700' : 'text-slate-500'}`}>{t(`studio.maps.${type}`)}</span>
                                                </div>
                                                {isSelected && (
                                                    <div className="flex items-center">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleToggleExpandOptimize(type); }}
                                                            className={`p-1.5 rounded transition-all flex items-center gap-1 ${isOptimized ? 'bg-indigo-100 text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`}
                                                        >
                                                            <Sparkles size={14} className={isOptimized ? "fill-indigo-600" : ""} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-2 text-right flex justify-end items-center gap-1">
                                    <Sparkles size={10} className="text-indigo-400" /> = AI清洗优化
                                </p>
                            </div>
                        </div>
                        <div className="p-4 border-t flex justify-end gap-2 rounded-b-xl">
                            <button onClick={() => setShowExpandModal(false)} className="px-4 py-2 text-slate-600 rounded-lg hover:bg-slate-100">取消</button>
                            <button
                                onClick={handleExpandNode}
                                disabled={isExpandingNode}
                                className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 flex items-center gap-2"
                            >
                                {isExpandingNode ? <Loader2 className="animate-spin" size={16} /> : <GitBranch size={16} />}
                                开始扩展
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col bg-white md:rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="h-14 border-b border-slate-200 flex items-center justify-between px-6 bg-white flex-shrink-0">
                    <div className="flex gap-6 h-full">
                        <button onClick={() => setActiveTab('daily')} className={`h-full border-b-2 font-medium text-sm px-1 ${activeTab === 'daily' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500'}`}>{t('studio.tabDaily')}</button>
                        <button onClick={() => setActiveTab('tools')} className={`h-full border-b-2 font-medium text-sm px-1 ${activeTab === 'tools' ? 'border-teal-600 text-teal-800' : 'border-transparent text-slate-500'}`}>{t('studio.tabTools')}</button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {activeTab === 'daily' && (
                        <div className="absolute inset-0 flex flex-col md:flex-row gap-0">
                            <div className="w-full md:w-80 border-r border-slate-200 bg-slate-50 p-6 flex flex-col gap-4 overflow-y-auto">
                                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
                                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2 text-sm"><Sparkles className="text-yellow-500" size={16} /> {t('studio.dailyGenTitle')}</h3>
                                    <div className="mb-4 border-b border-slate-100 pb-4">
                                        <div className="flex justify-between items-center mb-2 cursor-pointer hover:bg-slate-50 p-1 -mx-1 rounded" onClick={() => setShowSourceSelector(!showSourceSelector)}>
                                            <label className="text-xs font-bold text-slate-500 uppercase cursor-pointer">{t('sources.title')}</label>
                                            <div className="flex items-center gap-1 text-xs text-teal-600 font-medium"><span className="truncate max-w-[100px] text-right">{selectedSources.length > 0 ? selectedSources.map(s => t(`sources.${s}`)).join(', ') : t('common.selected')}</span>{showSourceSelector ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</div>
                                        </div>
                                        {showSourceSelector && (
                                            <div className="grid grid-cols-3 gap-1.5 animate-in fade-in slide-in-from-top-2">
                                                {AVAILABLE_SOURCES.map(src => (
                                                    <button key={src} onClick={(e) => { e.stopPropagation(); toggleSourceSelection(src); }} className={`px-1 py-1.5 rounded text-[10px] font-medium border transition-all ${selectedSources.includes(src) ? 'bg-teal-50 border-teal-200 text-teal-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>{t(`sources.${src}`)}</button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex bg-slate-100 p-1 rounded-lg mb-4"><button onClick={() => setTargetAudience('male')} className={`flex-1 py-1.5 rounded text-xs font-medium ${targetAudience === 'male' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{t('studio.maleFreq')}</button><button onClick={() => setTargetAudience('female')} className={`flex-1 py-1.5 rounded text-xs font-medium ${targetAudience === 'female' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500'}`}>{t('studio.femaleFreq')}</button></div>
                                    <div className="flex gap-2 mb-4"><input type="text" value={studioState.trendFocus} onChange={(e) => handleInputChange(e.target.value)} placeholder={t('studio.trendPlaceholder')} className="flex-1 p-2 text-xs border border-slate-300 rounded text-slate-900 bg-white" disabled={isGeneratingDaily} /><button onClick={handleAnalyzeTrend} disabled={isAnalyzingTrend || selectedSources.length === 0} className="p-2 bg-indigo-50 text-indigo-600 rounded disabled:opacity-50" title="获取趋势 (Gemini Grounding)">{isAnalyzingTrend ? <Loader2 className="animate-spin" size={16} /> : <ZapIcon size={16} />}</button></div>
                                    <button onClick={handleOpenInspirationConfig} disabled={isGeneratingDaily} className="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-2">{isGeneratingDaily ? <Loader2 className="animate-spin" /> : t('studio.generateBtn')}</button>
                                </div>
                                <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 overflow-y-auto shadow-sm">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2"><History size={12} /> {t('studio.historyTitle')}</h4>
                                    {history.filter(h => h.recordType === 'inspiration').map(item => (
                                        <div key={item.id} onClick={() => handleHistoryClick(item)} className="bg-slate-50 rounded-lg border border-slate-100 p-3 mb-2 cursor-pointer hover:border-teal-300 hover:shadow-sm transition-all group">
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="font-bold text-xs text-slate-700">{item.trendFocus}</div>
                                                <button onClick={(e) => { e.stopPropagation(); handleDeleteHistory(item.id); }} className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                                            </div>
                                            <div className="text-[10px] text-slate-400 flex justify-between"><span>{item.metadata?.gender === 'male' ? t('studio.maleFreq') : t('studio.femaleFreq')}</span><span>{new Date(item.timestamp).toLocaleDateString()}</span></div>
                                        </div>
                                    ))}
                                    {history.filter(h => h.recordType === 'inspiration').length === 0 && <div className="text-center text-slate-400 text-xs italic py-4">{t('common.noHistory')}</div>}
                                </div>
                            </div>
                            <div className="flex-1 bg-slate-50/50 p-4 md:p-8 overflow-y-auto">
                                <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6">
                                    {inspirationCards.length > 0 ? (
                                        inspirationCards.map(card => (
                                            <div key={card.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 hover:shadow-md transition-shadow relative overflow-hidden group">
                                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-teal-50 to-transparent rounded-bl-full -mr-8 -mt-8"></div>
                                                <div className="relative z-10">
                                                    <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-teal-700 transition-colors">{card.title}</h3>

                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {card.metadata?.trope && <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-100">{card.metadata.trope}</span>}
                                                        {card.metadata?.majorCategory && <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200 flex items-center gap-1"><Tag size={10} /> {card.metadata.majorCategory}</span>}
                                                        {card.metadata?.goldenFinger && <span className="bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-bold flex items-center gap-1 border border-amber-100"><ZapIcon size={10} /> {card.metadata.goldenFinger.substring(0, 15)}...</span>}
                                                    </div>

                                                    <p className="text-slate-600 text-sm leading-relaxed mb-4 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">{card.synopsis}</p>

                                                    {/* Enhanced Metadata Grid */}
                                                    <div className="grid grid-cols-2 gap-3 mb-6 bg-slate-50/50 p-3 rounded-lg border border-slate-100 text-xs">
                                                        {card.metadata?.coolPoint && (
                                                            <div className="col-span-2">
                                                                <div className="font-bold text-emerald-600 mb-1 flex items-center gap-1"><Flame size={12} /> {t('studio.meta.coolPoint')}</div>
                                                                <div className="text-slate-600 leading-snug">{card.metadata.coolPoint}</div>
                                                            </div>
                                                        )}
                                                        {card.metadata?.burstPoint && (
                                                            <div>
                                                                <div className="font-bold text-red-500 mb-1 flex items-center gap-1"><Target size={12} /> {t('studio.meta.burstPoint')}</div>
                                                                <div className="text-slate-600 leading-snug">{card.metadata.burstPoint}</div>
                                                            </div>
                                                        )}
                                                        {card.metadata?.memoryAnchor && (
                                                            <div>
                                                                <div className="font-bold text-blue-500 mb-1 flex items-center gap-1"><Anchor size={12} /> {t('studio.meta.memoryAnchor')}</div>
                                                                <div className="text-slate-600 leading-snug">{card.metadata.memoryAnchor}</div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                                        <button onClick={() => { setSelectedIdea(card.raw); setShowConfigModal(true); }} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 flex items-center gap-2 shadow-lg shadow-slate-900/10"><Wand2 size={14} /> {t('studio.genStory')}</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-96 text-slate-400">
                                            <Sparkles size={48} className="opacity-20 mb-4" /><p className="text-sm">{t('studio.emptyDaily')}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tools' && (
                        <div className="absolute inset-0 flex">
                            <StudioSidebar history={history} activeStoryRecord={activeStoryRecord} mainViewMode={mainViewMode} currentChapterIndex={currentChapterIndex} onSelectQuickTools={() => { setMainViewMode('quick-tools'); setActiveStoryRecord(null); }} onSelectRecord={toggleStoryExpand} onToggleExpand={toggleStoryExpand} expandedStoryId={expandedStoryId} onOpenMaps={(record) => { setActiveStoryRecord(record); setMainViewMode('story-map'); }} onOpenFolder={(record) => { setActiveStoryRecord(record); setMainViewMode('story-files'); }} onOpenChapter={handleOpenChapter} onCreateChapter={openNewChapModal} onDeleteHistory={(id) => { deleteHistoryItem(STORAGE_KEYS.HISTORY_STUDIO, id); loadHistory(); if (activeStoryRecord?.id === id) setActiveStoryRecord(null); }} onExportJson={handleExportJson} onExportItemJson={handleExportItemJson} onExportZip={handleExportZip} onImportHistory={handleImportHistory} onManagePrompts={() => setShowPromptLib(true)} />

                            {mainViewMode === 'quick-tools' && (
                                <div className="flex-1 flex flex-col p-8 bg-slate-50 h-full overflow-y-auto">
                                    <div className="max-w-3xl mx-auto w-full bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col h-[calc(100%-2rem)]">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Wrench className="text-teal-600" /> {t('studio.tabTools')}</h3>
                                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                                <button onClick={() => setToolMode('continue')} className={`px-4 py-1.5 text-xs font-bold rounded ${toolMode === 'continue' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>{t('studio.toolContinue')}</button>
                                                <button onClick={() => setToolMode('rewrite')} className={`px-4 py-1.5 text-xs font-bold rounded ${toolMode === 'rewrite' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>{t('studio.toolRewrite')}</button>
                                                <button onClick={() => setToolMode('polish')} className={`px-4 py-1.5 text-xs font-bold rounded ${toolMode === 'polish' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>{t('studio.toolPolish')}</button>
                                            </div>
                                        </div>

                                        {/* Prompt Selector for Quick Tools */}
                                        <div className="mb-4">
                                            <select onChange={handleToolPromptSelect} className="w-full p-2 border border-slate-200 rounded text-sm bg-slate-50">
                                                <option value="">{t('studio.inspector.selectTemplate')}</option>
                                                {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>

                                        <textarea value={editorText} onChange={(e) => setEditorText(e.target.value)} className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 mb-4 font-mono" placeholder={t('studio.toolPlaceholder')} />
                                        <div className="flex justify-end">
                                            <button onClick={handleToolAction} disabled={toolLoading || !editorText} className="px-6 py-2.5 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2">{toolLoading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} {getProcessLabel(toolMode)}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {mainViewMode === 'story-map' && activeStoryRecord && (
                                <div className="flex-1 flex relative h-full">
                                    <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
                                        {/* Responsive Flex Header - UPDATED */}
                                        <div className="w-full bg-white border-b border-slate-200 p-4 flex flex-col gap-4 shadow-sm z-10">
                                            <div className="flex flex-wrap gap-3 items-center">
                                                <div className="flex items-center gap-2 px-2 border-r border-slate-200 mr-2 flex-shrink-0"><span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{t('studio.mapGroup.core')}</span></div>
                                                {coreMaps.map(type => (<button key={type} onClick={() => { setSelectedMapType(type as any); setSelectedMapNode(null); }} className={`px-5 py-2.5 rounded text-sm font-bold whitespace-nowrap transition-all ${selectedMapType === type ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>{t(`studio.maps.${type}`)}</button>))}
                                                <div className="flex items-center gap-2 px-2 border-l border-r border-slate-200 mx-2 flex-shrink-0"><span className="text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap">{t('studio.mapGroup.plot')}</span></div>
                                                {plotMaps.map(type => (<button key={type} onClick={() => { setSelectedMapType(type as any); setSelectedMapNode(null); }} className={`px-5 py-2.5 rounded text-sm font-bold whitespace-nowrap transition-all ${selectedMapType === type ? 'bg-indigo-600 text-white shadow-md' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}>{t(`studio.maps.${type}`)}</button>))}
                                            </div>
                                            {/* Action Buttons Row */}
                                            <div className="flex gap-2 justify-end border-t border-slate-100 pt-2">
                                                <button onClick={handleResetMap} className="px-3 py-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex items-center gap-1" title={t('common.clear')}>
                                                    <Trash2 size={14} /> <span className="text-xs">{t('common.clear')}</span>
                                                </button>
                                                <button onClick={handleOpenRegenModal} className="px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded transition-colors flex items-center gap-1" title={t('studio.tree.regenerate')}>
                                                    <RefreshCw size={14} className={isRegeneratingMap ? "animate-spin" : ""} />
                                                    <span className="text-xs font-bold">{t('studio.tree.regenerate')}</span>
                                                </button>
                                            </div>
                                        </div>
                                        <MindMap data={activeStoryRecord.architecture ? (activeStoryRecord.architecture as any)[selectedMapType] : null} onNodeClick={(node) => setSelectedMapNode(node)} />
                                    </div>

                                    {selectedMapNode && (
                                        // Fixed width 96 (approx 384px) for desktop, max-w-full for mobile safety
                                        <div className="w-96 max-w-full bg-white border-l border-slate-200 shadow-2xl z-20 flex flex-col animate-in slide-in-from-right duration-200 absolute top-0 right-0 bottom-0">
                                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50"><h3 className="font-bold text-slate-700 flex items-center gap-2 text-sm"><Settings2 size={16} /> {t('studio.inspector.title')}</h3><button onClick={() => setSelectedMapNode(null)} className="text-slate-400 hover:text-slate-600">&times;</button></div>
                                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('studio.inspector.name')}</label><input value={editNodeName} onChange={e => setEditNodeName(e.target.value)} className="w-full p-2 border border-slate-200 rounded text-sm font-bold bg-slate-50 focus:bg-white transition-colors text-slate-900" /></div>
                                                <div><label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">{t('studio.inspector.desc')}</label><textarea value={editNodeDesc} onChange={e => setEditNodeDesc(e.target.value)} rows={6} className="w-full p-2 border border-slate-200 rounded text-xs leading-relaxed bg-slate-50 focus:bg-white transition-colors text-slate-900" /></div>
                                                <button onClick={handleSaveNodeEdit} className="w-full py-2 bg-slate-100 text-slate-600 rounded text-xs font-bold hover:bg-slate-200 mb-2">{t('studio.inspector.save')}</button>

                                                {/* 扩展节点按钮 */}
                                                <button
                                                    onClick={handleOpenExpandModal}
                                                    className="w-full py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded text-xs font-bold hover:from-purple-600 hover:to-pink-600 mb-4 flex items-center justify-center gap-2"
                                                >
                                                    <GitBranch size={14} />
                                                    扩展节点
                                                </button>

                                                {/* Context Control Panel - Only for Chapters (Restrict drafting UI) */}
                                                {selectedMapType === 'chapters' && (selectedMapNode.type === 'chapter' || selectedMapNode.type === 'scene') && (
                                                    <>
                                                        <div className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden mb-4">
                                                            <button onClick={() => setShowContextConfig(!showContextConfig)} className="w-full p-3 flex justify-between items-center bg-slate-100 hover:bg-slate-200 transition-colors text-xs font-bold text-slate-600"><span className="flex items-center gap-2"><Settings2 size={12} /> {t('studio.inspector.contextSettings')}</span>{showContextConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
                                                            {showContextConfig && (
                                                                <div className="p-3 space-y-3 bg-white border-t border-slate-200">
                                                                    <div>
                                                                        <span className="text-[10px] text-slate-500 block mb-1 flex items-center gap-1"><LinkIcon size={10} /> Previous Context Source</span>
                                                                        <select
                                                                            value={contextConfig.previousChapterId || ''}
                                                                            onChange={e => setContextConfig({ ...contextConfig, previousChapterId: e.target.value || undefined })}
                                                                            className="w-full p-1.5 border rounded text-[10px] bg-slate-50 truncate"
                                                                        >
                                                                            <option value="">{t('studio.inspector.autoDetect')}</option>
                                                                            <optgroup label="已生成正文 (Manuscript)">
                                                                                {activeStoryRecord?.chapters?.map((c, i) => (
                                                                                    <option key={`chap-${i}`} value={`chapter:${c.id || i}`}>
                                                                                        {c.title.length > 20 ? c.title.substring(0, 20) + '...' : c.title} ({c.content.length}字)
                                                                                    </option>
                                                                                ))}
                                                                            </optgroup>
                                                                            <optgroup label="大纲节点 (Blueprint)">
                                                                                {allChapterNodes.map(n => (
                                                                                    <option key={n.id} value={`node:${n.id}`}>
                                                                                        {n.name}
                                                                                    </option>
                                                                                ))}
                                                                            </optgroup>
                                                                        </select>
                                                                    </div>

                                                                    {/* New Controls for Previous Content Length */}
                                                                    {contextConfig.includePrevChapter && resolvedPrevContext && (
                                                                        <div className="mt-2 bg-slate-100 p-2 rounded border border-slate-200 animate-in fade-in slide-in-from-top-1">
                                                                            <div className="flex justify-between items-center mb-1">
                                                                                <span className="text-[9px] font-bold text-slate-500">引用长度 (Words)</span>
                                                                                {/* Status indicator */}
                                                                                {resolvedPrevContext.type === 'chapter' ? (
                                                                                    <span className="text-[9px] text-green-600 flex items-center gap-1" title={resolvedPrevContext.title}>
                                                                                        <CheckSquare size={8} /> 已锁定: {resolvedPrevContext.title.length > 6 ? resolvedPrevContext.title.substring(0, 6) + '...' : resolvedPrevContext.title}
                                                                                    </span>
                                                                                ) : (
                                                                                    <span className="text-[9px] text-amber-500 flex items-center gap-1">
                                                                                        <AlertTriangle size={8} /> 仅大纲
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            <div className="flex gap-1 mb-2">
                                                                                {[500, 1000, 1500, 2000].map(len => (
                                                                                    <button
                                                                                        key={len}
                                                                                        onClick={() => setContextConfig({ ...contextConfig, prevContextLength: len })}
                                                                                        className={`flex-1 py-1 text-[9px] rounded border transition-colors ${contextConfig.prevContextLength === len ? 'bg-teal-500 text-white border-teal-600 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'}`}
                                                                                    >
                                                                                        {len}
                                                                                    </button>
                                                                                ))}
                                                                            </div>

                                                                            {/* Preview Content Block */}
                                                                            {resolvedPrevContext.content && (
                                                                                <div className="bg-white p-2 rounded border border-slate-200 text-[9px] text-slate-600 max-h-32 overflow-y-auto leading-relaxed font-serif shadow-inner">
                                                                                    <div className="font-bold text-slate-400 mb-1 not-italic flex justify-between">
                                                                                        <span>片段预览</span>
                                                                                        <span className="font-mono">{Math.min(resolvedPrevContext.content.length, contextConfig.prevContextLength || 1000)}字</span>
                                                                                    </div>
                                                                                    <div className="italic opacity-80">
                                                                                        {resolvedPrevContext.content.length > (contextConfig.prevContextLength || 1000)
                                                                                            ? "..." + resolvedPrevContext.content.slice(-(contextConfig.prevContextLength || 1000))
                                                                                            : resolvedPrevContext.content}
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    <div><span className="text-[10px] text-slate-500 block mb-1 flex items-center gap-1"><ArrowRightCircle size={10} /> {t('studio.inspector.nextNode')}</span><select value={contextConfig.nextChapterId || ''} onChange={e => setContextConfig({ ...contextConfig, nextChapterId: e.target.value || undefined })} className="w-full p-1.5 border rounded text-[10px] bg-slate-50 truncate"><option value="">{t('studio.inspector.none')}</option>{allChapterNodes.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}</select></div>

                                                                    {/* RAG Toggle */}
                                                                    <div className="flex flex-col gap-2 border-b border-slate-100 pb-2 mb-2">
                                                                        <div className="flex items-center gap-2">
                                                                            <input type="checkbox" id="rag-toggle" checked={contextConfig.enableRAG} onChange={e => setContextConfig({ ...contextConfig, enableRAG: e.target.checked })} className="rounded border-gray-300 text-purple-600 focus:ring-purple-500" />
                                                                            <label htmlFor="rag-toggle" className="text-[10px] font-bold text-purple-700 cursor-pointer flex items-center gap-1"><Network size={10} /> {t('studio.inspector.enableRAG')}</label>
                                                                        </div>
                                                                        {contextConfig.enableRAG && (
                                                                            <div className="space-y-3">
                                                                                {/* Threshold Slider */}
                                                                                <div>
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <span className="text-[9px] font-bold text-slate-500">{t('studio.inspector.ragThreshold')}</span>
                                                                                        <span className="text-[9px] text-purple-600 font-mono">{contextConfig.ragThreshold}</span>
                                                                                    </div>
                                                                                    <input
                                                                                        type="range"
                                                                                        min="0.0" max="1.0" step="0.05"
                                                                                        value={contextConfig.ragThreshold || 0.25}
                                                                                        onChange={(e) => setContextConfig({ ...contextConfig, ragThreshold: parseFloat(e.target.value) })}
                                                                                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                                                                                    />
                                                                                </div>

                                                                                {/* Embedding Model Selector */}
                                                                                <div>
                                                                                    <div className="flex justify-between items-center mb-1">
                                                                                        <span className="text-[9px] font-bold text-slate-500">{t('studio.inspector.embeddingModel')}</span>
                                                                                    </div>
                                                                                    <select
                                                                                        value={contextConfig.embeddingModel || EmbeddingModel.LOCAL_MINILM}
                                                                                        onChange={(e) => setContextConfig({ ...contextConfig, embeddingModel: e.target.value })}
                                                                                        className="w-full p-1.5 border rounded text-[10px] bg-slate-50"
                                                                                    >
                                                                                        <option value={EmbeddingModel.LOCAL_MINILM}>Local (Offline / Free) - Default</option>
                                                                                        <option value={EmbeddingModel.TEXT_EMBEDDING_004}>text-embedding-004 (Cloud)</option>
                                                                                        <option value={EmbeddingModel.EMBEDDING_001}>embedding-001 (Legacy)</option>
                                                                                    </select>
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {/* Context Maps Selection - Only if RAG is OFF */}
                                                                    {!contextConfig.enableRAG && (
                                                                        <div>
                                                                            <span className="text-[10px] text-slate-500 block mb-1">{t('studio.inspector.contextMaps')}</span>
                                                                            <div className="grid grid-cols-2 gap-1">
                                                                                {allMaps.filter(m => m !== selectedMapType).map(m => (
                                                                                    <div key={m} onClick={() => setContextConfig(prev => { const newMaps = prev.selectedMaps.includes(m) ? prev.selectedMaps.filter(x => x !== m) : [...prev.selectedMaps, m]; return { ...prev, selectedMaps: newMaps }; })} className={`px-2 py-1 rounded text-[10px] cursor-pointer border transition-colors ${contextConfig.selectedMaps.includes(m) ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-100 text-slate-400'}`}>{t(`studio.maps.${m}`)}</div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Optimization Toggle */}
                                                        <div className="space-y-2">
                                                            <div className="flex items-center gap-2">
                                                                <input type="checkbox" id="opt-context" checked={enableContextOptimization} onChange={e => setEnableContextOptimization(e.target.checked)} className="rounded border-gray-300 text-teal-600 focus:ring-teal-500" />
                                                                <label htmlFor="opt-context" className="text-[10px] font-bold text-teal-700 cursor-pointer flex items-center gap-1"><Sparkles size={10} /> {t('studio.inspector.optimizeContext')}</label>
                                                            </div>
                                                        </div>

                                                        <div className="border-t border-slate-100 pt-4">
                                                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">{t('studio.inspector.generate')}</label>
                                                            <input value={manualDraftTitle} onChange={e => setManualDraftTitle(e.target.value)} placeholder={t('studio.manual.chapTitle')} className="w-full p-2 border border-slate-200 rounded text-xs mb-2 bg-white text-slate-900" />
                                                            <div className="flex gap-2 items-center mb-2"><Hash size={14} className="text-slate-400" /><input type="number" value={draftWordCount} onChange={e => setDraftWordCount(Number(e.target.value))} className="w-20 p-1 border rounded text-xs text-center" step={500} /><span className="text-xs text-slate-400">{t('studio.inspector.words')}</span></div>
                                                            <select value={selectedPromptId} onChange={handlePromptSelect} className="w-full p-2 border border-slate-200 rounded text-xs bg-slate-50 mb-2"><option value="">{t('studio.inspector.selectTemplate')}</option>{promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                                                            <textarea value={customPromptContent} onChange={e => setCustomPromptContent(e.target.value)} placeholder={t('studio.inspector.promptLabel')} className="w-full p-2 border border-slate-200 rounded text-xs h-20 mb-3 resize-none focus:outline-none focus:border-teal-400 bg-white text-slate-900" />
                                                            <button onClick={handleGenerateNodeContent} disabled={isGeneratingChapter} className="w-full py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 transition-all disabled:opacity-50">{isGeneratingChapter ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />} {t('studio.inspector.generate')}</button>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {mainViewMode === 'story-files' && (
                                <StudioFileList activeStoryRecord={activeStoryRecord} onOpenChapter={handleOpenChapter} onDeleteChapter={handleDeleteChapter} onCreateChapter={openNewChapModal} />
                            )}

                            {mainViewMode === 'story-editor' && (
                                <StudioEditor activeStoryRecord={activeStoryRecord} currentChapterIndex={currentChapterIndex} onUpdateContent={(val) => { if (!activeStoryRecord || currentChapterIndex === null) return; const newChapters = [...(activeStoryRecord.chapters || [])]; if (newChapters[currentChapterIndex]) { newChapters[currentChapterIndex] = { ...newChapters[currentChapterIndex], content: val }; setActiveStoryRecord({ ...activeStoryRecord, chapters: newChapters }); } }} promptLibrary={promptLibrary} isRewriting={isRewriting} onRewrite={handleRewriteWithContext} onGenerateIllustration={handleGenerateIllustration} isGeneratingIllu={isGeneratingIllu} />
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
