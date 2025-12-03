
/**
 * @file contexts/AppContext.tsx
 * @description 应用程序的全局状态管理中心。
 * 
 * ## 功能
 * - 管理全局设置（模型、语言、数据源）。
 * - 管理核心业务状态（工作室、架构师、实验室）。
 * - 提供提示词库的 CRUD 操作。
 * - 统一管理后台任务队列与进度更新。
 * - **新增**: 管理全局 AI 身份设定 (Global Persona)。
 * - **新增**: 管理动态模型配置 (Model Configs)。
 * - **新增**: 任务重试机制 (Retry Task)。
 * - **新增**: 任务暂停与手动恢复 (Pause/Resume)。
 * - **新增**: 自动执行模式 (Auto-Execute) 支持。
 */

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS, addHistoryItem } from '../services/storageService';
import { AVAILABLE_SOURCES, StudioGlobalState, ArchitectGlobalState, LabGlobalState, PromptTemplate, BackgroundTask, AIMetrics, GlobalUsageStats, PersonaTemplate, ModelConfig, AVAILABLE_MODELS } from '../types';
import { generateDailyStories, analyzeText, generateStoryFromIdea, generateNovelArchitecture } from '../services/geminiService';
import { DEFAULT_PERSONA_ZH, DEFAULT_PERSONA_EN, DEFAULT_PERSONA_TEMPLATES } from '../services/promptService';
import { useI18n } from '../i18n';

// 系统默认提示词模板 (已汉化)
const DEFAULT_PROMPTS: PromptTemplate[] = [
    { id: 'p1', name: '起点热血风', content: '文风要求：节奏紧凑，升级感强，爽点密集。多用短句，少用形容词堆砌。强调主角的意志和行动力，每章结尾必须留有悬念（断章）。', tags: ['style', 'male'] },
    { id: 'p2', name: '番茄脑洞风', content: '文风要求：开篇即高潮，设定要新奇（脑洞大）。对话要接地气，带有一定的幽默感或吐槽役风格。情绪调动要快，反转要多。', tags: ['style', 'viral'] },
    { id: 'p3', name: '晋江细腻风', content: '文风要求：情感细腻，注重心理描写和环境烘托。人物互动要有张力（苏感）。细节描写要唯美，注重氛围感。', tags: ['style', 'female'] },
    { id: 'p4', name: '去AI味/人魔化', content: '禁止使用排比句和翻译腔。多使用口语化表达。增加感官描写（视觉、听觉、嗅觉）。不要过度总结，展示细节而非告知结果。', tags: ['tweak'] }
];

// Context 接口定义
interface AppContextType {
    model: string; // 当前使用的 AI 模型
    setModel: (model: string) => void;

    // Fast 模式
    fastMode: boolean; // 是否启用 Fast 模式
    toggleFastMode: () => void; // 切换 Fast 模式

    // 模型动态配置
    modelConfigs: ModelConfig[];
    updateModelConfig: (id: string, updates: Partial<ModelConfig>) => void;
    resetModelConfigs: () => void;

    showOnboarding: boolean; // 是否显示引导页
    completeOnboarding: () => void;
    resetOnboarding: () => void;
    sources: string[]; // 数据源列表
    toggleSource: (source: string) => void;
    usageStats: GlobalUsageStats; // 全局使用统计

    // 全局身份 (Persona)
    globalPersona: string; // 当前激活的指令
    updateGlobalPersona: (persona: string) => void; // 更新当前激活指令

    // 全局身份库 (Persona Library)
    personaLibrary: PersonaTemplate[];
    addPersona: (p: PersonaTemplate) => void;
    updatePersona: (id: string, p: Partial<PersonaTemplate>) => void;
    deletePersona: (id: string) => void;

    // 业务模块状态
    studioState: StudioGlobalState;
    setStudioState: React.Dispatch<React.SetStateAction<StudioGlobalState>>;
    architectState: ArchitectGlobalState;
    setArchitectState: React.Dispatch<React.SetStateAction<ArchitectGlobalState>>;
    labState: LabGlobalState;
    setLabState: React.Dispatch<React.SetStateAction<LabGlobalState>>;

