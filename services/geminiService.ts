
/**
 * @file services/geminiService.ts
 * @description 与 Google Gemini API 交互的核心服务层。
 * 
 * ## 功能概述
 * - 封装 GoogleGenAI 客户端调用。
 * - 实现网络错误自动重试机制 (Exponential Backoff)。
 * - 提供 JSON 响应清洗和解析工具。
 * - 实现具体的业务逻辑接口：灵感生成、架构设计、章节撰写、插图生成等。
 * 
 * ## 变更说明
 * - 引入 `PromptService` 实现提示词解耦。
 * - 增强了 JSON 清洗逻辑。
 * - 统一了错误处理流程，修复了 429 错误无法被捕获的问题。
 * - **新增**: 在所有配置中支持动态注入 `systemInstruction`。
 * - **新增**: 增强调试信息上报，包含 sourceData。
 * - **修改**: 小说架构生成改为本地创建空白模板，不调用 API。
 * - **修改**: 趋势分析集成 Google Search Grounding，并提取引用数据到任务监控。
 * - **修复**: 故事生成透传元数据。
 * - **新增**: generateDailyStories 支持自定义生成规则。
 * - **增强**: 完善 Token 统计 (Input/Output) 和详细的错误信息返回。
 */

// 引入 Google GenAI SDK
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
// 引入类型定义
import { OutlineNode, GenerationConfig, ChatMessage, ArchitectureMap, AIMetrics, InspirationMetadata } from '../types';
// 引入提示词服务
import { PromptService, InspirationRules } from './promptService';

// --- 基础工具函数 ---

/**
 * 获取 AI 客户端实例
 * 使用环境变量中的 API Key 初始化 GoogleGenAI
 */
const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

/**
 * 清洗 JSON 字符串
 * 移除 Markdown 代码块标记 (```json ... ```)，提取第一个 { 或 [ 到最后一个 } 或 ] 之间的内容。
 * @param text AI 返回的原始文本
 * @returns 清洗后的 JSON 字符串
 */
const cleanJson = (text: string): string => {
    if (!text) return "{}";
    // 移除 markdown 标记
    let clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "");
    
    // 寻找 JSON 的起始位置 (对象或数组)
    const firstBrace = clean.indexOf('{');
    const firstBracket = clean.indexOf('[');
    let startIdx = -1;
    if (firstBrace !== -1 && firstBracket !== -1) startIdx = Math.min(firstBrace, firstBracket);
    else if (firstBrace !== -1) startIdx = firstBrace;
    else startIdx = firstBracket;

    // 寻找 JSON 的结束位置
    const lastBrace = clean.lastIndexOf('}');
    const lastBracket = clean.lastIndexOf(']');
    let endIdx = -1;
    if (lastBrace !== -1 && lastBracket !== -1) endIdx = Math.max(lastBrace, lastBracket);
    else if (lastBrace !== -1) endIdx = lastBrace;
    else endIdx = lastBracket;

    // 截取有效 JSON 片段
    if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        clean = clean.substring(startIdx, endIdx + 1);
    }
    return clean.trim();
};

/**
 * 截断上下文
 * 防止上下文过长导致 Token 超限或费用过高。
 * @param text 原始上下文
 * @param maxLength 最大字符数 (默认 50000)
 */
const truncateContext = (text: string, maxLength: number = 50000): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "\n...[由于长度限制，上下文已截断]...";
};

/**
 * 提取 AI 性能指标
 * @param response API 响应对象
 * @param model 使用的模型
 * @param startTime 请求开始时间
 */
const extractMetrics = (response: any, model: string, startTime: number): AIMetrics => {
    const endTime = Date.now();
    const usage = response.usageMetadata || {};
    return {
        model: model,
        inputTokens: usage.promptTokenCount || 0,
        outputTokens: usage.candidatesTokenCount || 0,
        totalTokens: usage.totalTokenCount || 0,
        latency: endTime - startTime
    };
}

// --- 错误处理与重试机制 ---

/**
 * 辅助函数：获取错误的详细字符串信息
 * 用于处理可能是 Error 对象、JSON 对象或字符串的错误信息，便于正则匹配。
 */
