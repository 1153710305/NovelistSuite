/**
 * @file components/studio/StudioEditor.tsx
 * @description 沉浸式写作编辑器组件。
 * 
 * ## 功能
 * 1. **文本编辑**: 提供大字号、无干扰的 Markdown 编辑环境。
 * 2. **AI 辅助**: 集成 AI 重写、润色、续写功能。
 * 3. **插图生成**: 支持基于上下文自动生成插图并插入文档。
 * 4. **预览模式**: 支持 Markdown 渲染预览。
 */

import React, { useRef, useState } from 'react';
import { 
    Pencil,     // 编辑图标
    Eye,        // 预览图标
    ZoomIn,     // 放大
    ZoomOut,    // 缩小
    ImageIcon,  // 图片图标
    Loader2,    // 加载中
    Upload,     // 上传
    Sparkles    // AI 魔法图标
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useI18n } from '../../i18n';
import { StudioRecord, PromptTemplate } from '../../types';

/**
 * 组件 Props 定义
 */
interface StudioEditorProps {
    activeStoryRecord: StudioRecord | null; // 当前编辑的项目
    currentChapterIndex: number | null; // 当前章节索引
    onUpdateContent: (newContent: string) => void; // 内容更新回调
    promptLibrary: PromptTemplate[]; // 提示词库
    isRewriting: boolean; // 是否正在重写中
    onRewrite: (promptId: string) => void; // 触发重写回调
    onGenerateIllustration: (mode: 'context' | 'prompt' | 'upload', prompt?: string, file?: File) => void; // 触发插图生成回调
    isGeneratingIllu: boolean; // 是否正在生成插图
}

/**
 * 写作编辑器组件
 */
