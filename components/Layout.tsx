
import React from 'react';
import { LayoutDashboard, TrendingUp, BookOpenText, PenTool, Network, Feather, Settings, HelpCircle, LogOut, Palette } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { Onboarding } from './Onboarding';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, onLogout }) => {
  const { t, lang, setLang } = useI18n();
  const { model, setModel, showOnboarding, completeOnboarding, resetOnboarding } = useApp();

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'market', label: t('nav.market'), icon: TrendingUp },
    { id: 'analysis', label: t('nav.lab'), icon: BookOpenText },
    { id: 'writing', label: t('nav.studio'), icon: PenTool },
    { id: 'architect', label: t('nav.architect'), icon: Network },
    { id: 'cover', label: t('nav.coverStudio'), icon: Palette },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <Feather className="text-teal-400 h-8 w-8" />
          <h1 className="text-xl font-bold text-white tracking-tight">{t('app.title')}</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                currentView === item.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Settings Section */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30" id="nav-settings">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3 px-1">
                <Settings size={12} /> {t('settings.title')}
            </div>
            
            <div className="space-y-4">
                {/* Language Selector */}
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('settings.language')}</label>
                    <select 
                        value={lang} 
                        onChange={(e) => setLang(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                        <option value="en">English</option>
                        <option value="zh">中文 (Chinese)</option>
                        <option value="ja">日本語 (Japanese)</option>
                        <option value="es">Español (Spanish)</option>
                        <option value="fr">Français (French)</option>
                        <option value="de">Deutsch (German)</option>
                    </select>
                </div>

                {/* Model Selector */}
                <div className="space-y-1">
                    <label className="text-xs text-slate-400">{t('settings.model')}</label>
                    <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                        <option value="gemini-flash-lite-latest">{t('models.lite')}</option>
                        <option value="gemini-2.5-flash">{t('models.flash')}</option>
                        <option value="gemini-3-pro-preview">{t('models.pro')}</option>
                    </select>
                    <p className="text-[10px] text-slate-500">{t('settings.modelHelp')}</p>
                </div>

                <div className="flex justify-between mt-2 px-1">
                    <button 
                        onClick={resetOnboarding}
                        className="flex items-center gap-2 text-xs text-teal-500 hover:text-teal-400"
                    >
                        <HelpCircle size={12} /> {t('settings.resetGuide')}
                    </button>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400"
                    >
                        <LogOut size={12} /> {t('common.logout')}
                    </button>
                </div>
            </div>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          <p>{t('nav.powered')}</p>
          <p>v1.3.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
         {children}
      </main>
    </div>
  );
};
