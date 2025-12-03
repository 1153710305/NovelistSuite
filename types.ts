

/**
 * @file types.ts
 * @description InkFlow AI 应用程序的中央类型定义文件 (数据字典)。
 * 
 * ## 作用
 * - 定义全站通用的数据结构接口。
 * - 确保 TypeScript 类型安全。
 * - 作为数据模型参考文档。
 * 
 * ## 核心模型
 * - **StudioRecord**: 代表一个完整的写作项目（包括正文、大纲、设置）。
 * - **OutlineNode**: 递归树结构，用于实现思维导图和大纲。
 * - **BackgroundTask**: 异步任务系统的核心状态对象。
 */

// --- 基础枚举 ---

// 小说平台枚举
export enum NovelPlatform {
    QIDIAN = 'Qidian',   // 起点中文网
    JINJIANG = 'Jinjiang', // 晋江文学城
    FANQIE = 'Fanqie'    // 番茄小说
}

// 模拟的市场小说数据结构
export interface Novel {
    id: string;          // 小说唯一ID
    title: string;       // 书名
    author: string;      // 作者名
    category: string;    // 分类 (如：玄幻、都市)
    hotScore: number;    // 热度值
    platform: NovelPlatform; // 所属平台
    summary: string;     // 简介摘要
}

// 简单的故事生成结果 (用于灵感卡片)
export interface GeneratedStory {
    title: string;       // 标题
    genre: string;       // 流派
    synopsis: string;    // 简介
    hook: string;        // 钩子/看点
}

// --- 核心结构：递归大纲节点 ---
// 用于思维导图 (MindMap) 和层级大纲 (Architect) 的核心数据结构
export interface OutlineNode {
    id?: string;        // 节点的唯一标识符 (UUID)
    name: string;       // 节点名称 (如章节名、角色名)
    // 节点类型：书、卷、幕、章、景、角色、设定、体系、物品、事件
    type: 'book' | 'volume' | 'act' | 'chapter' | 'scene' | 'character' | 'setting' | 'system' | 'item' | 'event';
    description?: string; // 节点的描述或概要
    content?: string;   // 节点对应的正文内容 (主要用于章节/场景节点)
    children?: OutlineNode[]; // 子节点列表 (实现递归树结构)
    embedding?: number[]; // [New] 向量化数据，用于 RAG 检索 (Web-LLM Local Vector Store)
}

// 提示词模板接口
export interface PromptTemplate {
    id: string;       // 模板ID
    name: string;     // 模板名称 (如 "赛博修仙风")
    content: string;  // 系统指令或风格包装器内容 (Prompt)
    tags: string[];   // 标签，如 'style', 'male', 'female', 'tweak'
}

// 全局身份模板接口 (新增)
export interface PersonaTemplate {
    id: string;       // 身份ID
    name: string;     // 身份名称 (如 "资深主编")
    description: string; // 简短描述
    content: string;  // 具体的 System Instruction 内容
    isDefault?: boolean; // 是否为系统预设
}

// 封面生成记录
export interface CoverRecord {
    id: string;           // 记录ID
    timestamp: number;    // 生成时间戳
    prompt: string;       // 用户输入的提示词
    style: string;        // 艺术风格
    model: string;        // 使用的模型
    imageBase64: string;  // Base64 格式的图片数据
}

// 写作模式枚举 (用于 AI 工具栏)
export enum WritingMode {
    DAILY_SHORTS = 'daily_shorts', // 每日短篇生成
    CONTINUE = 'continue',         // 续写模式
    REWRITE = 'rewrite',           // 重写模式
    POLISH = 'polish'              // 润色模式
}

// 可用的数据源平台列表 (用于趋势分析)
export const AVAILABLE_SOURCES = [
    'douyin', 'kuaishou', 'bilibili', 'baidu', 'weibo',
    'xiaohongshu', 'fanqie', 'qidian', 'jinjiang', 'zhihu'
];

// 图像生成模型枚举
export enum ImageModel {
    IMAGEN = 'imagen-4.0-generate-001', // 高质量生成模型
    GEMINI_FLASH_IMAGE = 'gemini-2.5-flash-image' // 快速生成模型
}

