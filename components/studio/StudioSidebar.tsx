/**
 * @file components/studio/StudioSidebar.tsx
 * @description 工作室左侧边栏组件。
 * 
 * ## 功能
 * 1. **历史记录管理**: 展示、删除、导出小说项目历史。
 * 2. **导航控制**: 切换工具视图、导图视图、正文列表视图。
 * 3. **数据管理入口**: 提供导入导出及提示词库管理入口。
 */

import React, { useRef, useState } from 'react';
import { 
    Wrench,         // 工具图标
    Download,       // 导出图标
    Upload as UploadIcon, // 导入图标
    Loader2,        // 加载中
    ChevronDown,    // 展开箭头
    ChevronRight,   // 收起箭头
    MoreVertical,   // 更多菜单
    FileText,       // 文件图标
    FileJson,       // JSON 图标
    Archive,        // 归档图标
    Trash2,         // 删除图标
    Network,        // 网络/导图图标
    FolderOpen,     // 文件夹打开图标
    Library         // 库/提示词图标
} from 'lucide-react';
import { useI18n } from '../../i18n';
import { StudioRecord } from '../../types';

/**
 * 组件 Props 定义
 */
interface StudioSidebarProps {
    history: StudioRecord[]; // 历史记录列表
    activeStoryRecord: StudioRecord | null; // 当前激活的项目
    mainViewMode: string; // 当前主视图模式
    currentChapterIndex: number | null; // 当前选中章节索引
    
    // 回调函数
    onSelectQuickTools: () => void; // 切换到快速工具
    onSelectRecord: (record: StudioRecord) => void; // 选择项目
    onToggleExpand: (record: StudioRecord) => void; // 展开/收起项目
    expandedStoryId: string; // 当前展开的项目ID
    
    onOpenMaps: (record: StudioRecord) => void; // 打开导图视图
    onOpenFolder: (record: StudioRecord) => void; // 打开正文列表视图
    onOpenChapter: (record: StudioRecord, index: number) => void; // 打开特定章节
    onCreateChapter: (recordId: string) => void; // 新建章节
    
    onDeleteHistory: (id: string) => void; // 删除项目
    
    // 数据导入导出
    onExportJson: () => void; // 导出全部历史
    onExportItemJson: (item: StudioRecord) => void; // 导出单个项目
    onExportZip: (item: StudioRecord) => void; // 导出 ZIP
    onImportHistory: (e: React.ChangeEvent<HTMLInputElement>) => void; // 导入历史
    
    // 新增：管理提示词库入口
    onManagePrompts: () => void;
}

/**
 * 工作室侧边栏组件
 */
