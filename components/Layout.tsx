
import React, { useState } from 'react';
import { LayoutDashboard, TrendingUp, PenTool, Network, Feather, Settings, HelpCircle, LogOut, Palette, ChevronLeft, ChevronRight, Menu, MessageSquare } from 'lucide-react';
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'market', label: t('nav.market'), icon: TrendingUp },
    { id: 'writing', label: t('nav.studio'), icon: PenTool },
    { id: 'architect', label: t('nav.architect'), icon: Network },
    { id: 'chat', label: t('nav.chat'), icon: MessageSquare },
    { id: 'cover', label: t('nav.coverStudio'), icon: Palette },
  ];

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-30 flex items-center justify-between px-4 text-white shadow-md">
         <div className="flex items-center gap-2">
            <Feather className="text-teal-400 h-6 w-6" />
            <h1 className="font-bold">{t('app.title')}</h1>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             <Menu size={24} />
         </button>
      </div>

      {/* Sidebar (Desktop + Mobile Drawer) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-20 bg-slate-900 text-slate-300 flex flex-col shadow-xl transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-64'}
        md:pt-0 pt-16
      `}>
        {/* Logo Area (Desktop Only) */}
        <div className={`hidden md:flex p-6 items-center gap-3 border-b border-slate-800 ${isCollapsed ? 'justify-center' : ''}`}>
          <Feather className="text-teal-400 h-8 w-8 flex-shrink-0" />
          {!isCollapsed && <h1 className="text-xl font-bold text-white tracking-tight truncate">{t('app.title')}</h1>}
        </div>
        
        {/* Toggle Button (Desktop Only) */}
        <div className="hidden md:flex justify-end p-2">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
        </div>
        
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => { setView(item.id); setIsMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group relative ${
                currentView === item.id 
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-900/20' 
                  : 'hover:bg-slate-800 hover:text-white'
              } ${isCollapsed ? 'justify-center' : ''}`}
              title={isCollapsed ? item.label : ''}
            >
              <item.icon size={20} className="flex-shrink-0" />
              {!isCollapsed && <span className="font-medium truncate">{item.label}</span>}
              
              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                  </div>
              )}
            </button>
          ))}
        </nav>

        {/* Settings Section */}
        <div className={`p-4 border-t border-slate-800 bg-slate-950/30 ${isCollapsed ? 'flex flex-col items-center' : ''}`} id="nav-settings">
            {!isCollapsed && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase mb-3 px-1">
                    <Settings size={12} /> {t('settings.title')}
                </div>
            )}
            
            <div className={`space-y-4 ${isCollapsed ? 'w-full' : ''}`}>
                {/* Language Selector */}
                <div className="space-y-1">
                    {!isCollapsed && <label className="text-xs text-slate-400">{t('settings.language')}</label>}
                    <select 
                        value={lang} 
                        onChange={(e) => setLang(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                        <option value="en">English</option>
                        <option value="zh">中文</option>
                        <option value="ja">日本語</option>
                    </select>
                </div>

                {/* Model Selector */}
                <div className="space-y-1">
                    {!isCollapsed && <label className="text-xs text-slate-400">{t('settings.model')}</label>}
                    <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                        <option value="gemini-flash-lite-latest">Gemini Flash Lite</option>
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                        <option value="gemini-3-pro-preview">Gemini 3 Pro</option>
                    </select>
                </div>

                <div className={`flex ${isCollapsed ? 'flex-col gap-4 items-center' : 'justify-between mt-2 px-1'}`}>
                    <button 
                        onClick={resetOnboarding}
                        className="flex items-center gap-2 text-xs text-teal-500 hover:text-teal-400"
                        title={t('settings.resetGuide')}
                    >
                        <HelpCircle size={16} /> {!isCollapsed && t('settings.resetGuide')}
                    </button>
                    <button 
                        onClick={onLogout}
                        className="flex items-center gap-2 text-xs text-red-500 hover:text-red-400"
                        title={t('common.logout')}
                    >
                        <LogOut size={16} /> {!isCollapsed && t('common.logout')}
                    </button>
                </div>
            </div>
        </div>

        {!isCollapsed && (
            <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
            <p>{t('nav.powered')}</p>
            <p>v1.4.0</p>
            </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0">
         {children}
      </main>
    </div>
  );
};
