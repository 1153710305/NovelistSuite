
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from './services/storageService';

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de';

const translations: Record<Language, any> = {
  en: {
    app: {
        title: 'InkFlow AI'
    },
    login: {
        title: 'InkFlow AI System',
        subtitle: 'Please select your access level',
        userBtn: 'Enter as Author',
        adminBtn: 'Enter as Administrator',
        userDesc: 'Access the creation suite',
        adminDesc: 'View local system data'
    },
    admin: {
        title: 'System Administration',
        tabUsers: 'User Info',
        tabLab: 'Lab Data',
        tabStudio: 'Studio Data',
        tabArchitect: 'Architect Data',
        refresh: 'Refresh Data',
        clearAll: 'Clear All Data',
        empty: 'No records found in local storage.',
        id: 'ID',
        timestamp: 'Time',
        content: 'Content Snippet',
        type: 'Type/Mode',
        exit: 'Exit Admin'
    },
    models: {
        lite: 'Gemini Flash Lite (Fastest)',
        flash: 'Gemini 2.5 Flash (Balanced)',
        pro: 'Gemini 3 Pro (Brain)'
    },
    common: {
        history: 'History',
        save: 'Save',
        delete: 'Delete',
        view: 'View',
        today: 'Today',
        yesterday: 'Yesterday',
        noHistory: 'No records found.',
        refresh: 'Refresh',
        logout: 'Logout',
        bgTask: 'Working in background...',
        safeToLeave: 'You can leave this page.',
        remainingTime: 'Est. remaining: {time}s'
    },
    nav: {
      dashboard: 'Dashboard',
      market: 'Market Trends',
      lab: 'Deconstruct Lab',
      studio: 'Writing Studio',
      architect: 'Story Architect',
      powered: 'Powered by Gemini'
    },
    settings: {
        title: 'Settings',
        language: 'Language',
        model: 'AI Model',
        modelHelp: 'Lite (Fast), Flash (Balanced), Pro (Smart)',
        resetGuide: 'Reset Guide'
    },
    sources: {
        title: 'Data Sources',
        label: 'Select platforms for trend analysis:',
        douyin: 'Douyin',
        kuaishou: 'Kuaishou',
        bilibili: 'Bilibili',
        baidu: 'Baidu',
        weibo: 'Weibo',
        xiaohongshu: 'Xiaohongshu',
        fanqie: 'Fanqie',
        qidian: 'Qidian',
        jinjiang: 'Jinjiang',
        zhihu: 'Zhihu',
        zongheng: 'Zongheng',
        all: 'All Sources'
    },
    dataDoc: {
        title: 'Data Methodology & Reliability',
        btnLabel: 'Data Spec',
        method: {
            title: 'Acquisition Method',
            desc: 'Real-time aggregation via public ranking APIs combined with AI-driven semantic analysis.'
        },
        sources: {
            title: 'Data Sources',
            desc: 'Directly sourced from official leaderboards of verified Chinese platforms.'
        },
        reliability: {
            title: 'Authenticity',
            desc: 'Cross-referenced data with hourly updates. AI filters false clickbait.'
        }
    },
    genres: {
        xianxia: 'Xianxia (Immortal)',
        urban: 'Urban System',
        fantasy: 'Eastern Fantasy',
        scifi: 'Sci-Fi Infinite',
        history: 'Historical Strategy',
        gaming: 'Gaming',
        horror: 'Horror/Thriller',
        sports: 'Sports',
        war: 'Urban God of War',
        romance80s: 'Reborn in 80s',
        ceo: 'CEO Romance',
        farming: 'System Farming',
        survival: 'Live Stream Survival',
        zombie: 'Zombie Apocalypse',
        pet: 'Pet Evolution',
        star: 'Entertainment Star',
        danmei: 'Danmei (BL)',
        ancient: 'Ancient Romance',
        entertainment: 'Entertainment Circle',
        campus: 'Campus Love',
        interstellar: 'Interstellar',
        unlimited: 'Unlimited Flow',
        western: 'Western Fantasy'
    },
    topics: {
        challenge: 'Challenge',
        dance: 'Dance',
        pov: 'POV',
        lifehack: 'LifeHack',
        comedy: 'Comedy',
        news: 'News',
        celebrity: 'Celebrity',
        drama: 'Drama',
        social: 'Social',
        tech: 'Tech',
        anime: 'Anime',
        game: 'Game',
        review: 'Review',
        meme: 'Meme',
        tutorial: 'Tutorial',
        question: 'Question',
        career: 'Career',
        science: 'Science',
        history: 'History',
        relationship: 'Relationship',
        ootd: 'OOTD',
        makeup: 'Makeup',
        travel: 'Travel',
        food: 'Food',
        decor: 'Decor'
    },
    dashboard: {
      welcome: 'Welcome back, Author.',
      subtitle: "Here is today's literary landscape overview.",
      topGenre: 'Top Genre',
      hotTrope: 'Hot Trope',
      dailyGoal: 'Daily Goal',
      wordsWritten: 'Words written today',
      genreIndex: 'Genre Heat Index',
      platformShare: 'Platform Market Share',
      trending: 'this week',
      trendingPlatforms: 'Trending on 3 platforms',
      heat: 'Heat',
      readCount: 'Reads',
      source: 'Source',
      socialIntel: 'Social Media Intelligence (Top 20)',
      rank: 'Rank',
      topic: 'Topic/Meme',
      change: 'Change',
      timeRange: 'Time Range',
      selectPlatform: 'Platform',
      weekly: 'Weekly',
      monthly: 'Monthly',
      historical: 'All Time',
      trafficBreakdown: 'Traffic Breakdown',
      activeUsers: 'MAU (Est.)',
      growth: 'Growth',
      others: 'Others'
    },
    market: {
      title: 'Market Leaderboard',
      allCategories: 'All Categories',
      hotScore: 'Hot Score',
      deconstruct: 'Deconstruct',
      platform: 'Platform',
      author: 'Author'
    },
    lab: {
      sourceText: 'Source Text',
      analyzeBtn: 'Analyze Text',
      analyzing: 'Deconstructing...',
      viralFactors: 'Hit Factor Report',
      pacing: 'Pacing Analysis',
      characters: 'Character Study',
      placeholder: 'Paste a chapter or segment from a popular novel here to analyze...',
      emptyState: 'Run analysis to identify Golden Chapters, Hooks, and more.',
      modes: {
          viral: 'Viral Factors',
          pacing: 'Pacing',
          chars: 'Characters'
      },
      historyTitle: 'Deconstruction Records'
    },
    studio: {
      tabDaily: 'Daily Inspiration',
      tabTools: 'AI Editor Tools',
      dailyGenTitle: 'Daily Generator',
      dailyGenDesc: 'Generate 10 fresh short story concepts based on today\'s trends.',
      trendLabel: 'Trend Focus (Optional)',
      trendPlaceholder: 'e.g., Cyberpunk, Enemies to Lovers...',
      generateBtn: 'Generate 10 Stories',
      generating: 'Generating...',
      generatingBackground: 'Generating in background...',
      backgroundTip: 'You can visit other pages, generation will continue.',
      emptyDaily: 'Your daily dose of inspiration will appear here.',
      toolContinue: 'Continue',
      toolRewrite: 'Rewrite',
      toolPolish: 'Polish',
      toolPlaceholder: 'Paste your draft here...',
      processing: 'Processing...',
      emptyTool: 'AI output will appear here...',
      historyTitle: 'Story History'
    },
    architect: {
      placeholder: "Enter your novel premise (e.g., 'A chef discovers his knives can cut through time')...",
      designBtn: 'Design Outline',
      tip: 'Click a node to view details or generate content.',
      description: 'Description',
      content: 'Content',
      generateDraft: 'Generate Draft',
      writing: 'Writing...',
      noContent: 'No content generated yet.',
      types: {
          book: 'Book',
          act: 'Act',
          chapter: 'Chapter',
          scene: 'Scene'
      },
      historyTitle: 'Saved Outlines',
      load: 'Load'
    },
    mindmap: {
      empty: 'Generate an outline to view the map'
    },
    onboarding: {
        skip: 'Skip Tour',
        next: 'Next',
        finish: 'Get Started',
        steps: {
            welcome: { title: 'Welcome to InkFlow AI', desc: 'Your personal AI-powered novel creation studio. Let\'s take a quick tour.' },
            dashboard: { title: 'Dashboard', desc: 'View your writing progress and current market trends at a glance.' },
            market: { title: 'Market Analysis', desc: 'Explore hot novels from major platforms and analyze their success.' },
            lab: { title: 'Deconstruct Lab', desc: 'Use AI to analyze writing styles, pacing, and viral factors from any text.' },
            studio: { title: 'Writing Studio', desc: 'Generate daily inspiration, or use AI to rewrite, polish, and continue your stories.' },
            architect: { title: 'Story Architect', desc: 'Build complex story structures with visual mind maps and generate chapters directly from the outline.' },
            settings: { title: 'Global Settings', desc: 'Switch languages or choose between different Gemini models (Flash for speed, Pro for complex reasoning).' }
        }
    }
  },
  zh: {
    app: {
        title: '个人AI小说生成系统'
    },
    login: {
        title: 'InkFlow AI 登录',
        subtitle: '请选择您的访问身份',
        userBtn: '作者登录',
        adminBtn: '管理员登录',
        userDesc: '进入创作系统，开始写作',
        adminDesc: '查看本地系统数据和记录'
    },
    admin: {
        title: '系统管理后台',
        tabUsers: '用户信息',
        tabLab: '拆书数据',
        tabStudio: '工作室数据',
        tabArchitect: '大纲数据',
        refresh: '刷新数据',
        clearAll: '清空所有数据',
        empty: '本地存储中没有找到记录。',
        id: 'ID',
        timestamp: '时间',
        content: '内容片段',
        type: '类型/模式',
        exit: '退出后台'
    },
    models: {
        lite: 'Gemini Flash Lite (极速版)',
        flash: 'Gemini 2.5 Flash (平衡版)',
        pro: 'Gemini 3 Pro (强智版)'
    },
    common: {
        history: '历史记录',
        save: '保存',
        delete: '删除',
        view: '查看',
        today: '今天',
        yesterday: '昨天',
        noHistory: '暂无历史记录',
        refresh: '刷新',
        logout: '退出登录',
        bgTask: '正在后台运行...',
        safeToLeave: '您可以离开当前页面。',
        remainingTime: '预计剩余: {time}秒'
    },
    nav: {
      dashboard: '仪表盘',
      market: '市场趋势',
      lab: '拆书实验室',
      studio: '写作工作室',
      architect: '故事架构师',
      powered: '由智能 AI 驱动'
    },
    settings: {
        title: '设置',
        language: '语言 / Language',
        model: 'AI 模型',
        modelHelp: '极速版, 平衡版, 强智版',
        resetGuide: '重置引导'
    },
    sources: {
        title: '数据来源',
        label: '选择趋势分析平台：',
        douyin: '抖音',
        kuaishou: '快手',
        bilibili: 'B站',
        baidu: '百度',
        weibo: '微博',
        xiaohongshu: '小红书',
        fanqie: '番茄',
        qidian: '起点',
        jinjiang: '晋江',
        zhihu: '知乎',
        zongheng: '纵横',
        all: '全选'
    },
    dataDoc: {
        title: '数据方法论与可靠性说明',
        btnLabel: '数据源说明',
        method: {
            title: '获取方式',
            desc: '通过中国各大内容平台公开的排行榜API接口实时聚合数据，结合AI语义分析技术进行清洗与分类。'
        },
        sources: {
            title: '数据来源',
            desc: '数据直接源自抖音热榜、微博热搜、起点月票榜、番茄必读榜等中国主流平台，确保纯正中文语境。'
        },
        reliability: {
            title: '真实性与可靠性',
            desc: '数据每小时更新一次，并与历史趋势交叉验证。AI算法自动过滤标题党与刷量数据，确保热度真实可信。'
        }
    },
    genres: {
        xianxia: '仙侠修真',
        urban: '都市系统',
        fantasy: '东方玄幻',
        scifi: '科幻无限',
        history: '历史谋略',
        gaming: '网游竞技',
        horror: '悬疑灵异',
        sports: '体育竞技',
        war: '都市战神',
        romance80s: '年代重生',
        ceo: '总裁豪门',
        farming: '种田文',
        survival: '直播求生',
        zombie: '末世危机',
        pet: '御兽进化',
        star: '文娱巨星',
        danmei: '纯爱/耽美',
        ancient: '古言',
        entertainment: '娱乐圈',
        campus: '青春校园',
        interstellar: '星际',
        unlimited: '无限流',
        western: '西幻'
    },
    topics: {
        challenge: '挑战',
        dance: '手势舞',
        pov: '第一视角',
        lifehack: '生活妙招',
        comedy: '搞笑段子',
        news: '热点新闻',
        celebrity: '明星八卦',
        drama: '短剧',
        social: '社会民生',
        tech: '科技数码',
        anime: '动漫新番',
        game: '游戏攻略',
        review: '影视解说',
        meme: '鬼畜/梗',
        tutorial: '硬核教程',
        question: '热榜提问',
        career: '职场',
        science: '科普',
        history: '历史',
        relationship: '情感',
        ootd: '穿搭',
        makeup: '美妆',
        travel: '旅游',
        food: '美食',
        decor: '装修'
    },
    dashboard: {
      welcome: '欢迎回来，作者。',
      subtitle: '这是今天的文学概况。',
      topGenre: '热门流派',
      hotTrope: '热门梗',
      dailyGoal: '每日目标',
      wordsWritten: '今日字数',
      genreIndex: '流派热度指数',
      platformShare: '平台流量份额',
      trending: '本周',
      trendingPlatforms: '3个平台热推',
      heat: '热度',
      readCount: '阅读',
      source: '来源',
      socialIntel: '主流社交平台热梗 Top 20',
      rank: '排名',
      topic: '话题/梗',
      change: '变化',
      timeRange: '统计周期',
      selectPlatform: '选择平台',
      weekly: '本周',
      monthly: '本月',
      historical: '历史累计',
      trafficBreakdown: '流量详细分布',
      activeUsers: '月活 (预估)',
      growth: '增长率',
      others: '其他'
    },
    market: {
      title: '市场排行榜',
      allCategories: '所有分类',
      hotScore: '热度值',
      deconstruct: '拆解分析',
      platform: '平台',
      author: '作者'
    },
    lab: {
      sourceText: '原文',
      analyzeBtn: '分析文本',
      analyzing: '正在拆解...',
      viralFactors: '爆款因子报告',
      pacing: '节奏分析',
      characters: '角色研究',
      placeholder: '在此粘贴热门小说的章节或片段以进行分析...',
      emptyState: '运行分析以识别黄金三章、钩子等。',
      modes: {
          viral: '爆款因子',
          pacing: '节奏',
          chars: '角色'
      },
      historyTitle: '拆书记录'
    },
    studio: {
      tabDaily: '每日灵感',
      tabTools: 'AI 编辑工具',
      dailyGenTitle: '每日生成器',
      dailyGenDesc: '根据今日趋势生成 10 个新鲜的短篇小说创意。',
      trendLabel: '趋势焦点 (可选)',
      trendPlaceholder: '例如：赛博朋克，死对头...',
      generateBtn: '生成 10 个故事',
      generating: '生成中...',
      generatingBackground: '后台生成中...',
      backgroundTip: '您可以自由访问其他页面，生成任务将继续进行。',
      emptyDaily: '您的每日灵感将显示在这里。',
      toolContinue: '续写',
      toolRewrite: '改写',
      toolPolish: '润色',
      toolPlaceholder: '在此粘贴您的草稿...',
      processing: '处理中...',
      emptyTool: 'AI 输出将显示在这里...',
      historyTitle: '灵感历史'
    },
    architect: {
      placeholder: "输入小说前提（例如：“一位厨师发现他的刀可以切开时间”）...",
      designBtn: '设计大纲',
      tip: '点击节点查看详情或生成内容。',
      description: '描述',
      content: '正文',
      generateDraft: '生成草稿',
      writing: '写作中...',
      noContent: '暂无生成内容。',
      types: {
          book: '书名',
          act: '卷/幕',
          chapter: '章节',
          scene: '场景'
      },
      historyTitle: '大纲存档',
      load: '加载'
    },
    mindmap: {
      empty: '生成大纲以查看思维导图'
    },
    onboarding: {
        skip: '跳过',
        next: '下一步',
        finish: '开始使用',
        steps: {
            welcome: { title: '欢迎使用个人AI小说生成系统', desc: '您的专属智能小说创作工作室。让我们快速了解一下功能。' },
            dashboard: { title: '仪表盘', desc: '一目了然地查看您的写作进度和当前市场趋势。' },
            market: { title: '市场趋势', desc: '探索各大平台的热门小说并分析其成功原因。' },
            lab: { title: '拆书实验室', desc: '使用人工智能分析任何文本的写作风格、节奏和爆款因子。' },
            studio: { title: '写作工作室', desc: '获取每日灵感，或使用智能助手续写、改写和润色您的故事。' },
            architect: { title: '故事架构师', desc: '使用可视化思维导图构建复杂的故事结构，并直接从大纲生成章节。' },
            settings: { title: '全局设置', desc: '切换语言或选择不同的智能模型（极速版响应快，强智版逻辑强）。' }
        }
    }
  },
  ja: { app: { title: 'InkFlow AI' } },
  es: { app: { title: 'InkFlow AI' } },
  fr: { app: { title: 'InkFlow AI' } },
  de: { app: { title: 'InkFlow AI' } }
};

