/**
 * @file components/studio/StudioFileList.tsx
 * @description 稿件箱/正文文件列表组件。
 * 
 * ## 功能
 * 1. **文件展示**: 网格化展示当前项目下的所有章节文件。
 * 2. **文件操作**: 支持删除章节、打开章节编辑。
 * 3. **新增入口**: 提供快速新建章节的入口。
 */

import React from 'react';
import { FolderOpen, FileText, Trash2, Plus } from 'lucide-react';
import { useI18n } from '../../i18n';
import { StudioRecord } from '../../types';

/**
 * 组件 Props 定义
 */
interface StudioFileListProps {
    activeStoryRecord: StudioRecord | null; // 当前激活的项目
    onOpenChapter: (record: StudioRecord, index: number) => void; // 打开章节回调
    onDeleteChapter: (e: React.MouseEvent, record: StudioRecord, index: number) => void; // 删除章节回调
    onCreateChapter: (recordId: string) => void; // 新建章节回调
}

/**
 * 文件列表组件
 */
export const StudioFileList: React.FC<StudioFileListProps> = ({
    activeStoryRecord, onOpenChapter, onDeleteChapter, onCreateChapter
}) => {
    const { t } = useI18n();

    return (
        <div className="flex-1 p-8 bg-slate-50 h-full overflow-y-auto">
            <div className="max-w-5xl mx-auto">
                {/* 文件夹头部信息 */}
                <div className="flex items-center gap-3 mb-6">
                    <FolderOpen className="text-teal-600" size={28} />
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{activeStoryRecord?.title || t('studio.manual.untitled')}</h2>
                        <p className="text-slate-500 text-sm">{t('studio.folder.manuscript')} • {activeStoryRecord?.chapters?.length || 0} {t('studio.folder.files')}</p>
                    </div>
                </div>
  
                {/* 文件网格 */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {/* 章节列表渲染 */}
                    {activeStoryRecord?.chapters?.map((chap, idx) => (
                        <div key={idx} onClick={() => onOpenChapter(activeStoryRecord!, idx)} className="group cursor-pointer flex flex-col items-center p-6 rounded-xl bg-white border border-slate-200 hover:border-teal-400 hover:shadow-md transition-all text-center relative">
                            {/* 删除按钮 (悬浮显示) */}
                            <button 
                               onClick={(e) => onDeleteChapter(e, activeStoryRecord!, idx)}
                               className="absolute top-2 right-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <Trash2 size={14} />
                            </button>
                            {/* 文件图标 */}
                            <div className="w-16 h-16 mb-4 text-teal-500 bg-teal-50 rounded-2xl flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors shadow-sm">
                                <FileText size={32} />
                            </div>
                            {/* 章节标题 */}
                            <span className="text-sm font-bold text-slate-700 line-clamp-2 mb-1 group-hover:text-teal-700">{chap.title}</span>
                            {/* 字数统计 */}
                            <span className="text-xs text-slate-400">{chap.content.length} chars</span>
                        </div>
                    ))}
                    
                    {/* 新增章节卡片 */}
                    <div 
                      onClick={() => onCreateChapter(activeStoryRecord!.id)}
                      className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-slate-200 hover:border-teal-400 hover:bg-teal-50/50 transition-all cursor-pointer opacity-70 hover:opacity-100"
                    >
                        <div className="w-16 h-16 mb-4 text-slate-300 rounded-2xl flex items-center justify-center">
                            <Plus size={32} />
                        </div>
                        <span className="text-sm font-bold text-slate-400">{t('studio.manual.addChapter')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};