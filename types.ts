
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

// --- Global State ---

export interface StudioGlobalState {
    isGenerating: boolean;
    progress: number; // 0 - 100
    generatedContent: string;
    trendFocus: string;
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