// 嵌入模型枚举 (用于 RAG)
export enum EmbeddingModel {
    TEXT_EMBEDDING_004 = 'text-embedding-004',
    EMBEDDING_001 = 'embedding-001',
    LOCAL_MINILM = 'local-minilm' // [New] 本地开源模型
}

// --- 聊天模块类型 ---
export interface ChatMessage {
    role: 'user' | 'model'; // 发送者角色
    text: string;           // 消息内容
    timestamp: number;      // 发送时间
}

export interface ChatSession {
    id: string;             // 会话ID
    title: string;          // 会话标题 (通常取第一句)
    messages: ChatMessage[]; // 消息历史列表
    model: string;          // 会话使用的模型
    timestamp: number;      // 最后更新时间
}

// --- 任务监控类型 ---
// 用于 TaskMonitor 组件显示后台进度
export interface TaskLog {
    timestamp: number;      // 日志时间
    message: string;        // 日志信息
    detail?: string;        // 详细信息 (可选)
}

// AI 性能指标 (用于监控 Token 消耗和延迟)
export interface AIMetrics {
    model: string;          // 使用的模型
    inputTokens: number;    // 输入 Token 数
    outputTokens: number;   // 输出 Token 数
    totalTokens: number;    // 总 Token 数
    latency: number;        // 延迟 (毫秒)
}

// 后台任务对象 (用于 TaskMonitor 和 AppContext)
export interface BackgroundTask {
    id: string;             // 任务唯一ID
    type: 'inspiration' | 'story' | 'map_regen' | 'draft'; // 任务类型
    labelKey?: string;      // 用于 UI 显示的国际化 Key
    status: 'running' | 'completed' | 'error' | 'cancelled' | 'paused'; // 任务状态 (Added paused)
    progress: number;       // 进度百分比 (0 - 100)
    currentStage: string;   // 当前执行阶段描述 (如："正在分析提示词...")
    logs: TaskLog[];        // 执行日志流
    metrics?: AIMetrics;    // AI 消耗统计
    startTime: number;      // 开始时间
    endTime?: number;       // 结束时间
    result?: any;           // 任务结果暂存
    // 调试信息：用于在前端展示生成背后的逻辑
    debugInfo?: {
        prompt?: string;            // 实际使用的提示词
        context?: string;           // 注入的上下文
        model?: string;             // 使用的模型
        systemInstruction?: string; // 使用的系统设定/身份
        sourceData?: any;           // 原始参考数据 (如爬取的榜单列表)
        // [New] 优化前后的对比数据
        comparison?: {
            originalContext?: string;
            optimizedContext?: string;
            originalPrompt?: string;
            optimizedPrompt?: string;
            systemInstruction?: string;
        };
        // [New] 真实发送给 API 的 Payload (Request/Response)
        apiPayload?: {
            request: string;
            response: string;
        };
    };
}

// --- 全局配置与状态 ---

// 模型配置接口
export interface ModelConfig {
    id: string;             // 模型 ID
    nameKey: string;        // i18n 名称 Key
    descKey: string;        // i18n 描述 Key
    dailyLimit: number;     // 每日建议请求上限 (RPD)
    rpm: number;            // 每分钟请求上限 (RPM)
    contextWindow: number;  // 上下文窗口大小 (Tokens)
}

