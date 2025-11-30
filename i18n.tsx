
/**
 * @file i18n.tsx
 * @description 国际化 (i18n) 处理系统。
 * 
 * ## 功能
 * - 提供轻量级 Context Provider (`I18nProvider`) 支持多语言。
 * - 存储基于 JSON 结构的翻译字典。
 * - 处理回退逻辑 (缺失键时回退到中文)。
 * - 持久化语言选择到本地存储。
 * 
 * ## AI 集成
 * - 不直接连接 AI，但提供 `lang` 参数给 AI 提示词 (`geminiService` 中的 `getLangInstruction`)。
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { saveToStorage, loadFromStorage, STORAGE_KEYS } from './services/storageService';

export type Language = 'en' | 'zh' | 'ja' | 'es' | 'fr' | 'de';

const translations: Record<Language, any> = {
  en: {
    app: { title: 'InkFlow AI' },
    login: { title: 'InkFlow AI Login', subtitle: 'Select your access role', userBtn: 'Author Login', adminBtn: 'Admin Login', userDesc: 'Enter Creative Suite', adminDesc: 'View System Data' },
    admin: { title: 'Admin Dashboard', tabUsers: 'Users', tabLab: 'Lab Data', tabStudio: 'Studio Data', tabArchitect: 'Architect Data', tabConfig: 'Model Config', refresh: 'Refresh', clearAll: 'Clear', empty: 'No Records', id: 'ID', timestamp: 'Time', content: 'Content', type: 'Type', exit: 'Exit', exportAll: 'Export All Data',
        config: { title: 'Model Resource Limits', reset: 'Reset to Defaults', modelName: 'Model Name', rpm: 'RPM (Req/Min)', rpd: 'Daily Limit (Req/Day)', context: 'Context Window (Tokens)', save: 'Save Config', saved: 'Configuration saved.' }
    },
    models: { 
        lite: 'Gemini Flash Lite', 
        flash: 'Gemini 2.5 Flash', 
        pro: 'Gemini 3 Pro',
        descLite: 'Cost-effective, high speed. Best for simple drafting and brainstorming.',
        descFlash: 'Balanced performance. Good for most writing tasks and standard logic.',
        descPro: 'High reasoning capability. Best for complex plot architecture, logic checks, and deep analysis. (Higher Cost)'
    },
    quota: { 
        dailyLimit: 'Daily Limit', 
        rpm: 'RPM', 
        remaining: 'Remaining',
        used: 'Used',
        reset: 'Resets Daily', 
        errorTitle: 'Quota Exceeded', 
        errorDesc: 'API Limit reached. Please wait a moment or switch models.' 
    },
    common: { 
        history: 'History', save: 'Save', delete: 'Delete', view: 'View', today: 'Today', yesterday: 'Yesterday', noHistory: 'No history', refresh: 'Refresh', logout: 'Logout', bgTask: 'Working in background...', safeToLeave: 'Safe to navigate', remainingTime: 'Est: {time}s', 
        errorTitle: 'Error', 
        errorDesc: 'An unexpected error occurred. Please check your network connection.', 
        reload: 'Reload', logs: 'Logs', level: 'Level', message: 'Message', edit: 'Edit', cancel: 'Cancel', confirm: 'Confirm', close: 'Close', add: 'Add', manage: 'Manage', apply: 'Apply', export: 'Export', import: 'Import', selectAll: 'Select All', deselectAll: 'Deselect All', selected: 'Selected',
        search: 'Search...'
    },
    nav: { dashboard: 'Dashboard', market: 'Market & Analysis', studio: 'Writing Studio', architect: 'Story Architect', coverStudio: 'Art Studio', chat: 'AI Chat', workflow: 'Auto Workflow', powered: 'Powered by Google Gemini' },
    settings: { title: 'Settings', language: 'Language', model: 'Model', modelHelp: 'Lite, Flash, Pro', resetGuide: 'Reset Guide', dataManager: 'Data & Export', globalPersona: 'Global Persona' },
    globalPersona: {
        title: 'Global AI Persona Library',
        desc: 'Define the core persona of the AI. The ACTIVE persona will be applied to ALL generation tasks as System Instruction.',
        reset: 'Reset to Default',
        placeholder: 'Enter system instructions here...',
        saveSuccess: 'Persona updated successfully.',
        active: 'Active',
        library: 'Library',
        name: 'Name',
        description: 'Description',
        instruction: 'System Instruction',
        new: 'New Persona',
        apply: 'Apply as Active',
        saveToLib: 'Save to Library',
        delete: 'Delete'
    },
    dataManager: { 
        title: 'Data Import/Export', 
        tabs: { prompts: 'Prompt Library', novels: 'Novels (Studio)' },
        exportBtn: 'Export Selected',
        importBtn: 'Import Data',
        importTip: 'Supports JSON files exported from InkFlow.',
        successImport: 'Successfully imported data!',
        errorImport: 'Failed to import data. Invalid format.'
    },
    promptLib: {
        title: 'Prompt Library',
        manageTitle: 'Manage Prompts',
        newPrompt: 'New Prompt',
        editPrompt: 'Edit Prompt',
        namePlaceholder: 'e.g. Cyberpunk Style',
        contentPlaceholder: 'Enter system instructions or style guide...',
        tagsPlaceholder: 'Tags (comma separated)',
        saveSuccess: 'Prompt saved successfully.',
        deleteConfirm: 'Are you sure you want to delete this prompt?',
        empty: 'No prompts found. Create one!'
    },
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
    dashboard: { welcome: 'Welcome Back', subtitle: 'Daily Overview', topGenre: 'Top Genre', hotTrope: 'Hot Trope', dailyGoal: 'Goal', wordsWritten: 'Words', genreIndex: 'Genre Heat', platformShare: 'Platform Share', trending: 'Week', trendingPlatforms: 'Trending', heat: 'Heat', readCount: 'Reads', source: 'Source', socialIntel: 'Trope & Trend Intel', rank: 'Rank', topic: 'Topic', change: 'Change', timeRange: 'Range', selectPlatform: 'Platform', weekly: 'Weekly', monthly: 'Monthly', historical: 'All Time', trafficBreakdown: 'Traffic', activeUsers: 'MAU', growth: 'Growth', others: 'Others', portals: 'Portals', officialSite: 'Site', rankings: 'Ranks',
    aiResource: 'AI Resources', currentModel: 'Current Model', totalTokens: 'Total Tokens'
    },
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
        meta: { source: 'Source', gender: 'Gender', category: 'Category', trope: 'Trope', synopsis: 'Synopsis', coolPoint: 'Cool Point', burstPoint: 'Burst Point', goldenFinger: 'Golden Finger', coolSystem: 'Cool System', memoryAnchor: 'Memory Anchor', theme: 'Theme', character: 'Character', plot: 'Plot Type' },
        context: { title: 'Novel Architecture', edit: 'Edit Settings', apply: 'Apply (Rewrite)', applying: 'Rewriting...', manuscript: 'Manuscript Folder' },
        mapGroup: { core: 'Core Settings', plot: 'Plot Planning' },
        maps: { world: 'World Setting', system: 'Cool System', mission: 'Char Status Template', character: 'Character Profile', anchor: 'Plot Anchors', structure: 'Volume Outline', events: 'Event Flow', chapters: 'Unit Outline' },
        analyzeTrend: 'Get Trend (New Book List)', analyzingTrend: 'Analyzing...', promptLib: 'Prompt Library',
        tree: { maps: 'Mind Maps', manuscript: 'Manuscript', regenerate: 'Regenerate Map', selectContext: 'Select Precedent Context', contextTip: 'Select other maps to guide generation' },
        editor: { aiModify: 'AI Modify', manual: 'Manual Edit', selectPrompt: 'Select Prompt', insertIllu: 'Insert Illustration', illuMode: 'Illustration Mode', illuContext: 'Analyze Cursor Context', illuPrompt: 'Custom Prompt', illuUpload: 'Upload Image', generateIllu: 'Generate', preview: 'Preview', edit: 'Edit' },
        historyMenu: { createMap: 'Add Mind Map', createContent: 'Add Chapter', exportJson: 'Export Backup (JSON)', exportZip: 'Export ZIP (MD+TXT)' },
        manual: { newMapTitle: 'Create Mind Map', mapType: 'Map Type', rootName: 'Root Name', newChapTitle: 'Create Chapter', chapTitle: 'Chapter Title', create: 'Create', defaultChapter: 'Chapter', untitled: 'Untitled', addChapter: 'Add Chapter' },
        folder: { manuscript: 'Manuscript Folder', files: 'Files' },
        inspector: { title: 'Node Inspector', name: 'Name', desc: 'Description', save: 'Save Changes', generate: 'Generate Draft', wordCount: 'Target Word Count' },
        contextWarning: { 
            title: 'Large Context Warning', 
            desc: 'The amount of context data (World/Character maps) exceeds the safe threshold for this model. Sending too much data may cause timeouts or high costs.',
            original: 'Full Context',
            truncated: 'Safe Limit',
            preview: 'Content to be removed:',
            sendFull: 'Send Full (Risk Timeout)',
            truncateSend: 'Truncate & Send'
        }
    },
    architect: {
      placeholder: "Enter novel premise...", synopsisPlaceholder: "Synopsis (Optional)", designBtn: 'Design Outline', tip: 'Click node to edit', description: 'Description', content: 'Content', generateDraft: 'Generate Draft', writing: 'Writing...', noContent: 'No content',
      types: { book: 'Book', volume: 'Volume', act: 'Act', chapter: 'Chapter', scene: 'Scene', character: 'Char', setting: 'Setting', system: 'System', item: 'Item', event: 'Event' },
      historyTitle: 'Archives', load: 'Load', actions: 'Actions', addChild: 'Add Child', addSibling: 'Add Sibling', structureActions: 'Structure Actions', deleteNode: 'Delete', aiExpand: 'AI Structure', expandStyle: 'Expansion Style', defaultStyle: 'Default Logic', expandBtn: 'Generate Sub-tree', expanding: 'Thinking...', nodeName: 'Name', nodeDesc: 'Description', confirmDelete: 'Delete node?',
      mapControls: { zoomIn: 'Zoom In', zoomOut: 'Zoom Out', fit: 'Fit' },
      views: { map: 'Blueprint', manuscript: 'Manuscript' },
      stats: { totalWords: 'Total Words', totalChapters: 'Total Chapters', volume: 'Volume' },
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
    taskMonitor: {
        title: 'Task Monitor',
        active: 'Active Tasks',
        logs: 'Task Logs',
        noTasks: 'No active tasks.',
        stop: 'Stop',
        status: { running: 'Running', completed: 'Success', error: 'Failed', cancelled: 'Cancelled' },
        types: { inspiration: 'Daily Inspiration', story: 'Story Generation', map_regen: 'Map Regenerate', draft: 'Drafting' },
        labels: {
            genInspiration: 'Generating Daily Inspiration',
            analyzeTrend: 'Analyzing Market Trends',
            genStory: 'Building Story',
            regenMap: 'Regenerating Map',
            drafting: 'Drafting Content'
        },
        metrics: {
            tokens: 'Tokens',
            latency: 'Latency',
            model: 'Model',
            total: 'Total',
            in: 'In',
            out: 'Out'
        },
        debug: {
            title: 'Debug Details',
            prompt: 'Prompt',
            context: 'Context',
            model: 'Model'
        }
    },
    workflow: {
        title: 'Automated Novel Workflow',
        config: 'Configuration',
        idea: 'Story Idea / Premise',
        style: 'Writing Style',
        wordCount: 'Word Count / Chapter',
        progress: 'Progress Log',
        start: 'Start Automation',
        stop: 'Stop',
        status: { idle: 'Idle', running: 'Running', paused: 'Paused', complete: 'Complete' },
        logs: { start: 'Workflow started...', generatingArch: 'Generating Architecture...', archComplete: 'Architecture created. Title: {title}', generatingChap: 'Generating Chapter: {title}...', chapComplete: 'Chapter {index} completed.', done: 'Workflow finished.' }
    },
    chat: { newChat: 'New Chat', placeholder: 'Ask anything...', send: 'Send', model: 'Model', history: 'History', empty: 'Start a new conversation' },
    mindmap: { empty: 'Generate outline to view' },
    onboarding: { skip: 'Skip', next: 'Next', finish: 'Start', steps: { welcome: {title:'Welcome', desc:'Your Personal Studio'}, dashboard: {title:'Dashboard', desc:'Track trends'}, market: {title:'Market', desc:'Analyze hits'}, lab: {title:'Lab', desc:'Deep analysis'}, studio: {title:'Studio', desc:'Write & Inspire'}, architect: {title:'Architect', desc:'Build structures'}, settings: {title:'Settings', desc:'Config'} } }
  },
  zh: {
    app: { title: '个人AI小说生成系统' },
    login: { title: 'InkFlow AI 登录', subtitle: '请选择您的访问身份', userBtn: '作者登录', adminBtn: '管理员登录', userDesc: '进入创作系统', adminDesc: '查看本地数据' },
    admin: { title: '系统管理后台', tabUsers: '用户信息', tabLab: '拆书数据', tabStudio: '工作室数据', tabArchitect: '大纲数据', tabConfig: '模型配置', refresh: '刷新', clearAll: '清空', empty: '无记录', id: 'ID', timestamp: '时间', content: '内容', type: '类型', exit: '退出', exportAll: '导出全部数据',
        config: { title: '模型资源与配额限制', reset: '恢复默认设置', modelName: '模型名称', rpm: '频率限制 (Req/Min)', rpd: '每日配额 (Req/Day)', context: '上下文窗口 (Tokens)', save: '保存配置', saved: '配置已更新。' }
    },
    models: { 
        lite: 'Gemini Flash Lite', 
        flash: 'Gemini 2.5 Flash', 
        pro: 'Gemini 3 Pro',
        descLite: '高性价比，响应速度快。适合简单的创意生成、润色和短篇草稿。',
        descFlash: '性能均衡。适合大多数写作任务、章节生成和一般逻辑处理。',
        descPro: '强推理能力。适合复杂的大纲架构、逻辑检查、长篇连贯性分析和深度创作。（消耗较高）'
    },
    quota: { 
        dailyLimit: '每日额度', 
        rpm: '频率限制', 
        remaining: '剩余次数',
        used: '已用次数',
        reset: '每日重置',
        errorTitle: '配额超限', 
        errorDesc: '今日API调用次数已达上限，或请求频率过高。请稍后重试或切换模型。' 
    },
    common: { 
        history: '历史记录', save: '保存', delete: '删除', view: '查看', today: '今天', yesterday: '昨天', noHistory: '无记录', refresh: '刷新', logout: '退出', bgTask: '后台运行中...', safeToLeave: '可离开页面', remainingTime: '预计剩余: {time}秒', 
        errorTitle: '出错了', 
        errorDesc: '发生未知错误，请检查网络连接。', 
        reload: '重载', logs: '日志', level: '级别', message: '信息', edit: '编辑', cancel: '取消', confirm: '确认', close: '关闭', add: '添加', manage: '管理', apply: '应用', export: '导出', import: '导入', selectAll: '全选', deselectAll: '取消全选', selected: '已选',
        search: '搜索...'
    },
    nav: { dashboard: '仪表盘', market: '市场与拆解', studio: '写作工作室', architect: '故事架构师', coverStudio: '封面工作室', chat: 'AI 对话', workflow: '自动化工作流', powered: '由智能 AI 驱动' },
    settings: { title: '设置', language: '语言', model: '模型', modelHelp: 'Lite, Flash, Pro', resetGuide: '重置引导', dataManager: '数据与导出', globalPersona: '全局身份' },
    globalPersona: {
        title: '全局 AI 身份库',
        desc: '定义 AI 的核心人设。当前激活的身份将作为 System Instruction 应用于所有生成任务。',
        reset: '恢复默认设定',
        placeholder: '在此输入系统指令...',
        saveSuccess: '身份库已更新。',
        active: '当前激活',
        library: '身份库',
        name: '身份名称',
        description: '简介',
        instruction: '系统指令',
        new: '新建身份',
        apply: '应用为当前身份',
        saveToLib: '保存到身份库',
        delete: '删除'
    },
    dataManager: { 
        title: '数据导入/导出', 
        tabs: { prompts: '提示词数据', novels: '工作室小说' },
        exportBtn: '导出选中项',
        importBtn: '导入数据',
        importTip: '支持导入 InkFlow 导出的 JSON 文件。',
        successImport: '数据导入成功！',
        errorImport: '导入失败，文件格式无效。'
    },
    promptLib: {
        title: '提示词库',
        manageTitle: '管理提示词',
        newPrompt: '新建提示词',
        editPrompt: '编辑提示词',
        namePlaceholder: '例：赛博修仙风格',
        contentPlaceholder: '在此输入系统指令或风格要求...',
        tagsPlaceholder: '标签 (逗号分隔)',
        saveSuccess: '提示词已保存。',
        deleteConfirm: '确定要删除此提示词吗？',
        empty: '暂无自定义提示词。'
    },
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
    dashboard: { welcome: '欢迎回来', subtitle: '今日概况', topGenre: '热门流派', hotTrope: '热门梗', dailyGoal: '每日目标', wordsWritten: '今日字数', genreIndex: '流派热度', platformShare: '平台份额', trending: '本周', trendingPlatforms: '多平台热推', heat: '热度', readCount: '阅读', source: '来源', socialIntel: '热梗与趋势情报', rank: '排名', topic: '话题/梗', change: '变化', timeRange: '周期', selectPlatform: '平台', weekly: '本周', monthly: '本月', historical: '累计', trafficBreakdown: '流量分布', activeUsers: '月活', growth: '增长', others: '其他', portals: '数据入口', officialSite: '官网', rankings: '榜单',
    aiResource: 'AI 资源消耗', currentModel: '当前模型', totalTokens: '总令牌消耗'
    },
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
        meta: { source: '来源', gender: '频段', category: '主分类', trope: '梗/类型', synopsis: '爆款简介', coolPoint: '爽点', burstPoint: '爆点', goldenFinger: '金手指', coolSystem: '爽点体系', memoryAnchor: '记忆锚点', theme: '主题', character: '角色原型', plot: '情节类型' },
        context: { title: '小说架构全景', edit: '修改设定', apply: '立即生效(重写)', applying: '重写中...', manuscript: '正文文件夹' },
        mapGroup: { core: '核心设定', plot: '剧情规划' },
        maps: { world: '世界设定', system: '爽点体系', mission: '角色状态模版', character: '角色档案', anchor: '剧情伏笔锚点', structure: '分卷大纲', events: '事件流', chapters: '单元细纲' },
        analyzeTrend: '获取焦点 (新书榜)', analyzingTrend: '爬取中...', promptLib: '提示词库',
        tree: { maps: '思维导图', manuscript: '正文稿件', regenerate: '重新生成导图', selectContext: '选择前置参考', contextTip: '选择其他已有的导图作为生成依据，可确保逻辑一致性。' },
        editor: { aiModify: 'AI 修改', manual: '手动编辑', selectPrompt: '选择提示词', insertIllu: '插入插图', illuMode: '插图模式', illuContext: '分析光标上下文', illuPrompt: '自定义描述', illuUpload: '上传图片', generateIllu: '生成插图', preview: '预览', edit: '编辑' },
        historyMenu: { createMap: '新增思维导图', createContent: '新增正文', exportJson: '导出备份(JSON)', exportZip: '导出压缩包(MD+TXT)' },
        manual: { newMapTitle: '新建思维导图', mapType: '导图类型', rootName: '根节点名称', newChapTitle: '新建章节', chapTitle: '章节名称', create: '创建', defaultChapter: '第', untitled: '无标题', addChapter: '新增章节' },
        folder: { manuscript: '正文文件夹', files: '文件' },
        inspector: { title: '节点检查器', name: '名称', desc: '描述', save: '保存更改', generate: '生成草稿', wordCount: '目标字数' },
        contextWarning: { 
            title: '上下文过大预警', 
            desc: '当前的上下文数据（世界观/角色导图）已超过模型的建议安全阈值。发送过多数据可能导致超时或高额消耗。',
            original: '完整上下文',
            truncated: '安全阈值',
            preview: '将被截断的内容预览：',
            sendFull: '发送完整内容(有风险)',
            truncateSend: '截断并发送'
        }
    },
    architect: {
      placeholder: "输入小说前提...", synopsisPlaceholder: "简介 (可选)", designBtn: '设计大纲', tip: '点击节点修改', description: '描述', content: '正文', generateDraft: '生成草稿', writing: '写作中...', noContent: '暂无内容',
      types: { book: '书名', volume: '分卷', act: '幕', chapter: '章节', scene: '场景', character: '角色', setting: '设定', system: '体系', item: '物品', event: '事件' },
      historyTitle: '存档', load: '加载', actions: '操作', addChild: '加子节点', addSibling: '加兄弟节点', structureActions: '结构操作', deleteNode: '删除', aiExpand: 'AI 架构扩展', expandStyle: '扩展方向/提示词', defaultStyle: '默认逻辑', expandBtn: '生成下级内容(递归)', expanding: 'AI思考中...', nodeName: '名称', nodeDesc: '描述', confirmDelete: '确定删除？',
      mapControls: { zoomIn: '放大', zoomOut: '缩小', fit: '适配' },
      views: { map: '蓝图视图', manuscript: '正文视图' },
      stats: { totalWords: '总字数', totalChapters: '总章节', volume: '卷' },
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
    taskMonitor: {
        title: '任务监控台',
        active: '运行中',
        logs: '执行日志',
        noTasks: '无活动任务',
        stop: '停止',
        status: { running: '运行中', completed: '完成', error: '失败', cancelled: '已取消' },
        types: { inspiration: '每日灵感', story: '小说生成', map_regen: '导图重绘', draft: '草稿写作' },
        labels: {
            genInspiration: '生成每日灵感',
            analyzeTrend: '分析市场趋势',
            genStory: '构建小说架构',
            regenMap: '重绘导图',
            drafting: '生成草稿'
        },
        metrics: {
            tokens: '令牌消耗',
            latency: '耗时',
            model: '模型',
            total: '总计',
            in: '输入',
            out: '输出'
        },
        debug: {
            title: '调试详情',
            prompt: '提示词',
            context: '上下文',
            model: '模型'
        }
    },
    workflow: {
        title: '自动化小说工作流',
        config: '生成配置',
        idea: '小说创意 / 核心脑洞',
        style: '预设文风',
        wordCount: '单章目标字数',
        progress: '运行日志',
        start: '开启自动化',
        stop: '停止',
        status: { idle: '空闲', running: '运行中', paused: '暂停', complete: '已完成' },
        logs: { start: '工作流启动...', generatingArch: '正在生成 8-图架构...', archComplete: '架构已生成。书名: {title}', generatingChap: '正在生成章节: {title}...', chapComplete: '章节 {index} 完成。', done: '工作流结束。' }
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
