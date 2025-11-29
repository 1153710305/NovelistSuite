
import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Trophy, Flame, TrendingUp, Activity, ArrowUp, ArrowDown, Minus, Users, Info, ExternalLink, Globe, BarChart2 } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { DataMethodologyModal } from '../components/DataMethodologyModal';

// --- MOCK DATA TYPES ---

type PlatformShare = {
    name: string;
    value: number;
    mau: string;
    growth: string;
    color: string;
};

type GenreTrend = {
    rank: number;
    name: string;
    heat: number;
    change: number; // +2, -1, 0 (new)
};

type SocialTrend = {
    rank: number;
    topic: string;
    heat: number;
    label?: string;
};

// --- REALISTIC MOCK DATA POOL ---
const TREND_DATA_POOL: Record<string, { zh: string, en: string, heat: number, label?: string }[]> = {
    fanqie: [
        { zh: "重生1980：开局倒卖国库券", en: "Reborn 1980: Trading Treasury Bonds", heat: 98500, label: "Urban" },
        { zh: "绝世神医：下山即无敌", en: "Divine Doctor: Invincible Descent", heat: 95200, label: "Urban" },
        { zh: "分手后，前任小叔对我蓄谋已久", en: "After Breakup: Uncle's Secret Love", heat: 93100, label: "Romance" },
        { zh: "荒野求生：我能看到提示", en: "Wilderness Survival: I See Hints", heat: 88400, label: "System" },
        { zh: "全民转职：只有我转职亡灵法师", en: "Class Change: The Only Necromancer", heat: 86500, label: "Fantasy" },
        { zh: "我在精神病院学斩神", en: "Slaying Gods in the Asylum", heat: 84200, label: "Urban" },
        { zh: "偷听心声：女帝被我苟成圣人", en: "Mind Reading: Empress Becomes Saint", heat: 81000, label: "History" },
        { zh: "只有我能看到的各种提示", en: "Only I Can See The Prompts", heat: 79500, label: "Suspense" },
        { zh: "开局地摊卖大力", en: "Selling Super Strength on Street", heat: 76000, label: "Comedy" },
        { zh: "十代神豪", en: "The Tenth Generation Tycoon", heat: 74000, label: "Urban" }
    ],
    qidian: [
        { zh: "宿命之环", en: "Circle of Inevitability", heat: 105000, label: "Fantasy" },
        { zh: "道诡异仙", en: "Dao of the Bizarre", heat: 102000, label: "Xianxia" },
        { zh: "赤心巡天", en: "Red Heart Patrol", heat: 99000, label: "Xianxia" },
        { zh: "深海余烬", en: "Deep Sea Embers", heat: 97500, label: "Sci-Fi" },
        { zh: "这游戏也太真实了", en: "This Game Is Too Realistic", heat: 95000, label: "Sci-Fi" },
        { zh: "灵境行者", en: "Spirit Realm Walker", heat: 93000, label: "Sci-Fi" },
        { zh: "择日飞升", en: "Ascend Another Day", heat: 91000, label: "Xianxia" },
        { zh: "大乘期才有逆袭系统", en: "System After Mahayana", heat: 89000, label: "Comedy" },
        { zh: "我本无意成仙", en: "I Didn't Want Immortality", heat: 87000, label: "Xianxia" },
        { zh: "从红月开始", en: "Starting from the Red Moon", heat: 85000, label: "Sci-Fi" }
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
        { zh: "某顶流恋情曝光", en: "Top Star Dating Rumors", heat: 99000, label: "Hot" },
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

// --- SUB-COMPONENTS ---

const RankChangeIcon = ({ change }: { change: number }) => {
    if (change > 0) return <div className="flex items-center text-red-500 text-xs font-bold"><ArrowUp size={12} />{change}</div>;
    if (change < 0) return <div className="flex items-center text-green-500 text-xs font-bold"><ArrowDown size={12} />{Math.abs(change)}</div>;
    return <div className="flex items-center text-slate-400 text-xs"><Minus size={12} /></div>;
};

const PlatformTraffic: React.FC<{ data: PlatformShare[] }> = ({ data }) => {
    const { t } = useI18n();
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-slate-800">{t('dashboard.platformShare')}</h3>
                <span className="text-xs bg-teal-50 text-teal-700 px-2 py-1 rounded-full">{t('dashboard.trafficBreakdown')}</span>
            </div>
            <div className="flex flex-col lg:flex-row gap-8 items-center">
                <div className="h-48 w-48 relative flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value">
                                {data.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                        <p className="text-xs text-slate-400">Market</p>
                        <p className="text-lg font-bold text-slate-800">100%</p>
                    </div>
                </div>
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
                                        <span className="w-2 h-2 rounded-full" style={{backgroundColor: p.color}}></span>
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

const SocialTrendList: React.FC<{ source: string }> = ({ source }) => {
    const { t, lang } = useI18n();

    // Use High-Fidelity Mock Data
    const generateSocialData = (source: string): SocialTrend[] => {
        const pool = TREND_DATA_POOL[source] || [];
        
        // If we have realistic data, use it
        if (pool.length > 0) {
            return pool.map((item, i) => ({
                rank: i + 1,
                topic: lang === 'zh' ? item.zh : item.en,
                heat: item.heat,
                label: item.label
            }));
        }

        // Fallback for other sources (Zhihu, Xiaohongshu) using the old generator logic
        const prefixes = {
            zhihu: ['question', 'career', 'science', 'history', 'relationship'],
            xiaohongshu: ['ootd', 'makeup', 'travel', 'food', 'decor'],
            default: ['news']
        };
        const fallbackPool = (prefixes as any)[source] || prefixes.default;
        
        return Array.from({ length: 10 }, (_, i) => {
            const key = fallbackPool[i % fallbackPool.length];
            const localizedTopic = t(`topics.${key}`);
            return {
                rank: i + 1,
                topic: `${localizedTopic} #${i + 1}`,
                heat: Math.floor(100000 / (i + 1))
            };
        });
    };

    const data = generateSocialData(source);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
            {data.map((item) => (
                <div key={item.rank} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-teal-50 transition-colors border border-slate-100 hover:border-teal-100 group">
                    <div className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-xs font-bold ${
                        item.rank <= 3 ? 'bg-yellow-400 text-white shadow-sm' : 'bg-slate-200 text-slate-600'
                    }`}>
                        {item.rank}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                            <p className="text-sm font-medium text-slate-800 truncate pr-2 group-hover:text-teal-700 transition-colors">{item.topic}</p>
                            {item.label && <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 rounded">{item.label}</span>}
                        </div>
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

export const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { sources, toggleSource } = useApp();
  const [isDocOpen, setIsDocOpen] = useState(false);

  const [selectedGenrePlatform, setSelectedGenrePlatform] = useState('Qidian');
  const [selectedTimeRange, setSelectedTimeRange] = useState('weekly');
  const [socialTab, setSocialTab] = useState('fanqie');

  // Generators inside component to access t()
  const generatePlatformData = (): PlatformShare[] => [
    { name: t('sources.qidian'), value: 42, mau: '145M', growth: '+5.2%', color: '#ef4444' },
    { name: t('sources.fanqie'), value: 28, mau: '98M', growth: '+12.8%', color: '#f97316' },
    { name: t('sources.jinjiang'), value: 18, mau: '62M', growth: '+2.1%', color: '#10b981' },
    { name: t('sources.zongheng'), value: 8, mau: '24M', growth: '-1.5%', color: '#3b82f6' },
    { name: t('dashboard.others'), value: 4, mau: '15M', growth: '+0.5%', color: '#94a3b8' },
  ];

  const generateGenreData = (platform: string, range: string): GenreTrend[] => {
    // Simulate different data based on selection
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

  // Updated to include Fanqie and Qidian
  const socialPlatforms = ['fanqie', 'qidian', 'douyin', 'weibo', 'bilibili', 'zhihu', 'xiaohongshu'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <DataMethodologyModal isOpen={isDocOpen} onClose={() => setIsDocOpen(false)} />

      {/* Header */}
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

      {/* Top Stats Row (Quick Glance) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-medium text-slate-500">{t('dashboard.topGenre')}</h3>
            <Trophy className="text-yellow-500 h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-slate-800 relative z-10">{t('genres.xianxia')}</p>
          <p className="text-xs text-green-500 mt-1 flex items-center relative z-10"><TrendingUp size={12} className="mr-1"/> +12% {t('dashboard.trending')}</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-medium text-slate-500">{t('dashboard.hotTrope')}</h3>
            <Flame className="text-red-500 h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-slate-800 relative z-10">{t('genres.romance80s')}</p>
          <p className="text-xs text-slate-400 mt-1 relative z-10">{t('dashboard.trendingPlatforms')}</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-50 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
            <h3 className="text-sm font-medium text-slate-500">{t('dashboard.dailyGoal')}</h3>
            <Activity className="text-blue-500 h-5 w-5" />
          </div>
          <p className="text-2xl font-bold text-slate-800 relative z-10">0 / 2000</p>
          <p className="text-xs text-slate-400 mt-1 relative z-10">{t('dashboard.wordsWritten')}</p>
        </div>
      </div>

      {/* New Section: External Data Portals */}
      <div>
         <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
             <ExternalLink className="text-slate-500" size={20} /> {t('dashboard.portals')}
         </h3>
         <ExternalPortals />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 1. Genre Heat Index (Advanced) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <TrendingUp className="text-teal-500" size={20}/> {t('dashboard.genreIndex')}
                </h3>
                <div className="flex gap-2">
                    <select 
                        className="bg-slate-50 border border-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        value={selectedGenrePlatform}
                        onChange={(e) => setSelectedGenrePlatform(e.target.value)}
                    >
                        <option value="Qidian">{t('sources.qidian')}</option>
                        <option value="Fanqie">{t('sources.fanqie')}</option>
                        <option value="Jinjiang">{t('sources.jinjiang')}</option>
                    </select>
                    <select 
                        className="bg-slate-50 border border-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-teal-500"
                        value={selectedTimeRange}
                        onChange={(e) => setSelectedTimeRange(e.target.value)}
                    >
                        <option value="weekly">{t('dashboard.weekly')}</option>
                        <option value="monthly">{t('dashboard.monthly')}</option>
                        <option value="historical">{t('dashboard.historical')}</option>
                    </select>
                </div>
            </div>
            
            <div className="flex-1 overflow-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-xs text-slate-400 border-b border-slate-100">
                            <th className="pb-2 text-left w-12">{t('dashboard.rank')}</th>
                            <th className="pb-2 text-left">{t('market.allCategories')}</th>
                            <th className="pb-2 text-left">{t('dashboard.heat')}</th>
                            <th className="pb-2 text-right">{t('dashboard.change')}</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-700">
                        {genreData.map((g) => (
                            <tr key={g.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                <td className="py-3 font-bold text-slate-500">#{g.rank}</td>
                                <td className="py-3 font-medium">{g.name}</td>
                                <td className="py-3 w-32">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-xs text-slate-500 tabular-nums">{g.heat.toLocaleString()}</span>
                                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="h-full bg-teal-500 rounded-full" style={{ width: `${(g.heat / genreData[0].heat) * 100}%` }}></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 text-right">
                                    <div className="flex justify-end">
                                        <RankChangeIcon change={g.change} />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          </div>

          {/* 2. Detailed Traffic Share */}
          <PlatformTraffic data={platformTraffic} />
      </div>

      {/* 3. Social Media Intelligence (Top 20 per Platform) */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col min-h-[600px]">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                 <Users className="text-purple-500" size={20} /> {t('dashboard.socialIntel')}
              </h3>
              
              {/* Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {socialPlatforms.map(p => (
                      <button
                        key={p}
                        onClick={() => setSocialTab(p)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                            socialTab === p 
                            ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-teal-300 hover:text-teal-600'
                        }`}
                      >
                          {t(`sources.${p}`)}
                      </button>
                  ))}
              </div>
          </div>
          
          <div className="p-6 bg-white flex-1 overflow-y-auto">
              <SocialTrendList source={socialTab} />
          </div>
      </div>

    </div>
  );
};
