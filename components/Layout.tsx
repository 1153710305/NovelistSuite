

/**
 * @file components/Layout.tsx
 * @description 应用程序的主布局组件 (Shell)。
 * 
 * ## 功能
 * 1. **响应式导航**: 提供桌面端侧边栏和移动端抽屉式菜单。
 * 2. **路由视图容器**: 渲染当前选中的页面组件 (`children`)。
 * 3. **全局设置**: 集成语言切换、模型选择和数据管理入口。
 * 4. **全局组件挂载**: 挂载任务监控器 (TaskMonitor) 和引导页 (Onboarding)。
 * 5. **网络监控**: 实时显示网络健康状态。
 */

import React, { useState, useEffect } from 'react';
import { LayoutDashboard, TrendingUp, PenTool, Network, Feather, Settings, HelpCircle, LogOut, Palette, ChevronLeft, ChevronRight, Menu, MessageSquare, Database, Bot, Info, UserCog, ChevronDown, ChevronUp, Wifi, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';
import { useApp } from '../contexts/AppContext';
import { Onboarding } from './Onboarding';
import { DataManagerModal } from './DataManagerModal'; 
import { GlobalPersonaModal } from './GlobalPersonaModal'; // 新增
import { TaskMonitor } from './TaskMonitor';
import { AVAILABLE_MODELS, NetworkStatus } from '../types';
import { diagnoseNetwork } from '../services/geminiService';

interface LayoutProps {
  children: React.ReactNode;      // 当前路由页面内容
  currentView: string;            // 当前激活的视图 ID
  setView: (view: string) => void;// 切换视图的回调
  onLogout: () => void;           // 登出回调
}

/**
 * 布局组件
 */
export const Layout: React.FC<LayoutProps> = ({ children, currentView, setView, onLogout }) => {
  const { t, lang, setLang } = useI18n();
  // 获取全局状态：模型、引导页状态、使用统计、动态模型配置
  const { model, setModel, showOnboarding, completeOnboarding, resetOnboarding, usageStats, modelConfigs } = useApp();
  
  // 本地 UI 状态
  const [isCollapsed, setIsCollapsed] = useState(false); // 侧边栏折叠状态
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // 移动端菜单开关
  const [showDataManager, setShowDataManager] = useState(false); // 数据管理模态框开关
  const [showPersonaModal, setShowPersonaModal] = useState(false); // 全局身份模态框开关
  
  // 网络状态
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(NetworkStatus.ONLINE);
  
  // 设置区域折叠状态 (默认折叠)
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false);

  // 定期检查网络
  useEffect(() => {
      const checkNet = async () => {
          const { status } = await diagnoseNetwork();
          setNetworkStatus(status);
      };
      checkNet(); // Initial check
      const timer = setInterval(checkNet, 30000); // Check every 30s
      return () => clearInterval(timer);
  }, []);

  // 导航菜单配置
  const navItems = [
    { id: 'dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { id: 'market', label: t('nav.market'), icon: TrendingUp },
    { id: 'writing', label: t('nav.studio'), icon: PenTool },
    { id: 'architect', label: t('nav.architect'), icon: Network },
    { id: 'workflow', label: t('nav.workflow'), icon: Bot },
    { id: 'chat', label: t('nav.chat'), icon: MessageSquare },
    { id: 'cover', label: t('nav.coverStudio'), icon: Palette },
  ];

  /**
   * 获取当前模型的配额使用统计
   * 用于在侧边栏显示进度条
   * 修改：现在从 modelConfigs 获取配置，而非静态的 AVAILABLE_MODELS
   */
  const getCurrentModelStats = () => {
      // 优先使用动态配置，兜底使用静态配置
      const activeModels = modelConfigs || AVAILABLE_MODELS;
      const config = activeModels.find(m => m.id === model) || activeModels[0];
      
      if (!usageStats) return { stats: { requests: 0, tokens: 0 }, config, percent: 0 };
      const safeModelUsage = usageStats.modelUsage || {};
      const stats = safeModelUsage[model] || { requests: 0, tokens: 0 };
      const percent = Math.min(100, (stats.requests / config.dailyLimit) * 100);
      return { stats, config, percent };
  };

  const { stats, config, percent } = getCurrentModelStats();

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* 全局引导页层 */}
      {showOnboarding && <Onboarding onComplete={completeOnboarding} />}
      
      {/* 数据管理模态框 */}
      {showDataManager && <DataManagerModal isOpen={showDataManager} onClose={() => setShowDataManager(false)} />}
      
      {/* 全局身份设置模态框 */}
      {showPersonaModal && <GlobalPersonaModal isOpen={showPersonaModal} onClose={() => setShowPersonaModal(false)} />}
      
      {/* 全局任务监控悬浮窗 */}
      <TaskMonitor />
      
      {/* 移动端顶部导航栏 */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 z-30 flex items-center justify-between px-4 text-white shadow-md">
         <div className="flex items-center gap-2">
            <Feather className="text-teal-400 h-6 w-6" />
            <h1 className="font-bold">{t('app.title')}</h1>
         </div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
             <Menu size={24} />
         </button>
      </div>

      {/* 侧边栏 (桌面端固定 / 移动端抽屉) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-20 bg-slate-900 text-slate-300 flex flex-col shadow-xl transition-all duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'w-20' : 'w-72'}
        md:pt-0 pt-16
      `}>
        {/* Logo 区域 (仅桌面端) */}
        <div className={`hidden md:flex p-6 items-center gap-3 border-b border-slate-800 ${isCollapsed ? 'justify-center' : ''}`}>
          <Feather className="text-teal-400 h-8 w-8 flex-shrink-0" />
          {!isCollapsed && <h1 className="text-xl font-bold text-white tracking-tight truncate">{t('app.title')}</h1>}
        </div>
        
        {/* 折叠切换按钮 (仅桌面端) */}
        <div className="hidden md:flex justify-end p-2">
            <button onClick={() => setIsCollapsed(!isCollapsed)} className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-white transition-colors">
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
        </div>
        
        {/* 导航菜单列表 */}
        <nav className="flex-1 p-2 md:p-4 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
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
              
              {/* 折叠模式下的悬浮提示 */}
              {isCollapsed && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                  </div>
              )}
            </button>
          ))}
        </nav>

        {/* 底部设置区域 */}
        <div className={`p-4 border-t border-slate-800 bg-slate-950/30 ${isCollapsed ? 'flex flex-col items-center' : ''}`} id="nav-settings">
            
            {/* 设置标题栏 (可点击折叠) */}
            <div 
                className={`flex items-center justify-between cursor-pointer hover:text-teal-400 transition-colors ${isCollapsed ? 'justify-center mb-2' : 'mb-3 px-1'}`}
                onClick={() => setIsSettingsExpanded(!isSettingsExpanded)}
                title={isCollapsed ? t('settings.title') : undefined}
            >
                {!isCollapsed ? (
                    <>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase">
                            <Settings size={12} /> {t('settings.title')}
                        </div>
                        {isSettingsExpanded ? <ChevronDown size={14} className="text-slate-500"/> : <ChevronUp size={14} className="text-slate-500"/>}
                    </>
                ) : (
                    <Settings size={16} className="text-slate-500" />
                )}
            </div>
            
            {/* 折叠内容区域 */}
            <div className={`space-y-4 overflow-hidden transition-all duration-300 ease-in-out ${isSettingsExpanded || isCollapsed ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'} ${isCollapsed ? 'w-full' : ''}`}>
                {/* 语言选择器 */}
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

                {/* 模型选择器 */}
                <div className="space-y-1">
                    {!isCollapsed && <label className="text-xs text-slate-400">{t('settings.model')}</label>}
                    <select 
                        value={model} 
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 font-medium"
                    >
                        {modelConfigs.map(m => (
                            <option key={m.id} value={m.id}>{t(m.nameKey)}</option>
                        ))}
                    </select>
                </div>

                {/* 模型详情卡片 (仅展开模式显示) */}
                {!isCollapsed && (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 space-y-3">
                        {/* 描述 */}
                        <div className="flex gap-2">
                            <Info size={14} className="text-teal-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] text-slate-400 leading-tight">
                                {t(config.descKey)}
                            </p>
                        </div>

                        {/* 配额进度条 */}
                        <div>
                            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                                <span>{t('quota.dailyLimit')}</span>
                                <span className={percent > 90 ? 'text-red-400' : 'text-teal-400'}>{stats.requests} / {config.dailyLimit}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5 overflow-hidden mb-2">
                                <div 
                                    className={`h-full rounded-full transition-all duration-500 ${percent > 90 ? 'bg-red-500' : 'bg-teal-500'}`} 
                                    style={{ width: `${percent}%` }}
                                ></div>
                            </div>
                            
                            <div className="flex justify-between text-[10px] text-slate-500 mb-1 border-t border-slate-700 pt-2">
                                <span>Context Window</span>
                                <span className="text-slate-300">{(config.contextWindow / 1024).toFixed(0)}K</span>
                            </div>
                            <div className="flex justify-between text-[10px] text-slate-500">
                                <span>Tokens Used</span>
                                <span className="text-slate-300">{stats.tokens.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                )}
                
                {/* 全局身份设置按钮 */}
                <button
                    onClick={() => setShowPersonaModal(true)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
                    title={t('settings.globalPersona')}
                >
                    <UserCog size={14} />
                    {!isCollapsed && t('settings.globalPersona')}
                </button>
                
                {/* 数据管理器触发按钮 */}
                <button
                    onClick={() => setShowDataManager(true)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs flex items-center justify-center gap-2 transition-colors border border-slate-700"
                    title={t('settings.dataManager')}
                >
                    <Database size={14} />
                    {!isCollapsed && t('settings.dataManager')}
                </button>

                {/* 辅助操作区 */}
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

        {/* 底部状态栏 */}
        {!isCollapsed ? (
            <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                <div className="flex items-center gap-1">
                    {networkStatus === NetworkStatus.ONLINE && <Wifi size={12} className="text-green-500"/>}
                    {networkStatus === NetworkStatus.SLOW && <Wifi size={12} className="text-yellow-500"/>}
                    {networkStatus === NetworkStatus.OFFLINE && <WifiOff size={12} className="text-red-500"/>}
                    <span className={networkStatus === NetworkStatus.OFFLINE ? "text-red-500" : ""}>{networkStatus === NetworkStatus.ONLINE ? 'Online' : networkStatus === NetworkStatus.SLOW ? 'Slow' : 'Offline'}</span>
                </div>
                <span>v1.7.7</span>
            </div>
        ) : (
            <div className="p-4 border-t border-slate-800 flex justify-center">
                 {networkStatus === NetworkStatus.ONLINE ? <Wifi size={14} className="text-green-500"/> : <WifiOff size={14} className="text-red-500"/>}
            </div>
        )}
      </aside>

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto relative pt-16 md:pt-0">
         {children}
      </main>
    </div>
  );
};