// 可用模型列表配置
// 注意：限制基于各平台免费层级估算，实际以官方文档为准
export const AVAILABLE_MODELS: ModelConfig[] = [
    // === Google Gemini 系列 ===
    {
        id: 'gemini-flash-lite-latest',
        nameKey: 'models.lite',
        descKey: 'models.descLite',
        dailyLimit: 1500,
        rpm: 15,
        contextWindow: 1048576
    },
    {
        id: 'gemini-2.5-flash',
        nameKey: 'models.flash',
        descKey: 'models.descFlash',
        dailyLimit: 1500,
        rpm: 15,
        contextWindow: 1048576
    },
    {
        id: 'gemini-2.5-pro',
        nameKey: 'models.gemini25pro',
        descKey: 'models.descGemini25Pro',
        dailyLimit: 100,
        rpm: 5,
        contextWindow: 2097152
    },
    {
        id: 'gemini-3-pro-preview',
        nameKey: 'models.pro',
        descKey: 'models.descPro',
        dailyLimit: 50,
        rpm: 2,
        contextWindow: 2097152
    },
    {
        id: 'gemini-2.0-flash-exp',
        nameKey: 'models.gemini20flash',
        descKey: 'models.descGemini20Flash',
        dailyLimit: 1500,
        rpm: 15,
        contextWindow: 1048576
    },

    // === 阿里千问系列 ===
    {
        id: 'qwen-turbo',
        nameKey: 'models.qwenTurbo',
        descKey: 'models.descQwenTurbo',
        dailyLimit: 1000,
        rpm: 10,
        contextWindow: 8192
    },
    {
        id: 'qwen-plus',
        nameKey: 'models.qwenPlus',
        descKey: 'models.descQwenPlus',
        dailyLimit: 500,
        rpm: 5,
        contextWindow: 32768
    },
    {
        id: 'qwen-max',
        nameKey: 'models.qwenMax',
        descKey: 'models.descQwenMax',
        dailyLimit: 100,
        rpm: 2,
        contextWindow: 32768
    },

    // === 字节豆包系列 ===
    {
        id: 'doubao-lite-4k',
        nameKey: 'models.doubaoLite',
        descKey: 'models.descDoubaoLite',
        dailyLimit: 1000,
        rpm: 10,
        contextWindow: 4096
    },
    {
        id: 'doubao-pro-32k',
        nameKey: 'models.doubaoPro',
        descKey: 'models.descDoubaoPro',
        dailyLimit: 500,
        rpm: 5,
        contextWindow: 32768
    }
];

// 单个模型的使用统计
export interface ModelUsageStats {
    requests: number; // 请求次数
    tokens: number;   // Token 消耗
}

// 全局使用统计 (用于限额展示)
export interface GlobalUsageStats {
    totalTokens: number;    // 总 Token 消耗 (历史累计)
    totalRequests: number;  // 总请求数 (历史累计)
    lastReset: number;      // 上次重置时间 (用于每日额度重置)
    modelUsage: Record<string, ModelUsageStats>; // 按模型分类统计 (今日)
}

// Studio (工作室) 全局状态 - 遗留状态，逐步迁移至 TaskSystem
export interface StudioGlobalState {
    isGenerating: boolean;    // 是否正在生成
    progress: number;         // 进度 (0-100)
    remainingTime: number;    // 剩余时间预估 (秒)
    generatedContent: string; // 生成的灵感 JSON 字符串
    trendFocus: string;       // 当前关注的趋势关键词
    lastUpdated: number;      // 最后更新时间
}

// Architect (架构师) 全局状态
export interface ArchitectGlobalState {
    isGenerating: boolean;    // 是否正在生成
    generationStage?: string; // 生成阶段描述
    progress: number;         // 进度
    remainingTime: number;    // 剩余时间
    premise: string;          // 核心脑洞/前提
    synopsis: string;         // 故事简介
    coverImage: string;       // 封面图片 Base64
    outline: OutlineNode | null; // 核心大纲树
    activeRecordId?: string;  // 当前关联的数据库记录 ID
    lastUpdated: number;      // 最后更新时间
}

// Lab (实验室) 全局状态
export interface LabGlobalState {
    isAnalyzing: boolean;     // 是否正在分析
    progress: number;         // 进度
    remainingTime: number;    // 剩余时间
    inputText: string;        // 输入的文本或链接
    mode: 'viral_factors' | 'pacing' | 'characters'; // 分析模式
    analysisResult: string;   // markdown 格式的分析报告
    lastUpdated: number;      // 最后更新时间
}

// --- 生成配置 ---

export interface GenerationConfig {
    type: 'short' | 'long'; // 短篇 vs 长篇连载
    wordCount?: number;     // 目标字数
    chapterCount?: number;  // 预计章节数
    wordsPerChapter?: number; // 每章字数
    styleId?: string;       // 选用的提示词模板 ID
}

