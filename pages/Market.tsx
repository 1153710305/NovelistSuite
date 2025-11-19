import React, { useState } from 'react';
import { Novel, NovelPlatform } from '../types';
import { Filter, Star, Book } from 'lucide-react';
import { useI18n } from '../i18n';

const MOCK_NOVELS: Novel[] = [
  {
    id: '1',
    title: 'The Celestial Mechanic',
    author: 'StarWalker',
    category: 'Sci-Fi',
    hotScore: 98500,
    platform: NovelPlatform.QIDIAN,
    summary: 'In a universe where machines cultivation is the path to immortality...'
  },
  {
    id: '2',
    title: 'Empress of the Boardroom',
    author: 'CityLight',
    category: 'Urban',
    hotScore: 89000,
    platform: NovelPlatform.JINJIANG,
    summary: 'Reborn back to 2010, she decides to crush her rivals...'
  },
  {
    id: '3',
    title: 'Global Dungeon System',
    author: 'DungeonMaster',
    category: 'System',
    hotScore: 85400,
    platform: NovelPlatform.FANQIE,
    summary: 'Dungeons appeared on Earth. He got the only admin key.'
  },
   {
    id: '4',
    title: 'Sword of the Northern Night',
    author: 'ColdSteel',
    category: 'Wuxia',
    hotScore: 76000,
    platform: NovelPlatform.QIDIAN,
    summary: 'The sect was destroyed. He walks the lonely path of vengeance.'
  },
];

export const Market: React.FC = () => {
  const [filter, setFilter] = useState<string>('All');
  const { t } = useI18n();

  const filteredNovels = filter === 'All' ? MOCK_NOVELS : MOCK_NOVELS.filter(n => n.category === filter);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800">{t('market.title')}</h2>
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-slate-200">
            <Filter size={16} className="text-slate-400" />
            <select 
                className="bg-transparent text-sm text-slate-700 focus:outline-none cursor-pointer"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
            >
                <option value="All">{t('market.allCategories')}</option>
                <option value="Sci-Fi">Sci-Fi</option>
                <option value="Urban">Urban</option>
                <option value="System">System</option>
                <option value="Wuxia">Wuxia</option>
            </select>
        </div>
      </div>

      <div className="space-y-4">
        {filteredNovels.map((novel, index) => (
            <div key={novel.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex gap-6 transition-all hover:shadow-md">
                <div className="flex-shrink-0 w-16 h-24 bg-slate-200 rounded-md flex items-center justify-center text-slate-400 font-bold text-2xl">
                    {index + 1}
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="text-xl font-bold text-slate-900">{novel.title}</h3>
                            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
                                <span className="bg-slate-100 px-2 py-0.5 rounded text-xs font-medium">{novel.platform}</span>
                                <span className="text-slate-400">•</span>
                                <span>{novel.author}</span>
                                <span className="text-slate-400">•</span>
                                <span>{novel.category}</span>
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="flex items-center gap-1 text-orange-500 font-bold">
                                <Star size={16} fill="currentColor" />
                                <span>{(novel.hotScore / 10000).toFixed(1)}w</span>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{t('market.hotScore')}</p>
                        </div>
                    </div>
                    <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                        {novel.summary}
                    </p>
                    <div className="mt-4 flex gap-2">
                        <button className="px-3 py-1.5 text-xs font-medium text-teal-700 bg-teal-50 rounded hover:bg-teal-100 transition-colors flex items-center gap-1">
                             <Book size={12} /> {t('market.deconstruct')}
                        </button>
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};