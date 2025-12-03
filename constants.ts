/**
 * @file constants.ts
 * @description 项目常量统一管理中心
 * 
 * 本文件集中管理所有固定文字、UI文案、提示信息等常量
 * 便于维护和国际化扩展
 */

// ==================== UI 文案常量 ====================

/** 通用按钮文案 */
export const BUTTON_TEXT = {
    CONFIRM: '确认',
    CANCEL: '取消',
    SAVE: '保存',
    DELETE: '删除',
    EDIT: '编辑',
    ADD: '添加',
    REFRESH: '刷新',
    EXPORT: '导出',
    IMPORT: '导入',
    ANALYZE: '分析',
    GENERATE: '生成',
    REGENERATE: '重新生成',
    CONTINUE: '续写',
    REWRITE: '重写',
    POLISH: '润色',
    CLOSE: '关闭',
    SUBMIT: '提交',
    RESET: '重置'
} as const;

/** 状态文案 */
export const STATUS_TEXT = {
    LOADING: '加载中...',
    PROCESSING: '处理中...',
    ANALYZING: '分析中...',
    GENERATING: '生成中...',
    COMPLETED: '已完成',
    FAILED: '失败',
    WAITING: '等待中',
    PAUSED: '已暂停',
    CANCELLED: '已取消'
} as const;

/** 提示信息 */
export const TOAST_MESSAGE = {
    SAVE_SUCCESS: '保存成功',
    SAVE_FAILED: '保存失败',
    DELETE_SUCCESS: '删除成功',
    DELETE_FAILED: '删除失败',
    COPY_SUCCESS: '复制成功',
    EXPORT_SUCCESS: '导出成功',
    IMPORT_SUCCESS: '导入成功',
    IMPORT_FAILED: '导入失败,格式错误',
    NETWORK_ERROR: '网络错误,请检查连接',
    API_ERROR: 'API调用失败',
    INVALID_INPUT: '输入内容无效',
    OPERATION_CANCELLED: '操作已取消'
} as const;

/** 确认对话框文案 */
export const CONFIRM_MESSAGE = {
    DELETE_ITEM: '确定删除此项目?',
    DELETE_CHAPTER: '确定删除此章节?',
    CLEAR_HISTORY: '确定清空历史记录?',
    RESET_MAP: '确定清空当前导图?',
    OVERWRITE_FILE: '文件已存在,确定覆盖?',
    CANCEL_TASK: '确定取消当前任务?'
} as const;

/** 占位符文案 */
export const PLACEHOLDER_TEXT = {
    ENTER_TITLE: '请输入标题',
    ENTER_CONTENT: '请输入内容',
    ENTER_URL: '请输入URL',
    ENTER_KEYWORD: '请输入关键词',
    SELECT_OPTION: '请选择',
    NO_DATA: '暂无数据',
    NO_HISTORY: '暂无历史记录',
    EMPTY_STATE: '点击开始创作',
    CLICK_TO_EDIT: '点击编辑以添加详情...'
} as const;

// ==================== 业务常量 ====================

/** 平台名称映射 */
export const PLATFORM_NAMES = {
    qidian: '起点中文网',
    fanqie: '番茄小说',
    jinjiang: '晋江文学城'
} as const;

/** 受众类型 */
export const AUDIENCE_TYPE = {
    male: '男频',
    female: '女频'
} as const;

/** 受众描述 */
export const AUDIENCE_DESC = {
    male: '男频(热血、升级、系统、争霸)',
    female: '女频(情感、细腻、CP感、大女主/甜宠)'
} as const;

/** 导图类型名称 */
export const MAP_TYPE_NAMES = {
    world: '世界观设定',
    structure: '宏观结构',
    character: '角色档案',
    system: '力量体系',
    mission: '任务状态',
    anchor: '伏笔锚点',
    events: '事件时间轴',
    chapters: '章节细纲'
} as const;

/** 导图类型描述 */
export const MAP_TYPE_DESC = {
    world: '定义地理环境、历史背景和核心法则。',
    structure: '规划分卷和整体节奏。',
    character: '定义主角、反派和主要配角。',
    system: '定义等级划分和升级条件。',
    mission: '主角的任务线和状态变化。',
    anchor: '关键物品和伏笔埋设。',
    events: '关键剧情转折点。',
    chapters: '具体章节规划。'
} as const;

/** 节点类型 */
export const NODE_TYPE = {
    BOOK: 'book',
    VOLUME: 'volume',
    CHAPTER: 'chapter',
    SCENE: 'scene',
    CHARACTER: 'character',
    SETTING: 'setting',
    SYSTEM: 'system',
    EVENT: 'event',
    MISSION: 'mission',
    ANCHOR: 'anchor'
} as const;

