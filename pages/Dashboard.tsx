
/**
 * @file pages/Dashboard.tsx
 * @description 应用的首页/仪表盘组件。
 * 
 * ## 主要功能
 * 1. **市场情报 (Market Intelligence)**: 可视化展示热门流派和题材趋势。
 * 2. **平台数据 (Platform Stats)**: 展示各大小说平台（起点、番茄等）的流量分布。
 * 3. **实时热榜 (Social Trends)**: 模拟展示社交媒体（抖音、微博）的热门话题，为创作提供灵感。
 * 4. **AI 资源监控**: 展示当前 AI 模型的 Token 消耗和使用额度。
 * 
 * ## 模块关系
 * - 此页面展示的数据主要用于启发用户，用户可以在 "Studio" 模块中引用这些趋势。
 * - 使用 `recharts` 库进行数据可视化。
 */

import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Trophy, Flame, TrendingUp, Activity, ArrowUp, ArrowDown, Minus, ExternalLink, Globe, BarChart2, Cpu, Zap, Info } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { DataMethodologyModal } from '../components/DataMethodologyModal';
import { AVAILABLE_MODELS } from '../types';

// --- 类型定义 (Mock Data Types) ---

// 平台份额数据结构
type PlatformShare = {
    name: string;   // 平台名称
    value: number;  // 份额百分比
    mau: string;    // 月活用户数 (Mock)
    growth: string; // 增长率
    color: string;  // 图表颜色
};

// 流派趋势数据结构
type GenreTrend = {
    rank: number;   // 排名
    name: string;   // 流派名称
    heat: number;   // 热度值
    change: number; // 排名变化 (+2, -1, 0)
};

// 社交媒体热榜数据结构
type SocialTrend = {
    rank: number;   // 排名
    topic: string;  // 话题内容
    heat: number;   // 热度
    label?: string; // 标签 (如 "Hot", "New")
};

// --- 模拟数据池 (Real-world Simulation) ---
// 模拟真实的网文平台和社交媒体热榜数据
const TREND_DATA_POOL: Record<string, { zh: string, en: string, heat: number, label?: string }[]> = {
    fanqie: [
        { zh: "重生1980：开局倒卖国库券", en: "Reborn 1980: Trading Treasury Bonds", heat: 98500, label: "都市" },
        { zh: "绝世神医：下山即无敌", en: "Divine Doctor: Invincible Descent", heat: 95200, label: "都市" },
        { zh: "分手后，前任小叔对我蓄谋已久", en: "After Breakup: Uncle's Secret Love", heat: 93100, label: "现言" },
        { zh: "荒野求生：我能看到提示", en: "Wilderness Survival: I See Hints", heat: 88400, label: "系统" },
        { zh: "全民转职：只有我转职亡灵法师", en: "Class Change: The Only Necromancer", heat: 86500, label: "玄幻" },
        { zh: "我在精神病院学斩神", en: "Slaying Gods in the Asylum", heat: 84200, label: "都市" },
        { zh: "偷听心声：女帝被我苟成圣人", en: "Mind Reading: Empress Becomes Saint", heat: 81000, label: "历史" },
        { zh: "只有我能看到的各种提示", en: "Only I Can See The Prompts", heat: 79500, label: "悬疑" },
        { zh: "开局地摊卖大力", en: "Selling Super Strength on Street", heat: 76000, label: "搞笑" },
        { zh: "十代神豪", en: "The Tenth Generation Tycoon", heat: 74000, label: "都市" }
    ],
    qidian: [
        { zh: "宿命之环", en: "Circle of Inevitability", heat: 105000, label: "西幻" },
        { zh: "道诡异仙", en: "Dao of the Bizarre", heat: 102000, label: "仙侠" },
        { zh: "赤心巡天", en: "Red Heart Patrol", heat: 99000, label: "仙侠" },
        { zh: "深海余烬", en: "Deep Sea Embers", heat: 97500, label: "科幻" },
        { zh: "这游戏也太真实了", en: "This Game Is Too Realistic", heat: 95000, label: "科幻" },
        { zh: "灵境行者", en: "Spirit Realm Walker", heat: 93000, label: "科幻" },
        { zh: "择日飞升", en: "Ascend Another Day", heat: 91000, label: "仙侠" },
        { zh: "大乘期才有逆袭系统", en: "System After Mahayana", heat: 89000, label: "搞笑" },
        { zh: "我本无意成仙", en: "I Didn't Want Immortality", heat: 87000, label: "仙侠" },
        { zh: "从红月开始", en: "Starting from the Red Moon", heat: 85000, label: "科幻" }
    ],
    douyin: [
        { zh: "#挑战100元吃遍夜市", en: "#Challenge: $15 Night Market Feast", heat: 98000 },
        { zh: "变装：从校服到婚纱", en: "Transformation: Uniform to Wedding Dress", heat: 96000 },
        { zh: "沉浸式收纳", en: "Immersive Organization ASMR", heat: 92000 },
        { zh: "这是一个关于暗恋的故事", en: "A Story About Secret Crush", heat: 89000 },
        { zh: "这个转场太丝滑了", en: "This Transition is So Smooth", heat: 85000 },
        { zh: "第一视角：当反派", en: "POV: You are the Villain", heat: 82000 }
    ],
    weibo: [
        { zh: "某顶流恋情曝光", en: "Top Star Dating Rumors", heat: 99000, label: "热搜" },
        { zh: "春节档电影票房", en: "Spring Festival Box Office", heat: 95000 },
        { zh: "建议专家不要建议", en: "Suggest Experts Stop Suggesting", heat: 91000 },
        { zh: "考研分数线", en: "Grad School Entrance Scores", heat: 88000 },
        { zh: "这只猫会说话", en: "This Cat Can Talk", heat: 84000 }
    ],
    bilibili: [
        { zh: "【何同学】我做了一个AI", en: "[He Tongxue] I Built an AI", heat: 94000 },
        { zh: "关于我转生变成史莱姆", en: "Reincarnated as a Slime", heat: 90000 },
        { zh: "耗时300天还原", en: "300 Days to Recreate...", heat: 88000 },
        { zh: "2024百大UP主颁奖", en: "Top 100 Uploader Awards", heat: 86000 },
        { zh: "原神新版本前瞻", en: "Genshin Impact Update Preview", heat: 83000 }
    ]
};

