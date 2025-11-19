
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
