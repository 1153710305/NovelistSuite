/**
 * @file services/geminiServiceAdapter.ts
 * @description Gemini 服务适配器（前后端混合模式）
 * 
 * 策略：
 * - 已迁移到后端的功能：调用后端 API
 * - 未迁移的功能：调用前端 geminiService
 * 
 * 这样可以渐进式迁移，保持系统稳定性
 */

import BackendAPI, { pollTaskResult } from './backendApi';
import * as FrontendGeminiService from './geminiService';
import { AIMetrics, OutlineNode, ArchitectureMap } from '../types';
import { InspirationRules } from './promptService';

/**
 * 判断是否使用后端 API
 * 可通过环境变量控制
 */
const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND !== 'false'; // 默认使用后端

console.log(`[GeminiAdapter] 模式: ${USE_BACKEND ? '后端API' : '前端直连'}`);

/**
 * 每日灵感生成（适配器）
 */
export const generateDailyStories = async (
    trendFocus: string,
    sources: string[],
    targetAudience: string,
    lang: string,
    model: string,
    systemInstruction: string,
    customRules?: InspirationRules,
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void
): Promise<string> => {
    if (USE_BACKEND) {
        // 使用后端 API
        try {
            if (onUpdate) onUpdate('连接后端服务器...', 10);

            // 创建任务
            const { data } = await BackendAPI.generate.dailyStories({
                trendFocus,
                targetAudience,
                lang,
                model,
                systemInstruction,
                customRules
            });

            if (onUpdate) onUpdate('任务已创建，等待执行...', 20, `任务ID: ${data.taskId}`);

            // 轮询结果
            const result = await pollTaskResult(
                data.taskId,
                (task) => {
                    const progress = 20 + (task.progress || 0) * 0.7; // 20-90%
                    if (onUpdate) {
                        onUpdate(
                            task.status === 'running' ? '正在生成...' : '处理中...',
                            progress,
                            `状态: ${task.status}`
                        );
                    }
                },
                60,
                2000
            );

            if (onUpdate) onUpdate('生成完成', 100);

            // 返回 JSON 字符串
            return JSON.stringify(result);
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            // 回退到前端
            return FrontendGeminiService.generateDailyStories(
                trendFocus,
                sources,
                targetAudience,
                lang,
                model,
                systemInstruction,
                customRules,
                onUpdate
            );
        }
    } else {
        // 使用前端直连
        return FrontendGeminiService.generateDailyStories(
            trendFocus,
            sources,
            targetAudience,
            lang,
            model,
            systemInstruction,
            customRules,
            onUpdate
        );
    }
};

/**
 * 小说架构生成（适配器）
 */
export const generateNovelArchitecture = async (
    idea: string,
    lang: string,
    model: string,
    systemInstruction: string,
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void
): Promise<ArchitectureMap> => {
    if (USE_BACKEND) {
        try {
            if (onUpdate) onUpdate('连接后端服务器...', 10);

            const { data } = await BackendAPI.generate.novelArchitecture({
                idea,
                lang,
                model
            });

            if (onUpdate) onUpdate('任务已创建，等待执行...', 20, `任务ID: ${data.taskId}`);

            const result = await pollTaskResult(
                data.taskId,
                (task) => {
                    const progress = 20 + (task.progress || 0) * 0.7;
                    if (onUpdate) {
                        onUpdate('正在生成架构...', progress, `状态: ${task.status}`);
                    }
                }
            );

            if (onUpdate) onUpdate('生成完成', 100);

            // 后端返回的是简化的 JSON 对象，需要转换为 ArchitectureMap
            // 这里做一个基础的类型转换
            return result as ArchitectureMap;
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.generateNovelArchitecture(
                idea,
                lang,
                model,
                systemInstruction,
                onUpdate
            );
        }
    } else {
        return FrontendGeminiService.generateNovelArchitecture(
            idea,
            lang,
            model,
            systemInstruction,
            onUpdate
        );
    }
};

/**
 * 章节内容生成（适配器）
 */
export const generateChapterContent = async (
    node: OutlineNode,
    context: string,
    lang: string,
    model: string,
    stylePrompt: string | undefined,
    wordCount: number = 2000,
    systemInstruction?: string,
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void,
    previousContent?: string,
    nextChapterInfo?: { title: string, desc?: string, childrenText?: string }
): Promise<string> => {
    if (USE_BACKEND) {
        try {
            if (onUpdate) onUpdate('连接后端服务器...', 10);

            const { data } = await BackendAPI.generate.chapterContent({
                title: node.name,
                outline: node.description || '',
                wordCount,
                lang,
                model
            });

            if (onUpdate) onUpdate('任务已创建，等待执行...', 20, `任务ID: ${data.taskId}`);

            const result = await pollTaskResult(
                data.taskId,
                (task) => {
                    const progress = 20 + (task.progress || 0) * 0.7;
                    if (onUpdate) {
                        onUpdate('正在生成章节...', progress, `状态: ${task.status}`);
                    }
                }
            );

            if (onUpdate) onUpdate('生成完成', 100);

            // 返回章节内容
            return result.content || result;
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.generateChapterContent(
                node,
                context,
                lang,
                model,
                stylePrompt,
                wordCount,
                systemInstruction,
                onUpdate,
                previousContent,
                nextChapterInfo
            );
        }
    } else {
        return FrontendGeminiService.generateChapterContent(
            node,
            context,
            lang,
            model,
            stylePrompt,
            wordCount,
            systemInstruction,
            onUpdate,
            previousContent,
            nextChapterInfo
        );
    }
};