    // 遗留的直接调用方法 (逐渐迁移至 TaskSystem)
    startLabAnalysis: (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => Promise<void>;
    startArchitectGeneration: (premise: string, lang: string) => Promise<void>;

    // 提示词库管理
    promptLibrary: PromptTemplate[];
    addPrompt: (p: PromptTemplate) => void;
    updatePrompt: (id: string, p: Partial<PromptTemplate>) => void; // 更新提示词
    deletePrompt: (id: string) => void;

    // 任务系统 (核心)
    activeTasks: BackgroundTask[]; // 活跃任务列表
    autoExecute: boolean; // 是否开启自动执行
    toggleAutoExecute: () => void; // 切换自动执行状态
    startBackgroundTask: (type: BackgroundTask['type'], labelKey: string, executionFn: (taskId: string) => Promise<any>) => Promise<void>;
    retryTask: (taskId: string) => void; // 手动重试任务
    pauseTask: (taskId: string) => Promise<void>; // 暂停任务（等待确认）
    resumeTask: (taskId: string) => void; // 恢复任务
    updateTaskProgress: (taskId: string, stage: string, progress: number, logMessage?: string, metrics?: AIMetrics, debugInfo?: BackgroundTask['debugInfo']) => void;
    completeTask: (taskId: string, result: any) => void;
    failTask: (taskId: string, errorMsg: string) => void;
    dismissTask: (taskId: string) => void;
    cancelTask: (taskId: string) => void;
}

// 创建 Context
const AppContext = createContext<AppContextType | null>(null);

/**
 * AppProvider 组件
 * 包裹整个应用，提供状态和逻辑。
 */
export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // --- 基础状态 ---
    // 默认模型改为 Lite
    const [model, setModelState] = useState<string>('gemini-flash-lite-latest');
    const [fastMode, setFastMode] = useState<boolean>(false); // Fast 模式状态
    const [modelConfigs, setModelConfigsState] = useState<ModelConfig[]>(AVAILABLE_MODELS);
    const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
    const [sources, setSources] = useState<string[]>(AVAILABLE_SOURCES);
    const [promptLibrary, setPromptLibrary] = useState<PromptTemplate[]>([]);
    const [usageStats, setUsageStats] = useState<GlobalUsageStats>({ totalTokens: 0, totalRequests: 0, lastReset: Date.now(), modelUsage: {} });
    const [activeTasks, setActiveTasks] = useState<BackgroundTask[]>([]);
    const [autoExecute, setAutoExecute] = useState<boolean>(false); // 新增自动执行状态

    // 任务执行器映射表 (用于重试机制)
    // 使用 useRef 存储函数引用，避免闭包陷阱，同时不触发重渲染
    const taskExecutors = useRef(new Map<string, (taskId: string) => Promise<any>>());

    // 暂停任务的解析器映射表 (taskId -> { resolve, reject })
    // Store both resolve and reject to allow cancellation
    const pausedResolvers = useRef(new Map<string, { resolve: (value: void | PromiseLike<void>) => void, reject: (reason?: any) => void }>());

    // 全局身份状态
    const [globalPersona, setGlobalPersona] = useState<string>('');
    const [personaLibrary, setPersonaLibrary] = useState<PersonaTemplate[]>([]);

    // --- 业务模块状态 ---
    const [studioState, setStudioState] = useState<StudioGlobalState>({ isGenerating: false, progress: 0, remainingTime: 0, generatedContent: '', trendFocus: '', lastUpdated: Date.now() });
    const [architectState, setArchitectState] = useState<ArchitectGlobalState>({ isGenerating: false, progress: 0, remainingTime: 0, premise: '', synopsis: '', coverImage: '', outline: null, activeRecordId: undefined, lastUpdated: Date.now() });
    const [labState, setLabState] = useState<LabGlobalState>({ isAnalyzing: false, progress: 0, remainingTime: 0, inputText: '', mode: 'viral_factors', analysisResult: '', lastUpdated: Date.now() });

    // 使用 Ref 保持模型状态在闭包中的新鲜度
    const modelRef = useRef(model);
    modelRef.current = model;