const getErrorDetails = (error: any): string => {
    if (!error) return "unknown error";
    if (typeof error === 'string') return error.toLowerCase();
    
    // 如果是 Error 对象，组合 message 和 stack
    if (error instanceof Error) {
        // 如果 error.message 本身就是 JSON 字符串，尝试解析
        try {
             const jsonMsg = JSON.parse(error.message);
             return JSON.stringify(jsonMsg) + ' ' + (error.stack || '');
        } catch {
             return (error.message + ' ' + (error.stack || '')).toLowerCase();
        }
    }
    
    // 尝试 JSON 序列化以捕获包含在对象中的错误码 (如 Google GenAI 返回的结构)
    try {
        return JSON.stringify(error).toLowerCase();
    } catch {
        return String(error).toLowerCase();
    }
};

/**
 * 带指数退避的自动重试函数
 * @param fn 执行的异步函数
 * @param retries 剩余重试次数
 * @param baseDelay 基础延迟时间 (毫秒)
 */
const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 3, baseDelay = 3000): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        const errStr = getErrorDetails(error);
        
        // 检查是否为可重试的错误类型
        const isRetryable = (
            errStr.includes('429') ||  // 配额超限
            errStr.includes('resource_exhausted') || // 资源耗尽
            errStr.includes('quota') || // 配额相关
            errStr.includes('503') ||  // 服务不可用
            errStr.includes('504') ||  // 网关超时
            errStr.includes('500') ||  // 服务器内部错误
            errStr.includes('overloaded') || // 过载
            errStr.includes('fetch failed') || // 网络请求失败
            errStr.includes('timeout') || // 超时
            errStr.includes('network') || // 网络错误
            errStr.includes('econnreset') // 连接重置
        );

        if (retries > 0 && isRetryable) {
            // 针对限流错误 (429/Quota)，使用更长的等待时间 (基础延迟翻倍)
            const isRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted');
            const delay = isRateLimit ? (baseDelay * 2) + Math.random() * 1000 : baseDelay + Math.random() * 1000;
            
            console.warn(`[Gemini] API 错误 (${isRateLimit ? '配额/限流' : '网络/服务'}), ${Math.round(delay)}ms 后重试... 剩余次数: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // 递归重试
            return retryWithBackoff(fn, retries - 1, baseDelay * 2);
        }
        throw error;
    }
};

/**
 * 统一错误处理，生成用户友好的错误信息，同时保留原始错误详情
 */
const handleGeminiError = (error: any, context: string): string => {
    const errStr = getErrorDetails(error);
    console.error(`GeminiService Error [${context}]:`, error);

    let userMsg = "⚠️ 发生未知错误";
    let detailMsg = errStr;

    if (errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota')) {
        userMsg = "⚠️ API 配额耗尽 (429)。请检查您的 API Key 额度，或者在设置中切换为免费/低消耗模型 (如 Gemini Flash Lite)。";
    } else if (errStr.includes('timeout') || errStr.includes('network') || errStr.includes('fetch')) {
        userMsg = "⚠️ 网络连接超时或服务繁忙。请检查网络连接并重试。";
    } else if (errStr.includes('safety') || errStr.includes('blocked') || errStr.includes('finishreason')) {
        userMsg = "⚠️ 内容被安全过滤器拦截。请修改提示词或重试。";
    } else if (errStr.includes('json')) {
        userMsg = "⚠️ 数据解析失败。AI 返回了无效的格式，请重试。";
    }

    // 返回格式化的错误信息，包含原始详情以便 Debug
    return `${userMsg}\n\n[详细错误]: ${detailMsg.substring(0, 300)}...`;
};

// --- 业务功能实现 ---

/**
 * 分析趋势关键词
 */
export const analyzeTrendKeywords = async (
    sources: string[], 
    gender: string,
    lang: string, 
    model: string, 
    systemInstruction?: string,
    onDebug?: (debugInfo: any) => void 
): Promise<string> => {
    const ai = getAiClient();
    const platformNames = sources.map(s => {
        if(s === 'qidian') return '起点中文网';
        if(s === 'fanqie') return '番茄小说';
        if(s === 'jinjiang') return '晋江文学城';
        return s;
    }).join('、');
    const genderStr = gender === 'male' ? '男频' : '女频';

    const prompt = `
    请使用 Google Search 搜索最新的"${platformNames} ${genderStr} 小说排行榜"或"热门飙升榜"。
    查找当前排名靠前的网络小说，分析它们的书名和题材。
    
    根据搜索到的真实数据，${PromptService.analyzeTrend(sources)}
    
    ${PromptService.getLangInstruction(lang)}
    `;

    if (onDebug) {
        onDebug({ 
            prompt: prompt, 
            model: model, 
            systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang),
            context: `Grounding Search: ${platformNames} ${genderStr}`,
            sourceData: "Requesting Google Search..." 
        });
    }

    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang),
                tools: [{ googleSearch: {} }]
            }
        }));

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        let sourceData: any[] = [];
        if (groundingChunks) {
            sourceData = groundingChunks.map(chunk => {
                if (chunk.web) {
                    return { platform: 'Web Search', title: chunk.web.title || 'Source', hot: chunk.web.uri };
                }
                return null;
            }).filter(item => item !== null);
        }

        if (onDebug && sourceData.length > 0) {
            onDebug({ sourceData: sourceData });
        }

        return response.text?.trim() || "热门趋势";
    } catch (error) { 
        console.error("Trend Analysis Failed", error);
        return "玄幻"; 
    }
}

/**
 * 每日灵感生成
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
    const ai = getAiClient();
    const prompt = `${PromptService.dailyInspiration(trendFocus, targetAudience, customRules)} ${PromptService.getLangInstruction(lang)}`;
    const finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);

    const schema: Schema = {
      type: Type.ARRAY,
      items: {
          type: Type.OBJECT,
          properties: {
              title: { type: Type.STRING },
              synopsis: { type: Type.STRING },
              metadata: {
                  type: Type.OBJECT,
                  properties: {
                      source: { type: Type.STRING },
                      gender: { type: Type.STRING },
                      majorCategory: { type: Type.STRING },
                      theme: { type: Type.STRING },
                      characterArchetype: { type: Type.STRING },
                      plotType: { type: Type.STRING },
                      trope: { type: Type.STRING },
                      goldenFinger: { type: Type.STRING },
                      coolPoint: { type: Type.STRING },
                      burstPoint: { type: Type.STRING },
                      memoryAnchor: { type: Type.STRING }
                  },
                  required: ["source", "gender", "majorCategory", "trope", "goldenFinger", "coolPoint", "burstPoint"]
              }
          },
          required: ["title", "synopsis", "metadata"]
      }
    };

    try {
        if (onUpdate) onUpdate("正在连接 Gemini...", 20, `Model: ${model}`, undefined, { 
            prompt, 
            model,
            systemInstruction: finalSystemInstruction,
            context: `Trend: ${trendFocus}, Audience: ${targetAudience}`
        });
        
        const startTime = Date.now();

        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { 
                responseMimeType: "application/json", 
                responseSchema: schema,
                systemInstruction: finalSystemInstruction
            }
        }));
        
        const metrics = extractMetrics(response, model, startTime);
        if (onUpdate) onUpdate("解析结果", 98, "正在清洗 JSON", metrics);
        
        const text = cleanJson(response.text || "[]");
        JSON.parse(text); 
        return text;
    } catch (error: any) {
        throw new Error(handleGeminiError(error, 'generateDailyStories'));
    }
};

/**
 * 辅助函数：为生成的节点分配唯一 ID
 */
const assignIds = (node: OutlineNode | undefined): OutlineNode => {
    if (!node) {
        return { 
            id: Math.random().toString().substring(2, 11), 
            name: '生成失败节点', 
            type: 'book', 
            description: '该节点生成失败，请重试。' 
        };
    }
    if (!node.id) node.id = Math.random().toString(36).substring(2, 11);
    if (node.children) node.children = node.children.map(assignIds);
    return node;
}

/**
 * 小说架构生成 (8-Map System)
 */
export const generateNovelArchitecture = async (
    idea: string, 
    lang: string, 
    model: string,
    systemInstruction: string,
    onProgress?: (stage: string, percent: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void
): Promise<ArchitectureMap & { synopsis: string }> => {
    
    if (onProgress) onProgress('初始化', 10, "正在创建空白架构...", undefined, { 
        model: 'Local Template Engine', 
        prompt: 'N/A (Local Generation)',
        systemInstruction: systemInstruction,
        context: `Idea: ${idea}`
    });
    
    await new Promise(resolve => setTimeout(resolve, 500));

    const createRoot = (name: string, type: any, description: string = "点击编辑以添加详情..."): OutlineNode => ({
        id: Math.random().toString(36).substring(2, 11),
        name: name,
        type: type,
        description: description,
        children: []
    });

    if (onProgress) onProgress('完成', 100, "架构模版已就绪");

    return {
        synopsis: idea,
        world: createRoot('世界观设定', 'book', '定义地理环境、历史背景和核心法则。'),
        structure: createRoot('宏观结构', 'book', '规划分卷和整体节奏。'),
        character: createRoot('角色档案', 'character', '定义主角、反派和主要配角。'),
        system: createRoot('力量体系', 'system', '定义等级划分和升级条件。'),
        mission: createRoot('任务状态', 'mission', '主角的任务线和状态变化。'),
        anchor: createRoot('伏笔锚点', 'anchor', '关键物品和伏笔埋设。'),
        events: createRoot('事件时间轴', 'event', '关键剧情转折点。'),
        chapters: createRoot('章节细纲', 'chapter', '具体章节规划。')
    };
}

/**
 * 提取上下文
 */
export const extractContextFromTree = (root: OutlineNode): string => {
    let context = '';
    const traverse = (node: OutlineNode) => {
        if (node.type === 'character') context += `【角色】${node.name}: ${node.description}\n`;
        if (node.type === 'setting') context += `【设定】${node.name}: ${node.description}\n`;
        if (node.children) node.children.forEach(traverse);
    }
    if (root) traverse(root);
    return context;
}

/**
 * 故事生成入口 (Workflow)
 */
export const generateStoryFromIdea = async (
    idea: string, 
    config: GenerationConfig, 
    lang: string, 
    model: string,
    stylePrompt: string | undefined,
    systemInstruction: string, 
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void
): Promise<{ 
    title: string, 
    content: string, 
    architecture: ArchitectureMap | null, 
    chapters?: {title:string, content:string, nodeId?: string}[],
    metadata?: InspirationMetadata
}> => {
    
    let cleanTitle = "新书草稿";
    let synopsis = idea;
    let metadataStr = "";
    let metadata: InspirationMetadata | undefined = undefined;

    try {
        const parsed = JSON.parse(idea);
        if (parsed.title) cleanTitle = parsed.title;
        if (parsed.synopsis) synopsis = parsed.synopsis;
        if (parsed.metadata) {
             metadata = parsed.metadata;
             metadataStr = `\n【元数据】\n标签：${parsed.metadata.theme || ''}\n`;
        }
    } catch(e) {}

    try {
        if (onUpdate) {
            onUpdate("构建架构", 10, "正在初始化 8-图架构模板...", undefined, {
                context: `【简介】\n${synopsis}${metadataStr}` 
            });
        }
        
        const architecture = await generateNovelArchitecture(synopsis, lang, model, systemInstruction, (stage, percent, log, metrics, debugInfo) => {
            if (onUpdate) onUpdate(stage, Math.floor(percent * 0.9), log, metrics, debugInfo);
        });

        if (onUpdate) onUpdate("完成", 100, "架构已生成（跳过正文撰写）");

        return {
            title: cleanTitle,
            architecture: architecture,
            content: "连载项目（架构已就绪）",
            chapters: [],
            metadata: metadata
        };

    } catch (error) {
        throw new Error(handleGeminiError(error, 'generateStoryFromIdea'));
    }
};

/**
 * 章节生成
 */
export const generateChapterContent = async (
    node: OutlineNode, 
    context: string, 
    lang: string, 
    model: string, 
    stylePrompt: string | undefined, 
    wordCount: number = 2000,
    systemInstruction?: string,
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void
): Promise<string> => {
    const ai = getAiClient();
    const safeContext = truncateContext(context, 40000);
    const prompt = `${PromptService.writeChapter(node.name, node.description || '', safeContext, wordCount, stylePrompt)} ${PromptService.getLangInstruction(lang)}`;
    const finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);
    
    if (onUpdate) onUpdate("章节生成", 20, "构建 Prompt...", undefined, { 
        prompt, 
        context: safeContext, 
        model, 
        systemInstruction: finalSystemInstruction
    });

    try {
        const startTime = Date.now();
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt,
            config: {
                systemInstruction: finalSystemInstruction
            }
        }));
        const metrics = extractMetrics(response, model, startTime);
        if (onUpdate) onUpdate("章节生成", 100, "完成", metrics);
        
        return response.text || "生成失败，请重试。";
    } catch(error) { throw new Error(handleGeminiError(error, 'generateChapterContent')); }
}

/**
 * 带上下文的重写
 */
export const rewriteChapterWithContext = async (
    content: string, 
    context: string, 
    lang: string, 
    model: string, 
    customInstruction?: string,
    systemInstruction?: string
): Promise<string> => {
     const ai = getAiClient();
     const instruction = customInstruction || "请重写以下内容，保持核心情节不变，但提升文笔和画面感。";
     const prompt = `${instruction}\n\n【背景设定/上下文】：\n${truncateContext(context, 20000)}\n\n【原文】：\n${content}\n\n${PromptService.getLangInstruction(lang)}`;
     
     try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang)
            }
        }));
        return response.text || content;
     } catch(error) {
         throw new Error(handleGeminiError(error, 'rewriteChapterWithContext'));
     }
};

/**
 * 文本操作 (改写/润色)
 */
export const manipulateText = async (text: string, mode: 'continue' | 'rewrite' | 'polish', lang: string, model: string, systemInstruction?: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `${PromptService.manipulateText(text, mode)} ${PromptService.getLangInstruction(lang)}`;
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang)
            }
        }));
        return response.text || "处理失败。";
    } catch(error) { throw new Error(handleGeminiError(error, 'manipulateText')); }
};

/**
 * 分析文本
 */
export const analyzeText = async (textOrUrl: string, focus: 'pacing' | 'characters' | 'viral_factors', lang: string, model: string, systemInstruction?: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = `请分析以下文本的 ${focus === 'viral_factors' ? '爆款因子' : focus === 'pacing' ? '节奏密度' : '角色弧光'}。\n${PromptService.getLangInstruction(lang)}\n内容：${textOrUrl.substring(0, 10000)}`;
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt,
            config: {
                systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang)
            }
        }));
        return response.text || "暂无分析结果。";
    } catch (error) { throw new Error(handleGeminiError(error, 'analyzeText')); }
};

export const generateImage = async (prompt: string, model: string = 'imagen-4.0-generate-001', aspectRatio: string = '1:1'): Promise<string> => {
    const ai = getAiClient();
    try {
        let base64Image: string | undefined;
        if (model.includes('flash-image')) {
            const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ model, contents: { parts: [{ text: prompt }] }, config: { imageConfig: { aspectRatio: aspectRatio as any } } }));
            base64Image = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
        } else {
            const response = await retryWithBackoff<any>(() => ai.models.generateImages({ model, prompt, config: { numberOfImages: 1, aspectRatio: aspectRatio as any, outputMimeType: 'image/jpeg' } }));
            base64Image = response.generatedImages?.[0]?.image?.imageBytes;
        }
        if (base64Image) return `data:image/jpeg;base64,${base64Image}`;
        throw new Error("API 未返回图像数据。");
    } catch (error: any) { throw error; }
}
export const generateCover = async (prompt: string, model: string = 'imagen-4.0-generate-001'): Promise<string> => generateImage(prompt, model, '3:4');
export const generateIllustrationPrompt = async (context: string, lang: string, model: string): Promise<string> => {
    const ai = getAiClient();
    const prompt = PromptService.illustrationPrompt(context);
    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt,
            config: { systemInstruction: "You are an expert prompt engineer for Midjourney/Stable Diffusion." }
        }));
        return response.text?.trim() || "A detailed fantasy illustration";
    } catch (error) { return "Fantasy scene"; }
}

export const streamChatResponse = async (messages: ChatMessage[], newMessage: string, model: string, systemInstruction: string | undefined, onChunk: (text: string) => void): Promise<string> => {
    const ai = getAiClient();
    const history = messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    const chat = ai.chats.create({ 
        model, 
        history,
        config: {
            systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction('zh')
        }
    });
    let fullResponse = '';
    try {
        const result = await chat.sendMessageStream({ message: newMessage });
        for await (const chunk of result) {
            const text = chunk.text;
            if (text) { fullResponse += text; onChunk(fullResponse); }
        }
        return fullResponse;
    } catch (error) {
        const errMsg = handleGeminiError(error, 'streamChat');
        onChunk(`[System Error] ${errMsg}`);
        throw error;
    }
}

/**
 * 重绘单个导图
 * 优化：解决 Gemini 3.0 Pro 过度总结导致只有单节点的问题。
 */
export const regenerateSingleMap = async (
    mapType: string, 
    idea: string, 
    context: string, 
    lang: string, 
    model: string, 
    style: string | undefined, 
    systemInstruction: string, 
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void
) => {
    const ai = getAiClient();
    
    // 强制性的递归结构提示
    // 明确要求模型使用 children 数组，而不是 description 文本列表
    const structurePrompt = `
    You MUST return a valid JSON object representing the ROOT node of the mind map.
    
    CRITICAL STRUCTURE RULES:
    1. The output must be a nested tree using the 'children' array.
    2. Do NOT summarize complex lists in the 'description'. You MUST create child nodes for each item/level/stage.
    3. Depth: At least 3 levels deep (Root -> Categories -> Items).
    4. Breadth: Each level should have multiple children.
    
    Interface:
    interface OutlineNode {
        name: string; 
        type: string; // 'book', 'volume', 'chapter', 'setting', 'character', 'system', 'level', 'item'
        description: string;
        children?: OutlineNode[]; 
    }
    `;

    // 针对特定导图类型的额外反总结指令
    let specificInstruction = "";
    if (mapType === 'system') {
        specificInstruction = "For a Power System (爽点体系): Break it down into hierarchical Ranks/Levels (e.g., Qi Refining -> Foundation). Each Rank MUST be a separate child node. Do not put all ranks in one description summary.";
    } else if (mapType === 'world') {
        specificInstruction = "For World Setting: Create distinct child nodes for Geography, History, and Factions. Do not merge them into one text block.";
    }

    // 优化 Context 构建：如果 context 本身已经很长且包含了选定的导图类型信息，这里只附加必要的提示
    const promptContext = context 
        ? `\n【参考上下文 (Context Reference)】:\n${context}` 
        : "";

    const prompt = `重绘导图：${mapType}\n基于核心构思：${idea}${promptContext}\n${style ? `\n风格/特殊指令：${style}` : ''}\n${specificInstruction}\n${structurePrompt}\n${PromptService.getLangInstruction(lang)}`;
    const finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);
    
    if (onUpdate) onUpdate("构建提示词", 10, undefined, undefined, { 
        prompt, 
        context, 
        model,
        systemInstruction: finalSystemInstruction
    });

    const startTime = Date.now();
    try {
        const res = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json", 
                systemInstruction: finalSystemInstruction
            } 
        }));
        
        const metrics = extractMetrics(res, model, startTime);
        if (onUpdate) onUpdate("解析结果", 90, "JSON 清洗中", metrics);

        return assignIds(JSON.parse(cleanJson(res.text || "{}")));
    } catch (error: any) {
        throw new Error(handleGeminiError(error, 'regenerateSingleMap'));
    }
}

// 扩展节点
export const expandNodeContent = async (parentNode: OutlineNode, context: string, lang: string, model: string, style: string | undefined, systemInstruction?: string) => {
    const ai = getAiClient();
    
    const structurePrompt = `
    Return a JSON object with a 'children' array containing the new sub-nodes.
    Structure: { children: [{ name, type, description, children? }] }
    `;

    const prompt = `扩展节点：${parentNode.name}\n上下文：${context}\n${style ? `风格/指令：${style}` : ''}\n${structurePrompt}\n${PromptService.getLangInstruction(lang)}`;
    
    try {
        const res = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({ 
            model, 
            contents: prompt, 
            config: { 
                responseMimeType: "application/json", 
                systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang)
            } 
        }));
        return JSON.parse(cleanJson(res.text || "{}")).children?.map(assignIds) || [];
    } catch (error) {
        throw new Error(handleGeminiError(error, 'expandNodeContent'));
    }
}