export const StudioSidebar: React.FC<StudioSidebarProps> = ({
    history, activeStoryRecord, mainViewMode, currentChapterIndex,
    onSelectQuickTools, onSelectRecord, onToggleExpand, expandedStoryId,
    onOpenMaps, onOpenFolder, onOpenChapter, onCreateChapter,
    onDeleteHistory, onExportJson, onExportItemJson, onExportZip, onImportHistory,
    onManagePrompts
}) => {
    const { t, lang } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

    // 过滤出小说类型的记录 (不显示纯灵感记录)
    const storyHistory = history.filter(h => h.recordType === 'story');

    // 格式化时间戳
    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

    // 切换更多菜单的显示状态
    const handleToggleMenu = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        setMenuOpenId(prev => prev === id ? null : id);
    };

    // 点击外部关闭菜单
    React.useEffect(() => {
        const handleClickOutside = () => setMenuOpenId(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

    return (
        <div className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-full flex-shrink-0">
            {/* 顶部工具入口 */}
            <div className="p-4 border-b border-slate-200">
                <button 
                    onClick={onSelectQuickTools}
                    className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${mainViewMode === 'quick-tools' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-700 hover:border-teal-300 hover:bg-slate-50'}`}
                >
                    <Wrench size={18} />
                    <span className="font-bold text-sm">{t('studio.tabTools')}</span>
                </button>
            </div>
            
            {/* 历史记录列表区域 */}
            <div className="flex-1 overflow-y-auto p-2">
                 {/* 列表头部操作栏 */}
                 <div className="flex items-center justify-between px-2 mt-4 mb-3">
                    <div className="text-xs font-bold text-slate-400 uppercase">{t('studio.historyTitle')}</div>
                    <div className="flex gap-1">
                        {/* 管理提示词按钮 */}
                        <button onClick={onManagePrompts} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded" title={t('dataManager.tabs.prompts')}>
                            <Library size={14}/>
                        </button>
                        {/* 导出按钮 */}
                        <button onClick={onExportJson} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded" title={t('common.export')}>
                            <Download size={14}/>
                        </button>
                        {/* 导入按钮 */}
                        <button onClick={() => fileInputRef.current?.click()} className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded" title={t('common.import')}>
                            <UploadIcon size={14}/>
                        </button>
                        <input ref={fileInputRef} type="file" accept=".json" className="hidden" onChange={onImportHistory} />
                    </div>
                </div>
  
                <div className="space-y-1">
                  {storyHistory.length === 0 ? (
                      <div className="text-center text-slate-400 text-xs mt-4 italic">{t('common.noHistory')}</div>
                  ) : (
                      storyHistory.map(item => (
                          <div key={item.id} className="bg-white rounded-lg border border-slate-200 overflow-visible relative shadow-sm hover:shadow-md transition-shadow">
                              {/* 项目标题行 */}
                              <div 
                                  onClick={() => onToggleExpand(item)}
                                  className={`p-3 cursor-pointer flex justify-between items-center rounded-t-lg hover:bg-slate-50 ${activeStoryRecord?.id === item.id ? 'bg-teal-50 border-b border-teal-100' : ''}`}
                              >
                                  <div className="w-4/5 flex items-center gap-2">
                                      <div className="text-slate-400 flex-shrink-0">
                                          {expandedStoryId === item.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                                      </div>
                                      <div className="min-w-0">
                                          <div className="text-sm font-bold text-slate-700 truncate">{item.title || t('studio.manual.untitled')}</div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(item.timestamp)}</div>
                                      </div>
                                  </div>
                                  <div className="relative">
                                      <button onClick={(e) => handleToggleMenu(e, item.id)} className="text-slate-300 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 flex-shrink-0">
                                          <MoreVertical size={16} />
                                      </button>
                                      {/* 下拉操作菜单 */}
                                      {menuOpenId === item.id && (
                                          <div className="absolute right-0 top-8 w-48 bg-white border border-slate-200 shadow-xl rounded-lg z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                              <button onClick={() => onCreateChapter(item.id)} className="px-3 py-2.5 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-700">
                                                  <FileText size={14} className="text-blue-600"/> {t('studio.historyMenu.createContent')}
                                              </button>
                                              <div className="h-px bg-slate-100 my-1"></div>
                                              <button onClick={() => onExportItemJson(item)} className="px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                                                  <FileJson size={14}/> {t('studio.historyMenu.exportJson')}
                                              </button>
                                              <button onClick={() => onExportZip(item)} className="px-3 py-2 text-left text-xs hover:bg-slate-50 flex items-center gap-2 text-slate-600">
                                                  <Archive size={14}/> {t('studio.historyMenu.exportZip')}
                                              </button>
                                              <button onClick={() => onDeleteHistory(item.id)} className="px-3 py-2 text-left text-xs hover:bg-red-50 flex items-center gap-2 text-red-600">
                                                  <Trash2 size={14}/> {t('common.delete')}
                                              </button>
                                          </div>
                                      )}
                                  </div>
                              </div>
  
                              {/* 展开的子菜单 (导图/文件列表/章节) */}
                              {expandedStoryId === item.id && (
                                  <div className="bg-slate-50/50 pl-0 py-1 space-y-0.5 border-t border-slate-100 rounded-b-lg">
                                       <button 
                                          onClick={() => onOpenMaps(item)} 
                                          className={`w-full text-left px-8 py-2.5 text-xs flex items-center gap-2 border-l-4 transition-colors ${mainViewMode === 'story-map' && activeStoryRecord?.id === item.id ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
                                       >
                                           <Network size={14} /> {t('studio.tree.maps')}
                                       </button>
                                       <button 
                                          onClick={() => onOpenFolder(item)} 
                                          className={`w-full text-left px-8 py-2.5 text-xs flex items-center gap-2 border-l-4 transition-colors ${mainViewMode === 'story-files' && activeStoryRecord?.id === item.id ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold' : 'border-transparent text-slate-600 hover:bg-slate-100'}`}
                                       >
                                           <FolderOpen size={14} /> {t('studio.tree.manuscript')}
                                       </button>
                                       {/* 章节列表 */}
                                       {item.chapters && item.chapters.length > 0 && (
                                           <div className="mt-1 pb-1">
                                               {item.chapters.map((chap, idx) => (
                                                   <button 
                                                      key={idx}
                                                      onClick={() => onOpenChapter(item, idx)}
                                                      className={`w-full text-left pl-12 pr-2 py-2 text-[11px] truncate hover:text-teal-600 transition-colors ${currentChapterIndex === idx && mainViewMode === 'story-editor' && activeStoryRecord?.id === item.id ? 'text-teal-700 font-bold bg-white shadow-sm' : 'text-slate-500'}`}
                                                   >
                                                       {chap.title}
                                                   </button>
                                               ))}
                                           </div>
                                       )}
                                  </div>
                              )}
                          </div>
                      ))
                  )}
                </div>
            </div>
        </div>
    );
};