// --- 子组件 (Sub-components) ---

/**
 * 排名变化图标组件
 */
const RankChangeIcon = ({ change }: { change: number }) => {
    if (change > 0) return <div className="flex items-center text-red-500 text-xs font-bold"><ArrowUp size={12} />{change}</div>;
    if (change < 0) return <div className="flex items-center text-green-500 text-xs font-bold"><ArrowDown size={12} />{Math.abs(change)}</div>;
    return <div className="flex items-center text-slate-400 text-xs"><Minus size={12} /></div>;
};

/**
 * 平台流量分布组件 (Pie Chart)
 */
const PlatformTraffic: React.FC<{ data: PlatformShare[] }> = ({ data }) => {
    const { t } = useI18n();
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">{t('dashboard.platformShare')}</h3>
                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full">{t('dashboard.trafficBreakdown')}</span>
            </div>
            <div className="flex flex-col xl:flex-row gap-6 items-center">
                {/* 饼图区域 */}
                <div className="h-48 w-48 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* 中心文字 */}
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-xs text-slate-400">Market</p>
                        <p className="text-lg font-bold text-slate-800">100%</p>
                    </div>
                </div>
                {/* 列表数据区域 */}
                <div className="flex-1 w-full overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead>
                            <tr className="text-xs text-slate-400 border-b border-slate-100">
                                <th className="pb-2 font-medium">{t('market.platform')}</th>
                                <th className="pb-2 font-medium text-right">Share</th>
                                <th className="pb-2 font-medium text-right">{t('dashboard.activeUsers')}</th>
                                <th className="pb-2 font-medium text-right">{t('dashboard.growth')}</th>
                            </tr>
                        </thead>
                        <tbody className="text-slate-600">
                            {data.map((p) => (
                                <tr key={p.name} className="border-b border-slate-50 last:border-0">
                                    <td className="py-2 flex items-center gap-2 font-medium">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }}></span>
                                        {p.name}
                                    </td>
                                    <td className="py-2 text-right">{p.value}%</td>
                                    <td className="py-2 text-right">{p.mau}</td>
                                    <td className={`py-2 text-right font-medium ${p.growth.startsWith('+') ? 'text-red-500' : 'text-green-500'}`}>{p.growth}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

/**
 * 社交媒体热搜列表组件
 */
const SocialTrendList: React.FC<{ source: string }> = ({ source }) => {
    const { t, lang } = useI18n();

    // 生成或获取模拟数据
    const generateSocialData = (source: string): SocialTrend[] => {
        const pool = TREND_DATA_POOL[source] || [];

        // 如果有预设数据，优先使用
        if (pool.length > 0) {
            return pool.map((item, i) => ({
                rank: i + 1,
                topic: lang === 'zh' ? item.zh : item.en,
                heat: item.heat,
                label: item.label
            }));
        }

        // 后备生成逻辑
        return Array.from({ length: 10 }, (_, i) => ({
            rank: i + 1,
            topic: `Trending Topic #${i + 1}`,
            heat: Math.floor(100000 / (i + 1))
        }));
    };

    const data = generateSocialData(source);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            {data.map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-teal-50 transition-colors border border-slate-100 hover:border-teal-100 group">
                    {/* 排名徽章 */}
                    <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${item.rank <= 3 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                        }`}>
                        {item.rank}
                    </div>
                    {/* 话题内容 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-800 truncate pr-2 group-hover:text-teal-700 transition-colors">{item.topic}</p>
                            {item.label && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded">{item.label}</span>}
                        </div>
                        {/* 热度条 */}
                        <div className="flex items-center gap-2 mt-1">
                            <div className="h-1.5 flex-1 bg-slate-200 rounded-full overflow-hidden">
                                <div className="h-full bg-red-400 rounded-full" style={{ width: `${Math.min(100, (item.heat / (data[0].heat || 1)) * 100)}%` }}></div>
                            </div>
                            <span className="text-[10px] text-slate-400 tabular-nums">{(item.heat / 10000).toFixed(1)}w</span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * 外部数据入口链接组件
 */
const ExternalPortals: React.FC = () => {
    const { t } = useI18n();

    const portals = [
        {
            name: t('sources.fanqie'),
            color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
            site: 'https://fanqienovel.com/',
            rank: 'https://fanqienovel.com/rank'
        },
        {
            name: t('sources.qidian'),
            color: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100',
            site: 'https://www.qidian.com/',
            rank: 'https://www.qidian.com/rank/'
        },
        {
            name: t('sources.jinjiang'),
            color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
            site: 'https://www.jjwxc.net/',
            rank: 'https://www.jjwxc.net/fenzhan/rank'
        },
        {
            name: t('sources.douyin'),
            color: 'bg-slate-900 text-white border-slate-700 hover:bg-slate-800',
            site: 'https://www.douyin.com/',
            rank: 'https://www.douyin.com/hot'
        }
    ];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {portals.map((p) => (
                <div key={p.name} className={`p-4 rounded-xl border transition-all shadow-sm flex flex-col gap-3 ${p.color}`}>
                    <div className="font-bold flex items-center justify-between">
                        <span>{p.name}</span>
                        <ExternalLink size={16} />
                    </div>
                    <div className="flex gap-2 mt-auto">
                        <a
                            href={p.site}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1.5 bg-white/50 hover:bg-white/80 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                            <Globe size={12} /> {t('dashboard.officialSite')}
                        </a>
                        <a
                            href={p.rank}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 py-1.5 bg-white/50 hover:bg-white/80 rounded text-xs font-medium flex items-center justify-center gap-1 transition-colors"
                        >
                            <BarChart2 size={12} /> {t('dashboard.rankings')}
                        </a>
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * 仪表盘主组件
 */
export const Dashboard: React.FC = () => {
    const { t } = useI18n();
    // 使用 modelConfigs 读取动态配置
    const { model, usageStats, modelConfigs, fastMode, toggleFastMode } = useApp();
    const [isDocOpen, setIsDocOpen] = useState(false); // 数据方法论模态框状态

    // 本地筛选状态
    const [selectedGenrePlatform, setSelectedGenrePlatform] = useState('Qidian');
    const [selectedTimeRange, setSelectedTimeRange] = useState('weekly');
    const [socialTab, setSocialTab] = useState('fanqie');

    // 获取当前模型的详细统计
    const activeModels = modelConfigs || AVAILABLE_MODELS;
    const currentModelConfig = activeModels.find(m => m.id === model) || activeModels[0];
    const modelStats = usageStats.modelUsage?.[model] || { requests: 0, tokens: 0 };
    const dailyLimitPercent = Math.min(100, (modelStats.requests / currentModelConfig.dailyLimit) * 100);

    // 生成平台份额数据 (Mock)
    const generatePlatformData = (): PlatformShare[] => [
        { name: t('sources.qidian'), value: 42, mau: '145M', growth: '+5.2%', color: '#ef4444' },
        { name: t('sources.fanqie'), value: 28, mau: '98M', growth: '+12.8%', color: '#f97316' },
        { name: t('sources.jinjiang'), value: 18, mau: '62M', growth: '+2.1%', color: '#10b981' },
        { name: t('sources.zongheng'), value: 8, mau: '24M', growth: '-1.5%', color: '#3b82f6' },
        { name: t('dashboard.others'), value: 4, mau: '15M', growth: '+0.5%', color: '#94a3b8' },
    ];

    // 生成流派趋势数据 (Mock)
    const generateGenreData = (platform: string, range: string): GenreTrend[] => {
        // 模拟不同平台的数据差异
        const base = platform === 'Qidian' ? [
            { rank: 1, name: t('genres.xianxia'), heat: 9800, change: 0 },
            { rank: 2, name: t('genres.urban'), heat: 8500, change: 2 },
            { rank: 3, name: t('genres.fantasy'), heat: 8200, change: -1 },
            { rank: 4, name: t('genres.scifi'), heat: 7400, change: 1 },
            { rank: 5, name: t('genres.history'), heat: 6900, change: -1 },
            { rank: 6, name: t('genres.gaming'), heat: 6200, change: 3 },
            { rank: 7, name: t('genres.horror'), heat: 5800, change: 0 },
            { rank: 8, name: t('genres.sports'), heat: 4500, change: -2 },
        ] : platform === 'Fanqie' ? [
            { rank: 1, name: t('genres.war'), heat: 9900, change: 0 },
            { rank: 2, name: t('genres.romance80s'), heat: 9100, change: 1 },
            { rank: 3, name: t('genres.ceo'), heat: 8800, change: -1 },
            { rank: 4, name: t('genres.farming'), heat: 7600, change: 4 },
            { rank: 5, name: t('genres.survival'), heat: 7200, change: 2 },
            { rank: 6, name: t('genres.zombie'), heat: 6500, change: -2 },
            { rank: 7, name: t('genres.pet'), heat: 5900, change: -1 },
            { rank: 8, name: t('genres.star'), heat: 5100, change: 0 },
        ] : [
            { rank: 1, name: t('genres.danmei'), heat: 9500, change: 0 },
            { rank: 2, name: t('genres.ancient'), heat: 8900, change: 0 },
            { rank: 3, name: t('genres.entertainment'), heat: 7800, change: 2 },
            { rank: 4, name: t('genres.campus'), heat: 7100, change: -1 },
            { rank: 5, name: t('genres.interstellar'), heat: 6800, change: 1 },
            { rank: 6, name: t('genres.unlimited'), heat: 6400, change: 3 },
            { rank: 7, name: t('genres.farming'), heat: 5900, change: -2 },
            { rank: 8, name: t('genres.western'), heat: 4800, change: -1 },
        ];

        if (range === 'monthly') return base.map(i => ({ ...i, heat: i.heat * 4 }));
        if (range === 'historical') return base.map(i => ({ ...i, heat: i.heat * 48 }));

        return base;
    };

    const genreData = generateGenreData(selectedGenrePlatform, selectedTimeRange);
    const platformTraffic = generatePlatformData();

    // 社交平台列表
    const socialPlatforms = ['fanqie', 'qidian', 'douyin', 'weibo', 'bilibili', 'zhihu', 'xiaohongshu'];

    return (
        <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
            <DataMethodologyModal isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} />

            {/* 页面头部 */}
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800">{t('dashboard.welcome')}</h2>
                    <p className="text-slate-500 mt-2">{t('dashboard.subtitle')}</p>
                </div>
                <button
                    onClick={() => setIsDocOpen(true)}
                    className="flex items-center gap-2 text-slate-500 hover:text-teal-600 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-200 transition-all text-sm font-medium"
                >
                    <Info size={16} /> {t('dataDoc.btnLabel')}
                </button>
            </div>

            {/* 顶部统计卡片行 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* 卡片 1: AI 资源消耗 (重构版) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-teal-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <h3 className="text-sm font-medium text-slate-500">{t('dashboard.aiResource')}</h3>
                        <Cpu size={20} className="text-teal-500" />
                    </div>
                    <div className="relative z-10 space-y-2">
                        {/* 每日限额进度条 */}
                        <div>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600 font-bold">📢 今日请求 (RPD)</span>
                                <span className={dailyLimitPercent > 90 ? 'text-red-500 font-bold' : 'text-teal-600'}>{modelStats.requests} / {currentModelConfig.dailyLimit}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${dailyLimitPercent > 90 ? 'bg-red-500' : 'bg-teal-500'}`} style={{ width: `${dailyLimitPercent}%` }}></div>
                            </div>
                        </div>

                        {/* 详细数据网格 */}
                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                                <div className="text-[10px] text-slate-400">⚡ RPM Limit</div>
                                <div className="text-xs font-bold text-slate-700">{currentModelConfig.rpm}/min</div>
                            </div>
                            <div className="bg-slate-50 p-1.5 rounded border border-slate-100">
                                <div className="text-[10px] text-slate-400">🪙 Tokens Today</div>
                                <div className="text-xs font-bold text-slate-700">{(modelStats.tokens / 1000).toFixed(1)}k</div>
                            </div>
                        </div>

                        <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                            <Zap size={10} className="text-yellow-500" />
                            Model: {currentModelConfig.id.replace('gemini-', '')}
                        </div>

                        {/* Fast 模式切换 */}
                        {currentModelConfig.supportsFastMode && (
                            <button
                                onClick={toggleFastMode}
                                className={`mt-2 w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${fastMode
                                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                    }`}
                            >
                                <span className="flex items-center gap-1">
                                    <Zap size={12} className={fastMode ? 'text-yellow-300' : 'text-slate-400'} />
                                    {fastMode ? 'Fast 模式' : '正常模式'}
                                </span>
                                <span className="text-[10px] opacity-75">
                                    {fastMode ? '⚡ 快速' : '🎯 精准'}
                                </span>
                            </button>
                        )}
                    </div>
                </div>

                {/* 卡片 2: 热门流派 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h3 className="text-sm font-medium text-slate-500">{t('dashboard.topGenre')}</h3>
                        <Trophy size={20} className="text-yellow-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-slate-800">{t('genres.xianxia')}</div>
                        <div className="text-xs text-slate-400 mt-1">Heat Index: 98,500</div>
                    </div>
                </div>

                {/* 卡片 3: 热门梗/标签 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h3 className="text-sm font-medium text-slate-500">{t('dashboard.hotTrope')}</h3>
                        <Flame size={20} className="text-red-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-slate-800">{t('topics.rebirth')}</div>
                        <div className="text-xs text-green-500 mt-1 flex items-center font-medium">
                            <TrendingUp size={12} className="mr-1" /> +12.5%
                        </div>
                    </div>
                </div>

                {/* 卡片 4: 每日写作目标 */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <h3 className="text-sm font-medium text-slate-500">{t('dashboard.wordsWritten')}</h3>
                        <Activity size={20} className="text-blue-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="text-2xl font-bold text-slate-800">2,450</div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                            <div className="bg-blue-500 h-full rounded-full" style={{ width: '65%' }}></div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主图表区域 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左侧: 流派趋势柱状图 (占 2/3) */}
                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-800">{t('dashboard.genreIndex')}</h3>
                            <p className="text-xs text-slate-400">Heat index across major platforms</p>
                        </div>
                        <div className="flex gap-2">
                            {/* 筛选控制器 */}
                            <select
                                value={selectedGenrePlatform}
                                onChange={(e) => setSelectedGenrePlatform(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none"
                            >
                                <option value="Qidian">{t('sources.qidian')}</option>
                                <option value="Fanqie">{t('sources.fanqie')}</option>
                                <option value="Jinjiang">{t('sources.jinjiang')}</option>
                            </select>
                            <select
                                value={selectedTimeRange}
                                onChange={(e) => setSelectedTimeRange(e.target.value)}
                                className="bg-slate-50 border border-slate-200 text-xs rounded-lg px-2 py-1 outline-none"
                            >
                                <option value="weekly">{t('dashboard.weekly')}</option>
                                <option value="monthly">{t('dashboard.monthly')}</option>
                                <option value="historical">{t('dashboard.historical')}</option>
                            </select>
                        </div>
                    </div>

                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={genreData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }} barSize={32}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                                <Tooltip
                                    cursor={{ fill: '#f8fafc' }}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Bar dataKey="heat" fill="#0d9488" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 右侧: 平台份额饼图 (占 1/3) */}
                <div className="lg:col-span-1">
                    <PlatformTraffic data={platformTraffic} />
                </div>
            </div>

            {/* 社交媒体趋势区域 */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                            <Flame size={18} className="text-red-500" />
                            {t('dashboard.socialIntel')}
                        </h3>
                        <p className="text-xs text-slate-400">Real-time topic tracking</p>
                    </div>

                    {/* 平台切换 Tabs */}
                    <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
                        {socialPlatforms.map(platform => (
                            <button
                                key={platform}
                                onClick={() => setSocialTab(platform)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${socialTab === platform
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                    }`}
                            >
                                {t(`sources.${platform}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <SocialTrendList source={socialTab} />
            </div>

            {/* 外部数据入口链接 */}
            <div>
                <div className="flex items-center gap-2 mb-4">
                    <ExternalLink size={18} className="text-slate-400" />
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wide">{t('dashboard.portals')}</h3>
                </div>
                <ExternalPortals />
            </div>

        </div>
    );
};
