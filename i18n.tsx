
import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from './services/storageService';

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de';

const translations: Record<Language, any> = {
  en: {
    app: { title: 'InkFlow AI' },
    login: { title: 'InkFlow AI Login', subtitle: 'Select your access role', userBtn: 'Author Login', adminBtn: 'Admin Login', userDesc: 'Enter Creative Suite', adminDesc: 'View System Data' },
    admin: { title: 'Admin Dashboard', tabUsers: 'Users', tabLab: 'Lab Data', tabStudio: 'Studio Data', tabArchitect: 'Architect Data', refresh: 'Refresh', clearAll: 'Clear', empty: 'No Records', id: 'ID', timestamp: 'Time', content: 'Content', type: 'Type', exit: 'Exit' },
    models: { lite: 'Gemini Flash Lite', flash: 'Gemini 2.5 Flash', pro: 'Gemini 3 Pro' },
    quota: { dailyLimit: 'Daily Limit', rpm: 'RPM', remaining: 'Remaining', errorTitle: 'Quota Exceeded', errorDesc: 'Limit reached.' },
    common: { history: 'History', save: 'Save', delete: 'Delete', view: 'View', today: 'Today', yesterday: 'Yesterday', noHistory: 'No history', refresh: 'Refresh', logout: 'Logout', bgTask: 'Working in background...', safeToLeave: 'Safe to navigate', remainingTime: 'Est: {time}s', errorTitle: 'Error', errorDesc: 'Unexpected error.', reload: 'Reload', logs: 'Logs', level: 'Level', message: 'Message', edit: 'Edit', cancel: 'Cancel', confirm: 'Confirm', close: 'Close', add: 'Add', manage: 'Manage', apply: 'Apply', export: 'Export', import: 'Import' },
    nav: { dashboard: 'Dashboard', market: 'Market & Analysis', studio: 'Writing Studio', architect: 'Story Architect', coverStudio: 'Art Studio', chat: 'AI Chat', powered: 'Powered by Google Gemini' },
    settings: { title: 'Settings', language: 'Language', model: 'Model', modelHelp: 'Lite, Flash, Pro', resetGuide: 'Reset Guide' },
    sources: { title: 'Sources', label: 'Platforms:', douyin: 'Douyin', kuaishou: 'Kuaishou', bilibili: 'Bilibili', baidu: 'Baidu', weibo: 'Weibo', xiaohongshu: 'RedBook', fanqie: 'Fanqie', qidian: 'Qidian', jinjiang: 'Jinjiang', zhihu: 'Zhihu', zongheng: 'Zongheng', all: 'All' },
    dataDoc: { title: 'Data Methodology', btnLabel: 'Methodology', method: { title: 'Method', desc: 'API Aggregation + AI Analysis' }, sources: { title: 'Sources', desc: 'Official Rankings' }, reliability: { title: 'Reliability', desc: 'Cross-verification' } },
    genres: { xianxia: 'Xianxia', urban: 'Urban', fantasy: 'Fantasy', scifi: 'Sci-Fi', history: 'History', gaming: 'Gaming', horror: 'Horror', sports: 'Sports', war: 'War/God', romance80s: 'Rebirth 80s', ceo: 'CEO/Romance', farming: 'Farming', survival: 'Survival', zombie: 'Zombie', pet: 'Pet/Taming', star: 'Showbiz', danmei: 'BL/Danmei', ancient: 'Ancient Romance', entertainment: 'Entertainment', campus: 'Campus', interstellar: 'Interstellar', unlimited: 'Unlimited Flow', western: 'Western Fantasy' },
    topics: { 
        challenge: 'Challenge', dance: 'Dance', pov: 'POV', lifehack: 'Lifehack', comedy: 'Comedy', 
        news: 'News', celebrity: 'Gossip', drama: 'Drama', social: 'Social', tech: 'Tech', 
        anime: 'Anime', game: 'Gaming', review: 'Review', meme: 'Meme', tutorial: 'Tutorial', 
        question: 'Question', career: 'Career', science: 'Science', history: 'History', relationship: 'Relationship', 
        ootd: 'OOTD', makeup: 'Makeup', travel: 'Travel', food: 'Food', decor: 'Decor',
        // Novel Specific
        system: 'System Stream', rebirth: 'Rebirth', transmigration: 'Transmigration', counterattack: 'Face Slapping',
        invincible: 'Invincible Start', goudao: 'Low Profile', detective: 'Investigation', infinite: 'Infinite Flow',
        simulation: 'Life Sim', horror_recovery: 'Mystery Recovery', cyberpunk: 'Cyberpunk'
    },
    dashboard: { welcome: 'Welcome Back', subtitle: 'Daily Overview', topGenre: 'Top Genre', hotTrope: 'Hot Trope', dailyGoal: 'Goal', wordsWritten: 'Words', genreIndex: 'Genre Heat', platformShare: 'Platform Share', trending: 'Week', trendingPlatforms: 'Trending', heat: 'Heat', readCount: 'Reads', source: 'Source', socialIntel: 'Trope & Trend Intel', rank: 'Rank', topic: 'Topic', change: 'Change', timeRange: 'Range', selectPlatform: 'Platform', weekly: 'Weekly', monthly: 'Monthly', historical: 'All Time', trafficBreakdown: 'Traffic', activeUsers: 'MAU', growth: 'Growth', others: 'Others', portals: 'Portals', officialSite: 'Site', rankings: 'Ranks' },
    market: { 
        title: 'Market & Analysis', 
        tabs: { rankings: 'Rankings', analysis: 'Deconstruction' },
        urlPlaceholder: 'Paste novel link here (e.g., https://...)',
        analyzeBtn: 'Analyze Link',
        allCategories: 'All Categories', hotScore: 'Hot Score', deconstruct: 'Analyze', platform: 'Platform', author: 'Author' 
    },
    lab: { sourceText: 'Source Link', analyzeBtn: 'Analyze', analyzing: 'Analyzing...', viralFactors: 'Viral Factors', pacing: 'Pacing Analysis', characters: 'Character Analysis', placeholder: 'Paste text here...', emptyState: 'Run analysis to see results', modes: { viral: 'Viral', pacing: 'Pacing', chars: 'Chars' }, historyTitle: 'Records' },
    studio: { 
        tabDaily: 'Inspiration', tabTools: 'Tools', dailyGenTitle: 'Daily Gen', dailyGenDesc: 'Generate Ideas', trendLabel: 'Trend Focus', trendPlaceholder: 'e.g., Cyberpunk...', generateBtn: 'Generate 5 Ideas', generating: 'Generating...', generatingBackground: 'Processing...', backgroundTip: 'Safe to leave', emptyDaily: 'Output Area', toolContinue: 'Continue', toolRewrite: 'Rewrite', toolPolish: 'Polish', toolPlaceholder: 'Paste draft...', processing: 'Working...', emptyTool: 'AI Output...', historyTitle: 'History',
        targetAudience: 'Target Audience', maleFreq: 'Male Frequency', femaleFreq: 'Female Frequency',
        genStory: 'Generate Story', config: { title: 'Configuration', type: 'Type', short: 'Short Story', long: 'Serial Novel', wordCount: 'Word Count', chapterCount: 'Est. Chapters', wordsPerChapter: 'Words/Chapter', style: 'Writing Style' }, records: { inspiration: 'Inspiration', story: 'Story' },
        meta: { source: 'Source', gender: 'Gender', category: 'Category', trope: 'Trope', synopsis: 'Synopsis', coolPoint: 'Cool Point', burstPoint: 'Burst Point', goldenFinger: 'Cheat Code', coolSystem: 'Cool System', memoryAnchor: 'Memory Hook', theme: 'Theme', character: 'Character', plot: 'Plot Type' },
        context: { title: 'Novel Architecture', edit: 'Edit Settings', apply: 'Apply (Rewrite)', applying: 'Rewriting...', manuscript: 'Manuscript Folder' },
        maps: { world: 'World Setting', system: 'Cool System', mission: 'Mission Archive', character: 'Character Status', anchor: 'Memory Anchors', structure: 'Outline', events: 'Major Events', chapters: 'Chapter Outline' },
        analyzeTrend: 'Get Trend (New Book List)', analyzingTrend: 'Analyzing...', promptLib: 'Prompt Library',
        tree: { maps: 'Mind Maps', manuscript: 'Manuscript' },
        editor: { aiModify: 'AI Modify', manual: 'Manual Edit', selectPrompt: 'Select Prompt', insertIllu: 'Insert Illustration', illuMode: 'Illustration Mode', illuContext: 'Analyze Cursor Context', illuPrompt: 'Custom Prompt', illuUpload: 'Upload Image', generateIllu: 'Generate' },
        historyMenu: { createMap: 'Add Mind Map', createContent: 'Add Chapter', exportJson: 'Export Backup (JSON)', exportZip: 'Export ZIP (MD+TXT)' },
        manual: { newMapTitle: 'Create Mind Map', mapType: 'Map Type', rootName: 'Root Name', newChapTitle: 'Create Chapter', chapTitle: 'Chapter Title', create: 'Create' }
    },
    architect: {
      placeholder: "Enter novel premise...", synopsisPlaceholder: "Synopsis (Optional)", designBtn: 'Design Outline', tip: 'Click node to edit', description: 'Description', content: 'Content', generateDraft: 'Generate Draft', writing: 'Writing...', noContent: 'No content',
      types: { book: 'Book', act: 'Act', chapter: 'Chapter', scene: 'Scene', character: 'Char', setting: 'Setting', system: 'System', item: 'Item', event: 'Event' },
      historyTitle: 'Archives', load: 'Load', actions: 'Actions', addChild: 'Add Child', addSibling: 'Add Sibling', deleteNode: 'Delete', aiExpand: 'AI Expand', expanding: 'Thinking...', nodeName: 'Name', nodeDesc: 'Description', confirmDelete: 'Delete node?',
      mapControls: { zoomIn: 'Zoom In', zoomOut: 'Zoom Out', fit: 'Fit' },
      views: { map: 'Blueprint', manuscript: 'Manuscript' },
      cover: { 
          generate: 'Generate Cover', 
          regenerating: 'Painting...', 
          promptLabel: 'Prompt', 
          styleLabel: 'Style', 
          modelLabel: 'Model',
          styles: {
            epic: 'Epic Fantasy (Xianxia)',
            cyberpunk: 'Cyberpunk',
            watercolor: 'Watercolor',
            oil: 'Oil Painting',
            anime: 'Anime',
            horror: 'Realistic Horror',
            vector: 'Minimalist Vector',
            gothic: 'Gothic'
          }
      },
      prompts: { title: 'Prompt Library', select: 'Select Style', add: 'Add New', name: 'Name', instruction: 'Instruction', save: 'Save Template' }
    },
    chat: { newChat: 'New Chat', placeholder: 'Ask anything...', send: 'Send', model: 'Model', history: 'History', empty: 'Start a new conversation' },
    mindmap: { empty: 'Generate outline to view' },
    onboarding: { skip: 'Skip', next: 'Next', finish: 'Start', steps: { welcome: {title:'Welcome', desc:'Your Personal Studio'}, dashboard: {title:'Dashboard', desc:'Track trends'}, market: {title:'Market', desc:'Analyze hits'}, lab: {title:'Lab', desc:'Deep analysis'}, studio: {title:'Studio', desc:'Write & Inspire'}, architect: {title:'Architect', desc:'Build structures'}, settings: {title:'Settings', desc:'Config'} } }
  },
  zh: {
    app: { title: '个人AI小说生成系统' },
    login: { title: 'InkFlow AI 登录', subtitle: '请选择您的访问身份', userBtn: '作者登录', adminBtn: '管理员登录', userDesc: '进入创作系统', adminDesc: '查看本地数据' },
    admin: { title: '系统管理后台', tabUsers: '用户信息', tabLab: '拆书数据', tabStudio: '工作室数据', tabArchitect: '大纲数据', refresh: '刷新', clearAll: '清空', empty: '无记录', id: 'ID', timestamp: '时间', content: '内容', type: '类型', exit: '退出' },
    models: { lite: 'Gemini Flash Lite', flash: 'Gemini 2.5 Flash', pro: 'Gemini 3 Pro' },
    quota: { dailyLimit: '每日额度', rpm: '频率限制', remaining: '剩余', errorTitle: '配额超限', errorDesc: '已达限制。' },
    common: { history: '历史记录', save: '保存', delete: '删除', view: '查看', today: '今天', yesterday: '昨天', noHistory: '无记录', refresh: '刷新', logout: '退出', bgTask: '后台运行中...', safeToLeave: '可离开页面', remainingTime: '预计剩余: {time}秒', errorTitle: '出错了', errorDesc: '意外错误。', reload: '重载', logs: '日志', level: '级别', message: '信息', edit: '编辑', cancel: '取消', confirm: '确认', close: '关闭', add: '添加', manage: '管理', apply: '应用', export: '导出', import: '导入' },
    nav: { dashboard: '仪表盘', market: '市场与拆解', studio: '写作工作室', architect: '故事架构师', coverStudio: '封面工作室', chat: 'AI 对话', powered: '由智能 AI 驱动' },
    settings: { title: '设置', language: '语言', model: '模型', modelHelp: 'Lite, Flash, Pro', resetGuide: '重置引导' },
    sources: { title: '数据来源', label: '选择平台：', douyin: '抖音', kuaishou: '快手', bilibili: 'B站', baidu: '百度', weibo: '微博', xiaohongshu: '小红书', fanqie: '番茄', qidian: '起点', jinjiang: '晋江', zhihu: '知乎', zongheng: '纵横', all: '全选' },
    dataDoc: { title: '数据说明', btnLabel: '算法文档', method: { title: '获取方式', desc: 'API聚合+AI分析' }, sources: { title: '来源', desc: '官方榜单' }, reliability: { title: '真实性', desc: '交叉验证' } },
    genres: { xianxia: '仙侠修真', urban: '都市系统', fantasy: '东方玄幻', scifi: '科幻无限', history: '历史谋略', gaming: '网游竞技', horror: '悬疑灵异', sports: '体育竞技', war: '都市战神', romance80s: '年代重生', ceo: '总裁豪门', farming: '种田文', survival: '直播求生', zombie: '末世危机', pet: '御兽进化', star: '文娱巨星', danmei: '纯爱/耽美', ancient: '古言', entertainment: '娱乐圈', campus: '青春校园', interstellar: '星际', unlimited: '无限流', western: '西幻' },
    topics: { 
        challenge: '挑战', dance: '手势舞', pov: '第一视角', lifehack: '生活妙招', comedy: '搞笑段子', 
        news: '热点新闻', celebrity: '明星八卦', drama: '短剧', social: '社会民生', tech: '科技数码', 
        anime: '动漫新番', game: '游戏攻略', review: '影视解说', meme: '鬼畜/梗', tutorial: '硬核教程', 
        question: '热榜提问', career: '职场', science: '科普', history: '历史', relationship: '情感', 
        ootd: '穿搭', makeup: '美妆', travel: '旅游', food: '美食', decor: '装修',
        // Novel Specific
        system: '系统流', rebirth: '重生', transmigration: '穿越', counterattack: '打脸/逆袭',
        invincible: '无敌开局', goudao: '苟道/稳健', detective: '刑侦/破案', infinite: '无限流',
        simulation: '人生模拟', horror_recovery: '诡异复苏', cyberpunk: '赛博朋克'
    },
    dashboard: { welcome: '欢迎回来', subtitle: '今日概况', topGenre: '热门流派', hotTrope: '热门梗', dailyGoal: '每日目标', wordsWritten: '今日字数', genreIndex: '流派热度', platformShare: '平台份额', trending: '本周', trendingPlatforms: '多平台热推', heat: '热度', readCount: '阅读', source: '来源', socialIntel: '热梗与趋势情报', rank: '排名', topic: '话题/梗', change: '变化', timeRange: '周期', selectPlatform: '平台', weekly: '本周', monthly: '本月', historical: '累计', trafficBreakdown: '流量分布', activeUsers: '月活', growth: '增长', others: '其他', portals: '数据入口', officialSite: '官网', rankings: '榜单' },
    market: { 
        title: '市场排行榜与拆解', 
        tabs: { rankings: '热门榜单', analysis: '链接拆解' },
        urlPlaceholder: '在此粘贴小说链接 (例如 https://...)',
        analyzeBtn: '拆解链接',
        allCategories: '所有分类', hotScore: '热度值', deconstruct: '拆解', platform: '平台', author: '作者' 
    },
    lab: { sourceText: '小说链接', analyzeBtn: '开始分析', analyzing: 'AI 阅读中...', viralFactors: '爆款报告', pacing: '节奏分析', characters: '角色研究', placeholder: '粘贴文本...', emptyState: '粘贴链接并分析', modes: { viral: '爆款因子', pacing: '节奏', chars: '角色' }, historyTitle: '分析记录' },
    studio: { 
        tabDaily: '每日灵感', tabTools: 'AI工具', dailyGenTitle: '每日生成', dailyGenDesc: '生成创意', trendLabel: '趋势焦点', trendPlaceholder: '例：赛博朋克...', generateBtn: '生成5个灵感', generating: '生成中...', generatingBackground: '后台生成中...', backgroundTip: '可离开页面', emptyDaily: '灵感展示区', toolContinue: '续写', toolRewrite: '改写', toolPolish: '润色', toolPlaceholder: '粘贴草稿...', processing: '处理中...', emptyTool: 'AI输出...', historyTitle: '历史',
        targetAudience: '目标读者', maleFreq: '男频', femaleFreq: '女频',
        genStory: '生成小说', config: { title: '生成配置', type: '类型', short: '短篇小说', long: '连载长篇', wordCount: '目标字数', chapterCount: '预估章数', wordsPerChapter: '每章字数', style: '文风预设' }, records: { inspiration: '灵感批次', story: '生成小说' },
        meta: { source: '来源', gender: '频段', category: '主分类', trope: '梗/类型', synopsis: '简介', coolPoint: '爽点', burstPoint: '爆点', goldenFinger: '金手指', coolSystem: '爽点体系', memoryAnchor: '记忆锚点', theme: '主题', character: '角色原型', plot: '情节类型' },
        context: { title: '小说架构全景', edit: '修改设定', apply: '立即生效(重写)', applying: '重写中...', manuscript: '正文文件夹' },
        maps: { world: '世界设定', system: '爽点体系', mission: '任务档案', character: '角色状态', anchor: '记忆锚点', structure: '作品大纲', events: '大事件简纲', chapters: '章节细纲' },
        analyzeTrend: '获取焦点 (新书榜)', analyzingTrend: '爬取中...', promptLib: '提示词库',
        tree: { maps: '思维导图', manuscript: '正文稿件' },
        editor: { aiModify: 'AI 修改', manual: '手动编辑', selectPrompt: '选择提示词', insertIllu: '插入插图', illuMode: '插图模式', illuContext: '分析光标上下文', illuPrompt: '自定义描述', illuUpload: '上传图片', generateIllu: '生成插图' },
        historyMenu: { createMap: '新增思维导图', createContent: '新增正文', exportJson: '导出备份(JSON)', exportZip: '导出压缩包(MD+TXT)' },
        manual: { newMapTitle: '新建思维导图', mapType: '导图类型', rootName: '根节点名称', newChapTitle: '新建章节', chapTitle: '章节名称', create: '创建' }
    },
    architect: {
      placeholder: "输入小说前提...", synopsisPlaceholder: "简介 (可选)", designBtn: '设计大纲', tip: '点击节点修改', description: '描述', content: '正文', generateDraft: '生成草稿', writing: '写作中...', noContent: '暂无内容',
      types: { book: '书名', act: '卷/幕', chapter: '章节', scene: '场景', character: '角色', setting: '设定', system: '体系', item: '物品', event: '事件' },
      historyTitle: '存档', load: '加载', actions: '操作', addChild: '加子节点', addSibling: '加兄弟节点', deleteNode: '删除', aiExpand: 'AI生细纲', expanding: 'AI思考中...', nodeName: '名称', nodeDesc: '描述', confirmDelete: '确定删除？',
      mapControls: { zoomIn: '放大', zoomOut: '缩小', fit: '适配' },
      views: { map: '蓝图视图', manuscript: '正文视图' },
      cover: { 
          generate: '生成封面', 
          regenerating: '绘制中...', 
          promptLabel: '封面提示词', 
          styleLabel: '艺术风格', 
          modelLabel: '绘图模型',
          styles: {
            epic: '东方仙侠/玄幻',
            cyberpunk: '赛博朋克',
            watercolor: '水彩画风',
            oil: '厚涂油画',
            anime: '日系动漫',
            horror: '写实恐怖',
            vector: '极简矢量',
            gothic: '哥特暗黑'
          }
      },
      prompts: { title: '提示词库', select: '选择文风/滤镜', add: '添加新预设', name: '预设名称', instruction: '系统指令内容', save: '保存预设' }
    },
    chat: { newChat: '新对话', placeholder: '输入消息...', send: '发送', model: '模型', history: '历史记录', empty: '开始新的对话' },
    mindmap: { empty: '生成大纲以查看' },
    onboarding: { skip: '跳过', next: '下一步', finish: '开始', steps: { welcome: {title:'欢迎', desc:'您的专属工作室'}, dashboard: {title:'仪表盘', desc:'查看进度与趋势'}, market: {title:'市场趋势', desc:'分析热门小说'}, lab: {title:'拆书实验室', desc:'AI分析文风节奏'}, studio: {title:'写作工作室', desc:'灵感与辅助写作'}, architect: {title:'故事架构师', desc:'构建大纲与正文'}, settings: {title:'设置', desc:'语言与模型'} } }
  },
  // Placeholders for other languages
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
