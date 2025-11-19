
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from './services/storageService';

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de';

const translations: Record<Language, any> = {
  en: {
    app: { title: 'InkFlow AI' },
    login: {
        title: 'InkFlow AI System', subtitle: 'Please select your access level',
        userBtn: 'Enter as Author', adminBtn: 'Enter as Administrator',
        userDesc: 'Access the creation suite', adminDesc: 'View local system data'
    },
    admin: {
        title: 'System Administration', tabUsers: 'User Info', tabLab: 'Lab Data', tabStudio: 'Studio Data', tabArchitect: 'Architect Data', refresh: 'Refresh Data', clearAll: 'Clear All Data', empty: 'No records found.', id: 'ID', timestamp: 'Time', content: 'Content Snippet', type: 'Type/Mode', exit: 'Exit Admin'
    },
    models: {
        lite: 'Gemini Flash Lite (Fastest)', flash: 'Gemini 2.5 Flash (Balanced)', pro: 'Gemini 3 Pro (Brain)'
    },
    quota: {
        dailyLimit: 'Daily Limit', rpm: 'Requests/Min', remaining: 'Remaining', errorTitle: 'Quota Exceeded', errorDesc: 'You have reached your usage limit.'
    },
    common: {
        history: 'History', save: 'Save', delete: 'Delete', view: 'View', today: 'Today', yesterday: 'Yesterday', noHistory: 'No records found.', refresh: 'Refresh', logout: 'Logout', bgTask: 'Working in background...', safeToLeave: 'You can leave this page.', remainingTime: 'Est. remaining: {time}s', errorTitle: 'Something went wrong', errorDesc: 'We encountered an unexpected error.', reload: 'Reload Application', logs: 'System Logs', level: 'Level', message: 'Message', edit: 'Edit', cancel: 'Cancel', confirm: 'Confirm'
    },
    nav: {
      dashboard: 'Dashboard', market: 'Market Trends', lab: 'Deconstruct Lab', studio: 'Writing Studio', architect: 'Story Architect', powered: 'Powered by Gemini'
    },
    settings: {
        title: 'Settings', language: 'Language', model: 'AI Model', modelHelp: 'Lite (Fast), Flash (Balanced), Pro (Smart)', resetGuide: 'Reset Guide'
    },
    sources: {
        title: 'Data Sources', label: 'Select platforms for trend analysis:', douyin: 'Douyin', kuaishou: 'Kuaishou', bilibili: 'Bilibili', baidu: 'Baidu', weibo: 'Weibo', xiaohongshu: 'Xiaohongshu', fanqie: 'Fanqie', qidian: 'Qidian', jinjiang: 'Jinjiang', zhihu: 'Zhihu', zongheng: 'Zongheng', all: 'All Sources'
    },
    dataDoc: {
        title: 'Data Methodology & Reliability', btnLabel: 'Data Spec', method: { title: 'Acquisition Method', desc: 'Real-time aggregation via public ranking APIs combined with AI-driven semantic analysis.' }, sources: { title: 'Data Sources', desc: 'Directly sourced from official leaderboards of verified Chinese platforms.' }, reliability: { title: 'Authenticity', desc: 'Cross-referenced data with hourly updates.' }
    },
    genres: { xianxia: 'Xianxia', urban: 'Urban System', fantasy: 'Eastern Fantasy', scifi: 'Sci-Fi', history: 'Historical', gaming: 'Gaming', horror: 'Horror', sports: 'Sports', war: 'War', romance80s: '80s Romance', ceo: 'CEO', farming: 'Farming', survival: 'Survival', zombie: 'Zombie', pet: 'Pet', star: 'Star', danmei: 'BL', ancient: 'Ancient', entertainment: 'Entertainment', campus: 'Campus', interstellar: 'Interstellar', unlimited: 'Unlimited', western: 'Western' },
    topics: { challenge: 'Challenge', dance: 'Dance', pov: 'POV', lifehack: 'LifeHack', comedy: 'Comedy', news: 'News', celebrity: 'Celebrity', drama: 'Drama', social: 'Social', tech: 'Tech', anime: 'Anime', game: 'Game', review: 'Review', meme: 'Meme', tutorial: 'Tutorial', question: 'Question', career: 'Career', science: 'Science', history: 'History', relationship: 'Relationship', ootd: 'OOTD', makeup: 'Makeup', travel: 'Travel', food: 'Food', decor: 'Decor' },
    dashboard: { welcome: 'Welcome back, Author.', subtitle: "Here is today's literary landscape.", topGenre: 'Top Genre', hotTrope: 'Hot Trope', dailyGoal: 'Daily Goal', wordsWritten: 'Words written today', genreIndex: 'Genre Heat Index', platformShare: 'Platform Market Share', trending: 'this week', trendingPlatforms: 'Trending on 3 platforms', heat: 'Heat', readCount: 'Reads', source: 'Source', socialIntel: 'Social Media Intelligence', rank: 'Rank', topic: 'Topic', change: 'Change', timeRange: 'Time Range', selectPlatform: 'Platform', weekly: 'Weekly', monthly: 'Monthly', historical: 'All Time', trafficBreakdown: 'Traffic Breakdown', activeUsers: 'MAU', growth: 'Growth', others: 'Others', portals: 'Platform Data Portals', officialSite: 'Official Site', rankings: 'Rankings' },
    market: { title: 'Market Leaderboard', allCategories: 'All Categories', hotScore: 'Hot Score', deconstruct: 'Deconstruct', platform: 'Platform', author: 'Author' },
    lab: { sourceText: 'Source Text', analyzeBtn: 'Analyze Text', analyzing: 'Deconstructing...', viralFactors: 'Hit Factor Report', pacing: 'Pacing Analysis', characters: 'Character Study', placeholder: 'Paste text here...', emptyState: 'Run analysis.', modes: { viral: 'Viral Factors', pacing: 'Pacing', chars: 'Characters' }, historyTitle: 'Records' },
    studio: { tabDaily: 'Daily Inspiration', tabTools: 'AI Editor Tools', dailyGenTitle: 'Daily Generator', dailyGenDesc: 'Generate 10 fresh short story concepts.', trendLabel: 'Trend Focus', trendPlaceholder: 'e.g., Cyberpunk...', generateBtn: 'Generate 10 Stories', generating: 'Generating...', generatingBackground: 'Generating in background...', backgroundTip: 'You can visit other pages.', emptyDaily: 'Inspiration appears here.', toolContinue: 'Continue', toolRewrite: 'Rewrite', toolPolish: 'Polish', toolPlaceholder: 'Paste draft...', processing: 'Processing...', emptyTool: 'AI output here...', historyTitle: 'History' },
    architect: {
      placeholder: "Enter premise...",
      synopsisPlaceholder: "Novel Synopsis (Optional)",
      designBtn: 'Design Outline',
      tip: 'Click node to edit.',
      description: 'Description',
      content: 'Content',
      generateDraft: 'Generate Draft',
      writing: 'Writing...',
      noContent: 'No content yet.',
      types: { book: 'Book', act: 'Act', chapter: 'Chapter', scene: 'Scene' },
      historyTitle: 'Saved Outlines',
      load: 'Load',
      actions: 'Actions',
      addChild: 'Add Child',
      addSibling: 'Add Sibling',
      deleteNode: 'Delete',
      aiExpand: 'AI Expand',
      expanding: 'Expanding...',
      nodeName: 'Name',
      nodeDesc: 'Desc',
      confirmDelete: 'Confirm delete?',
      mapControls: { zoomIn: 'Zoom In', zoomOut: 'Zoom Out', fit: 'Fit View' },
      views: { map: 'Blueprint View', manuscript: 'Manuscript View' },
      cover: { generate: 'Generate Cover', regenerating: 'Painting...', promptLabel: 'Cover Prompt', styleLabel: 'Art Style', modelLabel: 'Image Model' },
      prompts: { title: 'Prompt Library', select: 'Select Writing Style', add: 'Add New Prompt', name: 'Name', instruction: 'Instruction' }
    },
    mindmap: { empty: 'Generate an outline to view' },
    onboarding: { skip: 'Skip', next: 'Next', finish: 'Finish', steps: { welcome: {title:'', desc:''}, dashboard: {title:'', desc:''}, market: {title:'', desc:''}, lab: {title:'', desc:''}, studio: {title:'', desc:''}, architect: {title:'', desc:''}, settings: {title:'', desc:''} } }
  },
  zh: {
    app: { title: '个人AI小说生成系统' },
    login: { title: 'InkFlow AI 登录', subtitle: '请选择您的访问身份', userBtn: '作者登录', adminBtn: '管理员登录', userDesc: '进入创作系统', adminDesc: '查看本地数据' },
    admin: { title: '系统管理后台', tabUsers: '用户信息', tabLab: '拆书数据', tabStudio: '工作室数据', tabArchitect: '大纲数据', refresh: '刷新', clearAll: '清空', empty: '无记录', id: 'ID', timestamp: '时间', content: '内容', type: '类型', exit: '退出' },
    models: { lite: 'Gemini Flash Lite (极速版)', flash: 'Gemini 2.5 Flash (平衡版)', pro: 'Gemini 3 Pro (强智版)' },
    quota: { dailyLimit: '每日额度', rpm: '频率限制', remaining: '剩余', errorTitle: '配额超限', errorDesc: '已达限制。' },
    common: { history: '历史记录', save: '保存', delete: '删除', view: '查看', today: '今天', yesterday: '昨天', noHistory: '无记录', refresh: '刷新', logout: '退出', bgTask: '后台运行中...', safeToLeave: '可离开页面', remainingTime: '预计剩余: {time}秒', errorTitle: '出错了', errorDesc: '意外错误。', reload: '重载', logs: '日志', level: '级别', message: '信息', edit: '编辑', cancel: '取消', confirm: '确认' },
    nav: { dashboard: '仪表盘', market: '市场趋势', lab: '拆书实验室', studio: '写作工作室', architect: '故事架构师', powered: '由智能 AI 驱动' },
    settings: { title: '设置', language: '语言', model: '模型', modelHelp: 'Lite, Flash, Pro', resetGuide: '重置引导' },
    sources: { title: '数据来源', label: '选择平台：', douyin: '抖音', kuaishou: '快手', bilibili: 'B站', baidu: '百度', weibo: '微博', xiaohongshu: '小红书', fanqie: '番茄', qidian: '起点', jinjiang: '晋江', zhihu: '知乎', zongheng: '纵横', all: '全选' },
    dataDoc: { title: '数据说明', btnLabel: '数据源', method: { title: '获取方式', desc: 'API聚合+AI分析' }, sources: { title: '来源', desc: '官方榜单' }, reliability: { title: '真实性', desc: '交叉验证' } },
    genres: { xianxia: '仙侠修真', urban: '都市系统', fantasy: '东方玄幻', scifi: '科幻无限', history: '历史谋略', gaming: '网游竞技', horror: '悬疑灵异', sports: '体育竞技', war: '都市战神', romance80s: '年代重生', ceo: '总裁豪门', farming: '种田文', survival: '直播求生', zombie: '末世危机', pet: '御兽进化', star: '文娱巨星', danmei: '纯爱/耽美', ancient: '古言', entertainment: '娱乐圈', campus: '青春校园', interstellar: '星际', unlimited: '无限流', western: '西幻' },
    topics: { challenge: '挑战', dance: '手势舞', pov: '第一视角', lifehack: '生活妙招', comedy: '搞笑段子', news: '热点新闻', celebrity: '明星八卦', drama: '短剧', social: '社会民生', tech: '科技数码', anime: '动漫新番', game: '游戏攻略', review: '影视解说', meme: '鬼畜/梗', tutorial: '硬核教程', question: '热榜提问', career: '职场', science: '科普', history: '历史', relationship: '情感', ootd: '穿搭', makeup: '美妆', travel: '旅游', food: '美食', decor: '装修' },
    dashboard: { welcome: '欢迎回来', subtitle: '今日概况', topGenre: '热门流派', hotTrope: '热门梗', dailyGoal: '每日目标', wordsWritten: '今日字数', genreIndex: '流派热度', platformShare: '平台份额', trending: '本周', trendingPlatforms: '多平台热推', heat: '热度', readCount: '阅读', source: '来源', socialIntel: '热梗 Top 20', rank: '排名', topic: '话题', change: '变化', timeRange: '周期', selectPlatform: '平台', weekly: '本周', monthly: '本月', historical: '累计', trafficBreakdown: '流量分布', activeUsers: '月活', growth: '增长', others: '其他', portals: '数据入口', officialSite: '官网', rankings: '榜单' },
    market: { title: '市场排行榜', allCategories: '所有分类', hotScore: '热度值', deconstruct: '拆解', platform: '平台', author: '作者' },
    lab: { sourceText: '原文', analyzeBtn: '分析', analyzing: '拆解中...', viralFactors: '爆款报告', pacing: '节奏分析', characters: '角色研究', placeholder: '粘贴文本...', emptyState: '运行分析', modes: { viral: '爆款因子', pacing: '节奏', chars: '角色' }, historyTitle: '记录' },
    studio: { tabDaily: '每日灵感', tabTools: 'AI工具', dailyGenTitle: '每日生成', dailyGenDesc: '生成创意', trendLabel: '趋势焦点', trendPlaceholder: '例：赛博朋克...', generateBtn: '生成故事', generating: '生成中...', generatingBackground: '后台生成中...', backgroundTip: '可离开页面', emptyDaily: '灵感展示区', toolContinue: '续写', toolRewrite: '改写', toolPolish: '润色', toolPlaceholder: '粘贴草稿...', processing: '处理中...', emptyTool: 'AI输出...', historyTitle: '历史' },
    architect: {
      placeholder: "输入小说前提...", synopsisPlaceholder: "简介 (可选)", designBtn: '设计大纲', tip: '点击节点修改', description: '描述', content: '正文', generateDraft: '生成草稿', writing: '写作中...', noContent: '暂无内容',
      types: { book: '书名', act: '卷/幕', chapter: '章节', scene: '场景' },
      historyTitle: '存档', load: '加载', actions: '操作', addChild: '加子节点', addSibling: '加兄弟节点', deleteNode: '删除', aiExpand: 'AI生细纲', expanding: 'AI思考中...', nodeName: '名称', nodeDesc: '描述', confirmDelete: '确定删除？',
      mapControls: { zoomIn: '放大', zoomOut: '缩小', fit: '适配' },
      views: { map: '蓝图视图', manuscript: '正文视图' },
      cover: { generate: '生成封面', regenerating: '绘制中...', promptLabel: '封面提示词', styleLabel: '艺术风格', modelLabel: '绘图模型' },
      prompts: { title: '提示词库', select: '选择文风/滤镜', add: '添加新预设', name: '预设名称', instruction: '系统指令内容' }
    },
    mindmap: { empty: '生成大纲以查看' },
    onboarding: { skip: '跳过', next: '下一步', finish: '开始', steps: { welcome: {title:'欢迎', desc:'您的专属工作室'}, dashboard: {title:'仪表盘', desc:'查看进度与趋势'}, market: {title:'市场趋势', desc:'分析热门小说'}, lab: {title:'拆书实验室', desc:'AI分析文风节奏'}, studio: {title:'写作工作室', desc:'灵感与辅助写作'}, architect: {title:'故事架构师', desc:'构建大纲与正文'}, settings: {title:'设置', desc:'语言与模型'} } }
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
    let current: any = translations[lang] || translations['zh']; 
    for (const key of keys) {
      if (current[key] === undefined) {
          let fallback = translations['zh']; 
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