const I18nContext = createContext<any>(null);

export const I18nProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [lang, setLangState] = useState<Language>('en');

  useEffect(() => {
    const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS);
    if (savedSettings && savedSettings.lang && translations[savedSettings.lang as Language]) {
        setLangState(savedSettings.lang);
    } else {
        // Default to Chinese for this user
        setLangState('zh');
    }
  }, []);

  const setLang = (newLang: Language) => {
      setLangState(newLang);
      const savedSettings = loadFromStorage(STORAGE_KEYS.SETTINGS) || {};
      saveToStorage(STORAGE_KEYS.SETTINGS, { ...savedSettings, lang: newLang });
  }

  const t = (path: string) => {
    const keys = path.split('.');
    let current: any = translations[lang] || translations['zh']; // Fallback to zh
    for (const key of keys) {
      if (current[key] === undefined) {
          let fallback = translations['zh']; // Fallback to zh
          for (const k of keys) {
              if (fallback[k] === undefined) return path;
              fallback = fallback[k];
          }
          return fallback;
      }
      current = current[key];
    }
    return current;
  };

  const getToolLabel = (mode: string) => {
     if (lang === 'zh') return mode === 'continue' ? '续写' : mode === 'rewrite' ? '改写' : '润色';
     return t(`studio.tool${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
  };

  const getProcessLabel = (mode: string) => {
      return `AI ${getToolLabel(mode)}`;
  }

  return (
    <I18nContext.Provider value={{ lang, setLang, t, getToolLabel, getProcessLabel }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => useContext(I18nContext);
