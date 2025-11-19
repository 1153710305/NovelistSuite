
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
  type: 'book' | 'act' | 'chapter' | 'scene';
  description?: string;
  children?: OutlineNode[];
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
    outline: OutlineNode | null;
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
    snippet: string; // Short preview of text
}

export interface StudioRecord extends BaseHistoryRecord {
    trendFocus: string;
    content: string;
    sources: string[];
}

export interface ArchitectRecord extends BaseHistoryRecord {
    premise: string;
    outline: OutlineNode;
}