/** 默认值 */
export const DEFAULT_VALUES = {
    TREND_KEYWORD: '玄幻',
    WORD_COUNT: 2000,
    CHAPTER_COUNT: 10,
    WORDS_PER_CHAPTER: 3000,
    CONTEXT_LENGTH: 1000,
    MAX_CONTEXT_SIZE: 50000,
    WARNING_THRESHOLD: 30000
} as const;

// ==================== 错误信息常量 ====================

/** API 错误信息 */
export const API_ERROR_MESSAGE = {
    QUOTA_EXCEEDED: '⚠️ API 配额耗尽 (429)。请检查您的 API Key 额度,或者在设置中切换为免费/低消耗模型。',
    NETWORK_TIMEOUT: '⚠️ 网络连接超时或服务繁忙。请检查网络连接并重试。',
    SAFETY_BLOCKED: '⚠️ 内容被安全过滤器拦截。',
    JSON_PARSE_ERROR: '⚠️ 数据解析失败。',
    UNKNOWN_ERROR: '⚠️ 发生未知错误',
    INVALID_API_KEY: '⚠️ API Key 无效或权限不足。',
    MODEL_NOT_FOUND: '⚠️ 模型不存在或无权访问。'
} as const;

/** 验证错误信息 */
export const VALIDATION_ERROR = {
    EMPTY_TITLE: '标题不能为空',
    EMPTY_CONTENT: '内容不能为空',
    INVALID_URL: 'URL格式不正确',
    INVALID_NUMBER: '请输入有效的数字',
    OUT_OF_RANGE: '数值超出有效范围',
    REQUIRED_FIELD: '此字段为必填项'
} as const;

// ==================== 配置常量 ====================

/** 模型配置 */
export const MODEL_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.5-flash',
    FALLBACK_MODEL: 'gemini-flash-lite-latest',
    EMBEDDING_MODEL: 'local-minilm',
    TIMEOUT: 300000, // 5分钟
    RETRY_COUNT: 3,
    BASE_DELAY: 3000
} as const;

/** 存储键名 */
export const STORAGE_KEYS_CONST = {
    STUDIO: 'inkflow_studio',
    HISTORY_STUDIO: 'inkflow_history_studio',
    HISTORY_LAB: 'inkflow_history_lab',
    SETTINGS: 'inkflow_settings',
    PROMPT_LIBRARY: 'inkflow_prompt_library',
    PERSONA_TEMPLATES: 'inkflow_persona_templates'
} as const;

/** 文件导出配置 */
export const EXPORT_CONFIG = {
    JSON_FILENAME: 'inkflow_studio_history',
    ZIP_FILENAME_SUFFIX: '_backup.zip',
    MAPS_FOLDER: '思维导图',
    CHAPTERS_FOLDER: '正文稿件'
} as const;

// ==================== 样式常量 ====================

/** 颜色主题 */
export const THEME_COLORS = {
    PRIMARY: 'teal',
    SUCCESS: 'green',
    WARNING: 'amber',
    ERROR: 'red',
    INFO: 'blue'
} as const;

/** 图标大小 */
export const ICON_SIZE = {
    SMALL: 12,
    MEDIUM: 16,
    LARGE: 20,
    XLARGE: 24
} as const;

// ==================== 正则表达式常量 ====================

/** 常用正则表达式 */
export const REGEX_PATTERNS = {
    /** 中文字符 */
    CHINESE: /[\u4e00-\u9fa5]/g,
    /** URL格式 */
    URL: /^https?:\/\/.+/,
    /** 数字 */
    NUMBER: /^\d+$/,
    /** 邮箱 */
    EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    /** 序号前缀 (1. 2. 一、等) */
    NUMBER_PREFIX: /^[\d一二三四五]+[、.．。)\)]\s*/,
    /** Markdown格式 */
    MARKDOWN: /[*_`]/g,
    /** 引号 */
    QUOTES: /["「」『』""'']/g,
    /** 描述性前缀 */
    DESCRIPTIVE_PREFIX: /^(根据|搜索|分析|推荐|一些|当前|热门|上榜|被推荐).*?[，,：:]/
} as const;

// ==================== 导出类型定义 ====================

export type ButtonTextKey = keyof typeof BUTTON_TEXT;
export type StatusTextKey = keyof typeof STATUS_TEXT;
export type ToastMessageKey = keyof typeof TOAST_MESSAGE;
export type PlatformKey = keyof typeof PLATFORM_NAMES;
export type MapTypeKey = keyof typeof MAP_TYPE_NAMES;
export type NodeTypeValue = typeof NODE_TYPE[keyof typeof NODE_TYPE];
