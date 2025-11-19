
export enum NovelPlatform {
  QIDIAN = 'Qidian',
  JINJIANG = 'Jinjiang',
  FANQIE = 'Fanqie'
}

export interface Novel {
  id: string;
  title: string;
  author: string;
  category: string;
  hotScore: number;
  platform: NovelPlatform;
  summary: string;
}

export interface GeneratedStory {
  title: string;
  genre: string;
  synopsis: string;
  hook: string;
}

export interface OutlineNode {
  id?: string; // Unique ID for editing
  name: string;
  type: 'book' | 'act' | 'chapter' | 'scene' | 'character' | 'setting'; // Added character and setting
  description?: string;
  content?: string; // Stores the generated chapter draft
  children?: OutlineNode[];
}

export interface PromptTemplate {
    id: string;
    name: string;
    content: string; // The system instruction or style wrapper
    tags: string[]; // e.g., 'platform', 'style'
}

export interface CoverRecord {
    id: string;
    timestamp: number;
    prompt: string;
    style: string;
    model: string;
    imageBase64: string;
}

export enum WritingMode {
  DAILY_SHORTS = 'daily_shorts',
  CONTINUE = 'continue',
  REWRITE = 'rewrite',
  POLISH = 'polish'
}

export const AVAILABLE_SOURCES = [
    'douyin', 'kuaishou', 'bilibili', 'baidu', 'weibo', 
    'xiaohongshu', 'fanqie', 'qidian', 'jinjiang', 'zhihu'
];

export enum ImageModel {
    IMAGEN = 'imagen-4.0-generate-001',
    GEMINI_FLASH_IMAGE = 'gemini-2.5-flash-image'
}

// --- Global State ---

export interface StudioGlobalState {
    isGenerating: boolean;
    progress: number; // 0 - 100
    remainingTime: number; // seconds
    generatedContent: string;
    trendFocus: string;
    lastUpdated: number;
}

export interface ArchitectGlobalState {
    isGenerating: boolean;
    progress: number;
    remainingTime: number; // seconds
    premise: string;
    synopsis: string;
    coverImage: string; // Base64 string of the generated cover
    outline: OutlineNode | null;
    activeRecordId?: string; 
    lastUpdated: number;
}

export interface LabGlobalState {
    isAnalyzing: boolean;
    progress: number;
    remainingTime: number; // seconds
    inputText: string;
    mode: 'viral_factors' | 'pacing' | 'characters';
    analysisResult: string;
    lastUpdated: number;
}

// --- History Records ---

export interface BaseHistoryRecord {
    id: string;
    timestamp: number;
}

export interface LabRecord extends BaseHistoryRecord {
    inputText: string;
    mode: 'viral_factors' | 'pacing' | 'characters';
    analysis: string;
    snippet: string; 
}

export interface StudioRecord extends BaseHistoryRecord {
    trendFocus: string;
    content: string;
    sources: string[];
}

export interface ArchitectRecord extends BaseHistoryRecord {
    premise: string;
    synopsis: string;
    coverImage?: string; // New
    outline: OutlineNode;
}

// --- Quota Types ---

export interface QuotaLimit {
    dailyRequests: number;
    rpm: number; 
}

export interface ModelUsage {
    count: number;
    lastReset: number; 
    minuteCount: number;
    lastRequestTime: number;
}

// --- Logging Types ---

export enum LogLevel {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG'
}

export interface LogEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
}