/**
 * 重绘单个导图（适配器）
 */
export const regenerateSingleMap = async (
    mapType: string,
    idea: string,
    context: string,
    lang: string,
    model: string,
    style: string | undefined,
    systemInstruction: string,
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void,
    mandatoryRequirements?: string
): Promise<OutlineNode> => {
    if (USE_BACKEND) {
        try {
            if (onUpdate) onUpdate('连接后端服务器...', 10);

            const { data } = await BackendAPI.generate.regenerateMap({
                mapType,
                idea,
                context,
                style,
                requirements: mandatoryRequirements,
                lang,
                model
            });

            if (onUpdate) onUpdate('任务已创建，等待执行...', 20, `任务ID: ${data.taskId}`);

            const result = await pollTaskResult(
                data.taskId,
                (task) => {
                    const progress = 20 + (task.progress || 0) * 0.7;
                    if (onUpdate) {
                        onUpdate('正在重绘导图...', progress, `状态: ${task.status}`);
                    }
                }
            );

            if (onUpdate) onUpdate('重绘完成', 100);
            return result as OutlineNode;
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.regenerateSingleMap(
                mapType,
                idea,
                context,
                lang,
                model,
                style,
                systemInstruction,
                onUpdate,
                mandatoryRequirements
            );
        }
    } else {
        return FrontendGeminiService.regenerateSingleMap(
            mapType,
            idea,
            context,
            lang,
            model,
            style,
            systemInstruction,
            onUpdate,
            mandatoryRequirements
        );
    }
};

/**
 * 扩展节点（适配器）
 */
export const expandNodeContent = async (
    node: OutlineNode,
    context: string,
    lang: string,
    model: string,
    style?: string,
    systemInstruction?: string
): Promise<OutlineNode[]> => {
    if (USE_BACKEND) {
        try {
            const { data } = await BackendAPI.generate.expandNode({
                node,
                context,
                style,
                lang,
                model
            });
            const result = await pollTaskResult(data.taskId);
            return result as OutlineNode[];
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.expandNodeContent(node, context, lang, model, style, systemInstruction);
        }
    } else {
        return FrontendGeminiService.expandNodeContent(node, context, lang, model, style, systemInstruction);
    }
};

/**
 * 文本工具（适配器）
 */
export const manipulateText = async (
    text: string,
    mode: 'continue' | 'rewrite' | 'polish',
    lang: string,
    model: string,
    systemInstruction?: string
): Promise<string> => {
    if (USE_BACKEND) {
        try {
            const { data } = await BackendAPI.generate.manipulateText({
                text,
                mode,
                lang,
                model
            });
            const result = await pollTaskResult(data.taskId);
            return result;
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.manipulateText(text, mode, lang, model, systemInstruction);
        }
    } else {
        return FrontendGeminiService.manipulateText(text, mode, lang, model, systemInstruction);
    }
};

/**
 * 章节重写（适配器）
 */
export const rewriteChapterWithContext = async (
    content: string,
    context: string,
    lang: string,
    model: string,
    style?: string,
    systemInstruction?: string
): Promise<string> => {
    if (USE_BACKEND) {
        try {
            const { data } = await BackendAPI.generate.rewriteChapter({
                content,
                context,
                style,
                lang,
                model
            });
            const result = await pollTaskResult(data.taskId);
            return result;
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.rewriteChapterWithContext(content, context, lang, model, style, systemInstruction);
        }
    } else {
        return FrontendGeminiService.rewriteChapterWithContext(content, context, lang, model, style, systemInstruction);
    }
};

/**
 * 趋势分析（适配器）
 */
export const analyzeTrendKeywords = async (
    sources: string[],
    gender: string,
    lang: string,
    model: string,
    systemInstruction?: string,
    onDebug?: (debugInfo: any) => void
): Promise<string> => {
    if (USE_BACKEND) {
        try {
            // 注意：后端 analyzeTrend 目前没有接收 gender 参数，可能需要后端也更新
            // 暂时先忽略 gender 参数传递给后端，或者假设后端 PromptService 已经处理了
            // 实际上后端 PromptService.analyzeTrend 也没有 gender 参数
            const { data } = await BackendAPI.generate.analyzeTrend({
                sources,
                lang,
                model
            });
            const result = await pollTaskResult(data.taskId);
            return result;
        } catch (error: any) {
            console.error('[GeminiAdapter] 后端调用失败，回退到前端:', error);
            return FrontendGeminiService.analyzeTrendKeywords(sources, gender, lang, model, systemInstruction, onDebug);
        }
    } else {
        return FrontendGeminiService.analyzeTrendKeywords(sources, gender, lang, model, systemInstruction, onDebug);
    }
};

// 导出所有其他函数...
export * from './geminiService';