    // 检查是否跨天，并重置每日统计
    const checkAndResetDailyQuota = (stats: GlobalUsageStats): GlobalUsageStats => {
        const last = new Date(stats.lastReset);
        const now = new Date();
        // 如果日期不同（年、月、日任意不同），则重置
        if (last.getDate() !== now.getDate() || last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear()) {
            const resetStats = {
                ...stats,
                lastReset: Date.now(),
                modelUsage: {} // 清空每日计数
            };
            saveToStorage('inkflow_usage_stats', resetStats);
            return resetStats;
        }
        return stats;
    }

    // --- 初始化加载 ---
    useEffect(() => {
        // 检查是否已完成引导
        const hasSeen = localStorage.getItem('inkflow_onboarding_seen');
        if (!hasSeen) setShowOnboarding(true);

        // 加载设置
        const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS);
        if (savedSettings) {
            if (savedSettings.model) setModelState(savedSettings.model);
            if (savedSettings.sources) setSources(savedSettings.sources);
            if (savedSettings.fastMode !== undefined) setFastMode(savedSettings.fastMode);
        }

        // 加载自定义模型配置
        const savedModelConfigs = loadFromStorage(STORAGE_KEYS.MODEL_CONFIGS);
        if (savedModelConfigs && savedModelConfigs.length > 0) {
            // 合并逻辑：确保新代码中增加的模型也能显示，同时保留用户对旧模型的修改
            const mergedConfigs = AVAILABLE_MODELS.map(defaultModel => {
                const saved = savedModelConfigs.find((s: ModelConfig) => s.id === defaultModel.id);
                return saved ? { ...defaultModel, ...saved } : defaultModel;
            });
            setModelConfigsState(mergedConfigs);
        } else {
            setModelConfigsState(AVAILABLE_MODELS);
        }

        // 加载全局身份，如果为空则使用默认值
        const savedPersona = loadFromStorage(STORAGE_KEYS.GLOBAL_PERSONA);
        if (savedPersona) {
            setGlobalPersona(savedPersona);
        } else {
            // 默认根据当前语言设置初始值
            const defaultPersona = savedSettings?.lang === 'en' ? DEFAULT_PERSONA_EN : DEFAULT_PERSONA_ZH;
            setGlobalPersona(defaultPersona);
        }

        // 加载身份库
        const savedPersonaLib = loadFromStorage(STORAGE_KEYS.PERSONA_LIB);
        if (savedPersonaLib && savedPersonaLib.length > 0) {
            setPersonaLibrary(savedPersonaLib);
        } else {
            setPersonaLibrary(DEFAULT_PERSONA_TEMPLATES);
            saveToStorage(STORAGE_KEYS.PERSONA_LIB, DEFAULT_PERSONA_TEMPLATES);
        }

        // 加载统计并检查重置
        const savedUsage = loadFromStorage('inkflow_usage_stats');
        if (savedUsage) {
            setUsageStats(checkAndResetDailyQuota(savedUsage));
        }

        // 加载提示词库
        const savedPrompts = loadFromStorage(STORAGE_KEYS.PROMPT_LIB);
        if (savedPrompts && savedPrompts.length > 0) setPromptLibrary(savedPrompts);
        else {
            // 初始化默认提示词
            setPromptLibrary(DEFAULT_PROMPTS);
            saveToStorage(STORAGE_KEYS.PROMPT_LIB, DEFAULT_PROMPTS);
        }

        // 加载任务历史
        const savedTasks = loadFromStorage(STORAGE_KEYS.HISTORY_TASKS);
        if (savedTasks && Array.isArray(savedTasks)) {
            setActiveTasks(savedTasks);
        }

        // 恢复工作室状态
        const savedStudio = loadFromStorage(STORAGE_KEYS.STUDIO);
        if (savedStudio && !studioState.isGenerating) {
            setStudioState(prev => ({ ...prev, trendFocus: savedStudio.trendFocus || '', generatedContent: savedStudio.generatedContent || '' }));
        }

        // 恢复架构师状态
        const savedArchitect = loadFromStorage(STORAGE_KEYS.ARCHITECT);
        if (savedArchitect && !architectState.isGenerating) {
            setArchitectState(prev => ({ ...prev, premise: savedArchitect.premise || '', synopsis: savedArchitect.synopsis || '', coverImage: savedArchitect.coverImage || '', outline: savedArchitect.outline || null, activeRecordId: savedArchitect.activeRecordId }));
        }
    }, []);

    // --- 持久化任务列表 ---
    useEffect(() => {
        // 限制存储的任务数量，避免无限增长，只保留最近 50 条
        if (activeTasks.length > 0) {
            // 只在有数据时保存，防止初始化前的空数组覆盖
            const tasksToSave = activeTasks.length > 50 ? activeTasks.slice(activeTasks.length - 50) : activeTasks;
            saveToStorage(STORAGE_KEYS.HISTORY_TASKS, tasksToSave);
        }
    }, [activeTasks]);

    // --- 设置操作 ---

    const setModel = (newModel: string) => {
        setModelState(newModel);
        const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
        saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, model: newModel, sources });
    }

    const toggleSource = (source: string) => {
        setSources(prev => {
            const newSources = prev.includes(source) ? prev.filter(s => s !== source) : [...prev, source];
            saveToStorage(STORAGE_KEYS.SETTINGS, { ...loadFromStorage(STORAGE_KEYS.SETTINGS), model, sources: newSources });
            return newSources;
        });
    }

    const toggleFastMode = () => {
        setFastMode(prev => {
            const newFastMode = !prev;
            const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
            saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, fastMode: newFastMode });
            console.log(`[FastMode] 切换到: ${newFastMode ? 'Fast 模式' : '正常模式'}`);
            return newFastMode;
        });
    }

    // 更新模型配置
    const updateModelConfig = (id: string, updates: Partial<ModelConfig>) => {
        setModelConfigsState(prev => {
            const newConfigs = prev.map(config =>
                config.id === id ? { ...config, ...updates } : config
            );
            saveToStorage(STORAGE_KEYS.MODEL_CONFIGS, newConfigs);
            return newConfigs;
        });
    }

    // 重置模型配置
    const resetModelConfigs = () => {
        setModelConfigsState(AVAILABLE_MODELS);
        saveToStorage(STORAGE_KEYS.MODEL_CONFIGS, []); // 清空本地存储的自定义配置
    }

    // 更新当前激活的全局身份
    const updateGlobalPersona = (persona: string) => {
        setGlobalPersona(persona);
        saveToStorage(STORAGE_KEYS.GLOBAL_PERSONA, persona);
    }

    // --- 身份库 CRUD ---
    const addPersona = (p: PersonaTemplate) => {
        const newLib = [...personaLibrary, p];
        setPersonaLibrary(newLib);
        saveToStorage(STORAGE_KEYS.PERSONA_LIB, newLib);
    }

    const updatePersona = (id: string, updates: Partial<PersonaTemplate>) => {
        const newLib = personaLibrary.map(p => p.id === id ? { ...p, ...updates } : p);
        setPersonaLibrary(newLib);
        saveToStorage(STORAGE_KEYS.PERSONA_LIB, newLib);
    }

    const deletePersona = (id: string) => {
        const newLib = personaLibrary.filter(p => p.id !== id);
        setPersonaLibrary(newLib);
        saveToStorage(STORAGE_KEYS.PERSONA_LIB, newLib);
    }

    // --- 提示词库操作 ---

    const addPrompt = (p: PromptTemplate) => {
        const newLib = [...promptLibrary, p];
        setPromptLibrary(newLib);
        saveToStorage(STORAGE_KEYS.PROMPT_LIB, newLib);
    }

    const updatePrompt = (id: string, updates: Partial<PromptTemplate>) => {
        const newLib = promptLibrary.map(p => p.id === id ? { ...p, ...updates } : p);
        setPromptLibrary(newLib);
        saveToStorage(STORAGE_KEYS.PROMPT_LIB, newLib);
    }

    const deletePrompt = (id: string) => {
        const newLib = promptLibrary.filter(p => p.id !== id);
        setPromptLibrary(newLib);
        saveToStorage(STORAGE_KEYS.PROMPT_LIB, newLib);
    }

    // --- 引导页操作 ---

    const completeOnboarding = () => {
        localStorage.setItem('inkflow_onboarding_seen', 'true');
        setShowOnboarding(false);
    };

    const resetOnboarding = () => setShowOnboarding(true);

    // --- 任务系统逻辑 ---

    /**
     * 启动后台任务
     * 创建任务记录，并执行异步函数。
     */
    const startBackgroundTask = async (type: BackgroundTask['type'], labelKey: string, executionFn: (taskId: string) => Promise<any>) => {
        const taskId = Date.now().toString();

        // 存储执行函数以便重试
        taskExecutors.current.set(taskId, executionFn);

        const newTask: BackgroundTask = { id: taskId, type, labelKey, status: 'running', progress: 0, currentStage: labelKey, logs: [{ timestamp: Date.now(), message: 'Task Initialized' }], startTime: Date.now() };
        setActiveTasks(prev => [...prev, newTask]);

        try {
            const result = await executionFn(taskId);
            // 任务成功完成
            setActiveTasks(currentTasks => {
                const task = currentTasks.find(t => t.id === taskId);
                if (task && task.status === 'cancelled') return currentTasks; // 如果已被取消，忽略结果
                return currentTasks.map(t => t.id !== taskId ? t : { ...t, status: 'completed', progress: 100, currentStage: 'Done', logs: [...t.logs, { timestamp: Date.now(), message: 'Success' }], endTime: Date.now(), result });
            });
        } catch (e: any) {
            // Check for explicit cancellation error
            if (e.message === "Task Cancelled") {
                // State is already updated by cancelTask, just return
                return;
            }

            // 任务失败
            setActiveTasks(currentTasks => {
                const task = currentTasks.find(t => t.id === taskId);
                if (task && task.status === 'cancelled') return currentTasks;
                return currentTasks.map(t => t.id !== taskId ? t : { ...t, status: 'error', currentStage: 'Failed', logs: [...t.logs, { timestamp: Date.now(), message: `Error: ${e.message}` }], endTime: Date.now() });
            });
        }
    };

    /**
     * 手动重试任务
     * 根据 ID 查找原始执行函数并重新运行
     */
    const retryTask = async (taskId: string) => {
        const executor = taskExecutors.current.get(taskId);
        if (!executor) {
            console.error(`No executor found for task ${taskId}`);
            return;
        }

        // 重置任务状态
        updateTaskProgress(taskId, 'Retrying...', 0, 'Task restarted manually');
        setActiveTasks(prev => prev.map(t => t.id === taskId ? {
            ...t,
            status: 'running',
            startTime: Date.now(), // 更新开始时间
            endTime: undefined,
            result: undefined,
            logs: [...t.logs, { timestamp: Date.now(), message: '--- Retry Started ---' }]
        } : t));

        try {
            const result = await executor(taskId);
            completeTask(taskId, result);
        } catch (e: any) {
            if (e.message === "Task Cancelled") return;
            failTask(taskId, e.message);
        }
    };

    /**
     * 暂停任务 (Await Approval)
     * 将任务状态设为 paused，并返回一个 pending promise，直到 resumeTask 被调用。
     * 如果 autoExecute 开启，则短暂等待后自动继续。
     */
    const pauseTask = (taskId: string): Promise<void> => {
        return new Promise<void>((resolve, reject) => {
            if (autoExecute) {
                // 自动执行模式：添加日志并自动 Resolve
                setActiveTasks(prev => prev.map(t => t.id === taskId ? {
                    ...t,
                    logs: [...t.logs, { timestamp: Date.now(), message: 'Auto-executing (Skipping pause)...' }]
                } : t));
                // 短暂延迟以让 UI 有机会渲染进度条变化
                setTimeout(resolve, 800);
                return;
            }

            // 存储 resolve 和 reject 函数
            pausedResolvers.current.set(taskId, { resolve, reject });

            // 更新任务状态为 paused
            setActiveTasks(prev => prev.map(t => t.id === taskId ? {
                ...t,
                status: 'paused',
                currentStage: 'Paused (Waiting for User)',
                logs: [...t.logs, { timestamp: Date.now(), message: 'Task paused. Waiting for manual approval.' }]
            } : t));
        });
    };

    /**
     * 恢复任务
     * 调用存储的 resolve 函数，解除 await 阻塞。
     */
    const resumeTask = (taskId: string) => {
        const resolver = pausedResolvers.current.get(taskId);
        if (resolver) {
            resolver.resolve(); // 解除 Promise 阻塞
            pausedResolvers.current.delete(taskId);

            // 更新状态回 running
            setActiveTasks(prev => prev.map(t => t.id === taskId ? {
                ...t,
                status: 'running',
                currentStage: 'Resuming...',
                logs: [...t.logs, { timestamp: Date.now(), message: 'Task resumed by user.' }]
            } : t));
        }
    };

    const toggleAutoExecute = () => {
        setAutoExecute(prev => !prev);
    }

    /**
     * 更新任务进度
     * 包含日志记录、指标统计和调试信息更新。
     */
    const updateTaskProgress = (taskId: string, stage: string, progress: number, logMessage?: string, metrics?: AIMetrics, debugInfo?: BackgroundTask['debugInfo']) => {
        // 如果有指标数据，更新全局统计
        if (metrics) {
            setUsageStats(prev => {
                // 先执行每日重置检查
                const stats = checkAndResetDailyQuota(prev);

                const modelKey = metrics.model || 'unknown';
                const safeModelUsage = stats.modelUsage || {};
                // 注意：这里我们累加 today 的 usage
                const currentModelStats = safeModelUsage[modelKey] || { requests: 0, tokens: 0 };

                const newStats = {
                    ...stats,
                    totalTokens: (stats.totalTokens || 0) + (metrics.totalTokens || 0),
                    totalRequests: (stats.totalRequests || 0) + 1,
                    modelUsage: {
                        ...safeModelUsage,
                        [modelKey]: {
                            requests: currentModelStats.requests + 1,
                            tokens: currentModelStats.tokens + metrics.totalTokens
                        }
                    }
                };
                saveToStorage('inkflow_usage_stats', newStats);
                return newStats;
            });
        }

        setActiveTasks(prev => prev.map(task => {
            if (task.id !== taskId || task.status === 'cancelled') return task;

            // 累加指标
            let newMetrics = task.metrics;
            if (metrics) {
                newMetrics = {
                    model: metrics.model,
                    inputTokens: (task.metrics?.inputTokens || 0) + metrics.inputTokens,
                    outputTokens: (task.metrics?.outputTokens || 0) + metrics.outputTokens,
                    totalTokens: (task.metrics?.totalTokens || 0) + metrics.totalTokens,
                    latency: (task.metrics?.latency || 0) + metrics.latency
                };
            }

            const updatedLogs = logMessage ? [...task.logs, { timestamp: Date.now(), message: logMessage }] : task.logs;
            // 合并调试信息
            const updatedDebugInfo = debugInfo ? { ...task.debugInfo, ...debugInfo } : task.debugInfo;
            return { ...task, currentStage: stage, progress, logs: updatedLogs, metrics: newMetrics, debugInfo: updatedDebugInfo };
        }));
    };

    const completeTask = (taskId: string, result: any) => {
        setActiveTasks(prev => prev.map(task => task.id !== taskId ? task : { ...task, status: 'completed', progress: 100, currentStage: 'Done', endTime: Date.now(), result }));
    };

    const failTask = (taskId: string, errorMsg: string) => {
        setActiveTasks(prev => prev.map(task => task.id !== taskId ? task : { ...task, status: 'error', currentStage: 'Failed', logs: [...task.logs, { timestamp: Date.now(), message: `Error: ${errorMsg}` }], endTime: Date.now() }));
    };

    const cancelTask = (taskId: string) => {
        // 1. If it's paused awaiting resume, reject it to break the async flow
        const resolver = pausedResolvers.current.get(taskId);
        if (resolver) {
            resolver.reject(new Error("Task Cancelled"));
            pausedResolvers.current.delete(taskId);
        }

        // 2. Update status
        setActiveTasks(prev => prev.map(task => task.id !== taskId || task.status === 'completed' ? task : {
            ...task,
            status: 'cancelled',
            currentStage: 'Cancelled',
            logs: [...task.logs, { timestamp: Date.now(), message: 'Cancelled by user' }],
            endTime: Date.now()
        }));
    };

    const dismissTask = (taskId: string) => {
        // 移除执行器引用以释放内存
        taskExecutors.current.delete(taskId);
        pausedResolvers.current.delete(taskId);
        setActiveTasks(prev => prev.filter(t => t.id !== taskId));
    };

    // --- 遗留 API (兼容旧组件，未来应迁移到 startBackgroundTask) ---

    const startArchitectGeneration = async (premise: string, lang: string) => {
        if (architectState.isGenerating) return;
        setArchitectState(prev => ({ ...prev, isGenerating: true, progress: 1, remainingTime: 30, premise, outline: null, activeRecordId: undefined, generationStage: '启动中...' }));
        try {
            // 调用服务
            const result = await generateNovelArchitecture(premise, lang, modelRef.current, globalPersona, (stage, percent) => setArchitectState(prev => ({ ...prev, generationStage: stage, progress: percent })));

            // 组合结果为树根
            const combinedRoot: any = { id: Date.now().toString(), name: "故事大纲", type: "book", description: result.synopsis, children: [result.world, result.character, result.system, result.structure, result.chapters] };
            const newId = Date.now().toString();

            // 更新状态
            setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 100, remainingTime: 0, outline: combinedRoot, synopsis: result.synopsis, coverImage: '', activeRecordId: newId, lastUpdated: Date.now() }));
            // 保存历史
            addHistoryItem(STORAGE_KEYS.HISTORY_ARCHITECT, { id: newId, timestamp: Date.now(), premise, synopsis: result.synopsis, outline: combinedRoot });
        } catch (error: any) {
            setArchitectState(prev => ({ ...prev, isGenerating: false, progress: 0, remainingTime: 0, outline: null }));
        }
    };

    const startLabAnalysis = async (text: string, mode: 'viral_factors' | 'pacing' | 'characters', lang: string) => {
        if (labState.isAnalyzing) return;
        setLabState(prev => ({ ...prev, isAnalyzing: true, progress: 5, remainingTime: 20, inputText: text, mode, analysisResult: '' }));
        // 模拟进度条 (因为分析没有流式回调)
        const timer = setInterval(() => setLabState(prev => (!prev.isAnalyzing ? (clearInterval(timer), prev) : { ...prev, progress: Math.min(prev.progress + 3, 98), remainingTime: Math.max(1, prev.remainingTime - 1) })), 1000);
        try {
            const result = await analyzeText(text, mode, lang, modelRef.current, globalPersona);
            clearInterval(timer);
            setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 100, remainingTime: 0, analysisResult: result, lastUpdated: Date.now() }));
            addHistoryItem(STORAGE_KEYS.HISTORY_LAB, { id: Date.now().toString(), timestamp: Date.now(), inputText: text, mode, analysis: result, snippet: text.substring(0, 60) + '...' });
        } catch (error: any) {
            clearInterval(timer);
            setLabState(prev => ({ ...prev, isAnalyzing: false, progress: 0, remainingTime: 0, analysisResult: "分析失败" }));
        }
    };

    return (
        <AppContext.Provider value={{
            model, setModel, fastMode, toggleFastMode, modelConfigs, updateModelConfig, resetModelConfigs,
            showOnboarding, completeOnboarding, resetOnboarding, sources, toggleSource,
            usageStats, studioState, setStudioState, architectState, setArchitectState, startArchitectGeneration, labState, setLabState, startLabAnalysis,
            promptLibrary, addPrompt, updatePrompt, deletePrompt, activeTasks, startBackgroundTask, retryTask, pauseTask, resumeTask, updateTaskProgress, completeTask, failTask, dismissTask, cancelTask,
            globalPersona, updateGlobalPersona, personaLibrary, addPersona, updatePersona, deletePersona,
            autoExecute, toggleAutoExecute
        }}>
            {children}
        </AppContext.Provider>
    );
};

// Hook
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within an AppProvider');
    return context;
};