export const StudioEditor: React.FC<StudioEditorProps> = ({
    activeStoryRecord, currentChapterIndex, onUpdateContent, promptLibrary,
    isRewriting, onRewrite, onGenerateIllustration, isGeneratingIllu
}) => {
    const { t } = useI18n();
    // 字体大小状态
    const [editorFontSize, setEditorFontSize] = useState(18);
    // 预览模式状态
    const [isEditorPreview, setIsEditorPreview] = useState(false);
    // 选中的重写提示词 ID
    const [selectedPromptId, setSelectedPromptId] = useState('');
    
    // 插图模态框状态
    const [showIlluModal, setShowIlluModal] = useState(false);
    const [illuMode, setIlluMode] = useState<'context' | 'prompt' | 'upload'>('context');
    const [illuPrompt, setIlluPrompt] = useState('');
    
    const editorRef = useRef<HTMLTextAreaElement>(null);

    // 获取当前章节内容
    const currentContent = activeStoryRecord?.chapters?.[currentChapterIndex || 0]?.content || activeStoryRecord?.content || '';

    // 图片上传处理
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onGenerateIllustration('upload', undefined, file);
            setShowIlluModal(false);
        }
    };

    // 触发生成插图
    const handleGenIllu = () => {
        onGenerateIllustration(illuMode, illuPrompt);
        setShowIlluModal(false);
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-slate-50 relative">
             {/* 插图生成浮层 */}
             {showIlluModal && (
                <div className="absolute top-16 right-6 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-3 border-b flex justify-between items-center bg-slate-50 rounded-t-xl">
                        <h3 className="font-bold text-xs text-slate-700 flex items-center gap-2"><ImageIcon size={14}/> {t('studio.editor.insertIllu')}</h3>
                        <button onClick={() => setShowIlluModal(false)}><span className="text-lg">&times;</span></button>
                    </div>
                    <div className="p-4">
                        {/* 模式切换 */}
                        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
                            <button onClick={() => setIlluMode('context')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${illuMode==='context'?'bg-white shadow text-teal-700':'text-slate-500'}`}>{t('studio.editor.illuContext')}</button>
                            <button onClick={() => setIlluMode('prompt')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${illuMode==='prompt'?'bg-white shadow text-teal-700':'text-slate-500'}`}>{t('studio.editor.illuPrompt')}</button>
                            <button onClick={() => setIlluMode('upload')} className={`flex-1 py-1.5 text-[10px] font-bold rounded ${illuMode==='upload'?'bg-white shadow text-teal-700':'text-slate-500'}`}>{t('studio.editor.illuUpload')}</button>
                        </div>
    
                        {/* 上下文模式说明 */}
                        {illuMode === 'context' && (
                            <div className="text-xs text-slate-500 mb-4 bg-blue-50 p-3 rounded border border-blue-100">
                                <Sparkles size={14} className="inline mr-1 text-blue-500"/>
                                AI 将分析光标附近的文本，自动生成场景插图。
                            </div>
                        )}
    
                        {/* 自定义提示词输入 */}
                        {illuMode === 'prompt' && (
                            <textarea 
                                value={illuPrompt} 
                                onChange={e => setIlluPrompt(e.target.value)} 
                                placeholder="描述画面..."
                                className="w-full p-2 border rounded text-xs h-20 mb-4 resize-none"
                            />
                        )}
    
                        {/* 上传区域 */}
                        {illuMode === 'upload' && (
                             <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:bg-slate-50 transition-colors cursor-pointer relative mb-4">
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                                <Upload size={24} className="mx-auto text-slate-400 mb-2"/>
                                <span className="text-xs text-slate-500">点击上传图片</span>
                             </div>
                        )}
    
                        {/* 生成按钮 */}
                        {illuMode !== 'upload' && (
                            <button 
                                onClick={handleGenIllu} 
                                disabled={isGeneratingIllu}
                                className="w-full py-2 bg-slate-900 text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isGeneratingIllu ? <Loader2 className="animate-spin" size={14}/> : <ImageIcon size={14}/>}
                                {t('studio.editor.generateIllu')}
                            </button>
                        )}
                    </div>
                </div>
              )}
            
            {/* 编辑器工具栏 */}
            <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 z-20">
                <div className="flex items-center gap-2 text-sm text-slate-500 max-w-[30%]">
                    <span className="font-bold text-slate-800 truncate">{activeStoryRecord?.title}</span>
                </div>
                
                <div className="flex items-center gap-3">
                      {/* 预览/编辑切换 */}
                      <div className="flex bg-slate-100 p-1 rounded-lg">
                          <button onClick={() => setIsEditorPreview(false)} className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${!isEditorPreview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                              <Pencil size={12}/> {t('studio.editor.edit')}
                          </button>
                          <button onClick={() => setIsEditorPreview(true)} className={`px-3 py-1 rounded text-[10px] font-bold flex items-center gap-1 transition-all ${isEditorPreview ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
                              <Eye size={12}/> {t('studio.editor.preview')}
                          </button>
                      </div>
  
                      <div className="h-6 w-px bg-slate-200"></div>
  
                      {/* 字体缩放 */}
                      <div className="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                          <button onClick={() => setEditorFontSize(prev => Math.max(12, prev - 2))} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"><ZoomOut size={16}/></button>
                          <span className="text-xs font-mono text-slate-500 w-8 text-center">{editorFontSize}</span>
                          <button onClick={() => setEditorFontSize(prev => Math.min(32, prev + 2))} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded"><ZoomIn size={16}/></button>
                      </div>
                      
                      <div className="h-6 w-px bg-slate-200"></div>
  
                      {/* 插入插图按钮 */}
                      <button 
                          onClick={() => setShowIlluModal(!showIlluModal)}
                          className={`p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-teal-600 transition-colors relative ${showIlluModal ? 'bg-teal-50 text-teal-600' : ''}`}
                          title={t('studio.editor.insertIllu')}
                      >
                          <ImageIcon size={18} />
                      </button>
                      
                      <div className="h-6 w-px bg-slate-200"></div>
                      
                      {/* AI 修改/重写工具 */}
                      <div className="flex items-center bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
                          <span className="text-[10px] text-slate-400 mr-2 uppercase font-bold">{t('studio.editor.aiModify')}</span>
                          <select 
                              value={selectedPromptId} 
                              onChange={(e) => setSelectedPromptId(e.target.value)}
                              className="text-xs bg-transparent border-none focus:ring-0 text-slate-700 w-32 cursor-pointer outline-none"
                          >
                              <option value="">{t('studio.editor.selectPrompt')}</option>
                              {promptLibrary.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                      </div>
                      <button 
                          onClick={() => onRewrite(selectedPromptId)} 
                          disabled={isRewriting || isEditorPreview}
                          className="px-4 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 flex items-center gap-1 shadow-sm disabled:opacity-50 transition-colors"
                      >
                          {isRewriting ? <Loader2 className="animate-spin" size={14}/> : <Pencil size={14}/>}
                          {t('common.apply')}
                      </button>
                </div>
            </div>
  
            {/* 文本编辑区域 */}
            <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
                <div className="max-w-3xl mx-auto bg-white min-h-[calc(100%-2rem)] shadow-lg shadow-slate-200/50 border border-slate-200/60 p-12 rounded-xl transition-all">
                      {isEditorPreview ? (
                          <div className="prose prose-slate max-w-none font-serif leading-loose text-slate-800" style={{ fontSize: `${editorFontSize}px` }}>
                              <ReactMarkdown>{currentContent}</ReactMarkdown>
                          </div>
                      ) : (
                          <textarea 
                              ref={editorRef}
                              className="w-full h-full min-h-[600px] resize-none focus:outline-none text-slate-800 leading-loose font-serif bg-transparent placeholder-slate-300"
                              style={{ fontSize: `${editorFontSize}px` }}
                              value={currentContent}
                              onChange={(e) => onUpdateContent(e.target.value)}
                              placeholder="开始写作..."
                              id="studio-editor-textarea" // 用于插图插入定位
                          />
                      )}
                </div>
            </div>
        </div>
    );
}