// 上下文生成配置 (Context Control)
export interface ContextConfig {
    includePrevChapter: boolean; // 是否包含上一章
    previousChapterId?: string;  // 指定上一章的来源 ID (Manual or Auto Node ID)
    nextChapterId?: string;      // 指定下一章节点的 ID (manual selection)
    selectedMaps: string[];      // 选中的导图 Key (world, character...)
    limitMode: 'auto' | 'manual'; // 限制模式
    manualLimit: number;         // 手动限制字符数
    enableRAG?: boolean;         // 是否启用 RAG 检索增强
    ragThreshold?: number;       // [New] RAG 相似度阈值 (0.0 - 1.0)
    embeddingModel?: string;     // [New] 嵌入模型选择
    prevContextLength?: number;  // [New] 上一章上下文引用长度 (500/1000/1500/2000)
}

// --- 历史记录数据模型 ---

// 基础历史记录接口
export interface BaseHistoryRecord {
    id: string;       // 唯一 ID
    timestamp: number;// 创建时间戳
}

// 实验室分析记录
export interface LabRecord extends BaseHistoryRecord {
    inputText: string; // 输入内容
    mode: 'viral_factors' | 'pacing' | 'characters'; // 分析模式
    analysis: string;  // 分析结果
    snippet: string;   // 用于列表展示的文本摘要
}

// 灵感元数据 (Web Novel Metas) - 网文特有属性
export interface InspirationMetadata {
    source: string;        // 来源平台
    gender: string;        // 目标受众 (男频/女频)
    majorCategory: string; // 大类 (如: 玄幻)
    theme?: string;        // 题材 (如: 官场, 衍生)
    characterArchetype?: string; // 角色原型 (如: 赘婿)
    plotType?: string;     // 情节类型
    trope: string;         // 核心梗
    coolPoint?: string;    // 爽点
    burstPoint?: string;   // 爆点
    goldenFinger?: string; // 金手指 (Cheat)
    coolSystem?: string;   // 体系
    memoryAnchor?: string; // 记忆锚点 (标志性物品)
}

// 8-图架构体系映射 (8-Map System)
export type ArchitectureMap = {
    synopsis?: string;        // 故事简介
    world: OutlineNode;       // 世界观设定
    system: OutlineNode;      // 力量/升级体系
    mission: OutlineNode;     // 任务档案
    character: OutlineNode;   // 角色关系网络
    anchor: OutlineNode;      // 剧情锚点/伏笔
    structure: OutlineNode;   // 宏观结构 (卷/幕)
    events: OutlineNode;      // 大事件时间轴
    chapters: OutlineNode;    // 章节细纲
}

// 工作室项目记录 (最核心的数据结构)
export interface StudioRecord extends BaseHistoryRecord {
    recordType: 'inspiration' | 'story'; // 记录类型
    title?: string;        // 标题
    storyType?: 'short' | 'long'; // 篇幅类型
    config?: GenerationConfig; // 生成配置

    // 灵感类型特有字段:
    trendFocus?: string;   // 趋势焦点
    sources?: string[];    // 数据来源
    metadata?: InspirationMetadata; // 灵感元数据

    // 故事类型特有字段:
    content: string; // 全文内容或摘要
    chapters?: {
        id?: string; // [Update] 章节唯一ID，用于引用
        title: string;
        content: string;
        nodeId?: string; // 关联的导图节点ID
    }[]; // 已生成的章节列表

    // 核心架构 (8-Map)
    architecture?: ArchitectureMap;

    // 遗留兼容字段
    outline?: OutlineNode;
}

// 架构师模块记录
export interface ArchitectRecord extends BaseHistoryRecord {
    premise: string;      // 前提
    synopsis: string;     // 简介
    coverImage?: string;  // 封面
    outline: OutlineNode; // 大纲树
}

// --- 日志类型 ---

export enum LogLevel {
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

export interface LogEntry {
    id: string;         // 日志 ID
    sessionId: string;  // 会话 ID
    timestamp: number;  // 时间戳
    level: LogLevel;    // 日志级别
    category: string;   // 分类
    message: string;    // 消息
    data?: any;         // 附加数据
}