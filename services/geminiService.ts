



// 引入 Google GenAI SDK
import { GoogleGenAI, Type, Schema, GenerateContentResponse } from "@google/genai";
// 引入类型定义
import { OutlineNode, GenerationConfig, ChatMessage, ArchitectureMap, AIMetrics, InspirationMetadata, EmbeddingModel } from '../types';
// 引入提示词服务
import { PromptService, InspirationRules } from './promptService';
// 引入统一管理的提示词
import {
    CONTEXT_OPTIMIZATION_SYSTEM_PROMPT,
    PROMPT_CONVERSION_INSTRUCTION,
    TEXT_ANALYSIS_PROMPT,
    REGENERATE_MAP_FULL_PROMPT,
    REGENERATE_MAP_DISPLAY_PROMPT,
    EXPAND_NODE_FULL_PROMPT
} from '../prompts';
// 引入本地 Embedding 库
import { pipeline } from '@xenova/transformers';

// --- 基础工具函数 ---

/**
 * 获取 AI 客户端实例
 * 使用环境变量中的 API Key 初始化 GoogleGenAI。
 * 显式设置超时时间为 300000ms (5分钟)，防止浏览器端 Fetch 提前中断。
 */
const getAiClient = () => {
    const key = process.env.API_KEY;
    console.log("[GeminiService] Initializing Client with Key:", key ? `${key.substring(0, 8)}...` : "undefined");

    if (!key || key.includes('your_api_key')) {
        console.error("[GeminiService] Invalid API Key detected!");
    }

    return new GoogleGenAI({
        apiKey: key,
        requestOptions: { timeout: 300000 }
    } as any);
};

/**
 * 获取 Fast 模式配置
 * Fast 模式通过优化参数来提高响应速度,同时保持输出质量
 * @param fastMode 是否启用 Fast 模式
 * @param taskType 任务类型 (用于针对性优化)
 * @returns 优化后的配置参数
 */
export const getFastModeConfig = (fastMode: boolean, taskType?: string) => {
    if (!fastMode) {
        // 正常模式 - 使用默认参数
        return {
            temperature: 1.0,
            topP: 0.95,
            topK: 40
        };
    }

    // Fast 模式 - 优化参数
    // 降低 temperature 提高确定性,减少随机性,加快生成速度
    // 调整 topP 和 topK 减少候选token数量
    const baseConfig = {
        temperature: 0.7,  // 降低温度,提高确定性
        topP: 0.9,         // 略微降低,减少候选范围
        topK: 30           // 减少候选token数量
    };

    // 根据任务类型进一步优化
    if (taskType === 'simple' || taskType === 'polish') {
        // 简单任务可以更激进
        return {
            temperature: 0.5,
            topP: 0.85,
            topK: 20
        };
    }

    return baseConfig;
};

// 本地模型单例，防止重复加载
let localEmbedder: any = null;

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
            errStr.includes('resource_exhausted') ||
            errStr.includes('quota') ||
            errStr.includes('503') ||  // 服务不可用
            errStr.includes('504') ||  // 网关超时
            errStr.includes('500') ||  // 服务器内部错误
            errStr.includes('overloaded') ||
            errStr.includes('fetch failed') ||
            errStr.includes('failed to fetch') ||
            errStr.includes('timeout') ||
            errStr.includes('network') ||
            errStr.includes('econnreset')
        );

        if (retries > 0 && isRetryable) {
            const isRateLimit = errStr.includes('429') || errStr.includes('quota') || errStr.includes('resource_exhausted');
            const isNetworkError = errStr.includes('fetch') || errStr.includes('network');

            let delay = baseDelay;
            // 针对 429 错误增加更长的等待时间 (5-8秒)，避免瞬时重试再次失败
            if (isRateLimit) delay = (baseDelay * 3) + Math.random() * 2000;
            if (isNetworkError) delay = (baseDelay * 1.5) + Math.random() * 500;

            console.warn(`[Gemini] API 错误 (${isRateLimit ? '配额/限流' : '网络/服务'}), ${Math.round(delay)}ms 后重试... 剩余次数: ${retries}`);
            await new Promise(resolve => setTimeout(resolve, delay));

            return retryWithBackoff(fn, retries - 1, baseDelay * 2);
        }
        throw error;
    }
};

/**
 * 统一错误处理
 */
const handleGeminiError = (error: any, context: string): string => {
    const errStr = getErrorDetails(error);
    console.error(`GeminiService Error [${context}]:`, error);

    let userMsg = "⚠️ 发生未知错误";
    let detailMsg = errStr;

    if (errStr.includes('429') || errStr.includes('resource_exhausted') || errStr.includes('quota')) {
        userMsg = "⚠️ API 配额耗尽 (429)。请检查您的 API Key 额度，或者在设置中切换为免费/低消耗模型。";
    } else if (errStr.includes('timeout') || errStr.includes('network') || errStr.includes('fetch')) {
        userMsg = "⚠️ 网络连接超时或服务繁忙。请检查网络连接并重试。";
    } else if (errStr.includes('safety') || errStr.includes('blocked')) {
        userMsg = "⚠️ 内容被安全过滤器拦截。";
    } else if (errStr.includes('json')) {
        userMsg = "⚠️ 数据解析失败。";
    }

    return `${userMsg}\n\n[详细错误]: ${detailMsg.substring(0, 500)}...`;
};

// --- 向量化检索增强 (RAG) 实现 ---

function cosineSimilarity(vecA: number[], vecB: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// 增加 model 参数，支持错误抛出，支持本地模型
async function generateEmbedding(text: string, model: string = "local-minilm"): Promise<number[] | { error: string }> {
    // 1. 处理本地开源模型
    if (model === EmbeddingModel.LOCAL_MINILM) {
        try {
            if (!localEmbedder) {
                console.log("[LocalRAG] Loading Local Embedding Model: Xenova/all-MiniLM-L6-v2...");
                // 首次调用会自动从 CDN 下载模型文件 (约20MB)，后续会缓存
                localEmbedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
            }
            // 执行推理
            const output = await localEmbedder(text, { pooling: 'mean', normalize: true });
            // output.data 是 Tensor (Float32Array)，转换为普通数组
            return Array.from(output.data);
        } catch (e: any) {
            console.error("Local embedding failed", e);
            return { error: `Local Model Failed: ${e.message}` };
        }
    }

    // 2. 处理 Google Gemini API
    const ai = getAiClient();
    try {
        const result = await retryWithBackoff<any>(() => ai.models.embedContent({
            model: model,
            contents: [{ parts: [{ text }] }]
        }));
        return result.embedding?.values || [];
    } catch (e: any) {
        const errStr = getErrorDetails(e);
        console.warn("Embedding failed:", errStr);

        let friendlyMsg = errStr;
        if (errStr.includes("404")) friendlyMsg = "Model Not Found (404). Check if model exists or API key has access.";
        if (errStr.includes("403")) friendlyMsg = "Permission Denied (403). API Key invalid or restricted.";
        if (errStr.includes("429")) friendlyMsg = "Quota Exceeded (429). Rate limit reached.";
        if (errStr.includes("value must be a list")) friendlyMsg = "Invalid Input Format. Model might be deprecated.";

        return { error: friendlyMsg };
    }
}

export const retrieveRelevantContext = async (
    queryText: string,
    nodes: OutlineNode[],
    topK: number = 10,
    onProgress?: (msg: string) => void,
    minScore: number = 0.25,
    embeddingModel: string = "local-minilm"
): Promise<{ context: string, updatedNodes: OutlineNode[] }> => {
    // 1. Flatten all nodes
    let allNodes: OutlineNode[] = [];
    const flatten = (n: OutlineNode) => {
        if (n.description && n.description.length > 5) { // Relaxed length check
            allNodes.push(n);
        }
        if (n.children) n.children.forEach(flatten);
    };
    nodes.forEach(flatten);

    let finalContext = "【RAG 智能检索背景资料 (Auto-Retrieved Context)】\n";

    if (allNodes.length === 0) {
        finalContext += "> 警告: 没有可检索的导图节点 (Map is empty or nodes have no description).\n";
        return { context: finalContext, updatedNodes: nodes };
    }

    if (onProgress) onProgress(`Indexing ${allNodes.length} context nodes...`);

    // 2. Generate Embeddings for nodes (if missing)
    let updatedCount = 0;
    let embeddingErrors = 0;
    let lastError = "";

    for (const node of allNodes) {
        if (!node.embedding || node.embedding.length === 0) {
            const textToEmbed = `${node.name}: ${node.description}`;

            // Rate limit protection ONLY for remote API
            if (embeddingModel !== EmbeddingModel.LOCAL_MINILM) {
                await new Promise(r => setTimeout(r, 100));
            }

            const result = await generateEmbedding(textToEmbed, embeddingModel);

            if (Array.isArray(result)) {
                if (result.length > 0) {
                    node.embedding = result;
                    updatedCount++;
                    if (onProgress && updatedCount > 0 && updatedCount % 5 === 0) {
                        onProgress(`Vectorizing nodes: ${updatedCount}/${allNodes.length}`);
                    }
                } else {
                    embeddingErrors++;
                }
            } else {
                // It's an error object
                embeddingErrors++;
                lastError = result.error;
            }
        }
    }

    // 3. Generate Embedding for Query
    if (onProgress) onProgress("Analyzing query intent...");
    const queryResult = await generateEmbedding(queryText, embeddingModel);

    if (!Array.isArray(queryResult)) {
        finalContext += `> 错误: 查询词向量化失败 (Query Embedding Failed). Model: ${embeddingModel}\n`;
        finalContext += `> 原因: ${queryResult.error}\n`;
        finalContext += `> 建议: 推荐使用 'Local (Offline)' 模型或 'text-embedding-004'。\n`;
        return { context: finalContext, updatedNodes: nodes };
    }

    const queryEmbedding = queryResult;

    if (queryEmbedding.length === 0) {
        finalContext += `> 错误: 查询词向量化返回空结果。\n`;
        return { context: finalContext, updatedNodes: nodes };
    }

    // 4. Calculate Scores
    const scoredNodes = allNodes.map(node => ({
        node,
        score: node.embedding && node.embedding.length > 0 ? cosineSimilarity(queryEmbedding, node.embedding) : 0
    }));

    scoredNodes.sort((a, b) => b.score - a.score);

    // Debug Stats
    const maxScore = scoredNodes.length > 0 ? scoredNodes[0].score.toFixed(4) : "N/A";
    finalContext += `> 统计: 扫描节点 ${allNodes.length} 个 | 最高相似度: ${maxScore} | 设定阈值: ${minScore} | Embedding模型: ${embeddingModel}\n`;
    if (embeddingErrors > 0) {
        finalContext += `> 警告: ${embeddingErrors} 个节点向量化失败。\n`;
        if (lastError) finalContext += `> 最新错误: ${lastError}\n`;
    }

    // 5. Filter & Select
    const topCandidates = scoredNodes.slice(0, topK * 2);
    const validNodes = topCandidates.filter(item => item.score > minScore).slice(0, topK);

    if (validNodes.length === 0) {
        finalContext += `> 结果: 未找到高于阈值 (${minScore}) 的相关资料。\n`;
        // Fallback
        if (scoredNodes.length > 0 && scoredNodes[0].score > 0) {
            const fallback = scoredNodes[0];
            finalContext += `> [兜底展示/Fallback] (Score: ${fallback.score.toFixed(4)}) [${fallback.node.type}] ${fallback.node.name}: ${fallback.node.description}\n`;
        }
    } else {
        validNodes.forEach((item, idx) => {
            finalContext += `[Ref #${idx + 1} | Score: ${item.score.toFixed(2)}] [${item.node.type}] ${item.node.name}: ${item.node.description}\n`;
        });
    }

    return { context: finalContext, updatedNodes: nodes };
};


// --- 业务功能实现 ---

/**
 * AI 上下文简化与结构化 (Context Scrubbing)
 * 核心升级：采用 "Schema Separation" 策略，强制分离指令、任务和数据，防止指令被清洗掉。
 * 2024-05 Update: 强化“高密度压缩”逻辑，防止字符膨胀。
 */
// 简单的内存缓存，用于存储已优化的上下文
const contextCache = new Map<string, string>();
const MAX_CACHE_SIZE = 20;

/**
 * 计算简单的字符串 Hash (用于缓存 Key)
 */
const computeStringHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
};

export const optimizeContextWithAI = async (
    rawContext: string,
    lang: string,
    enableCache: boolean = true // 默认开启
): Promise<string> => {
    if (!rawContext || rawContext.length < 50) return rawContext;

    // 1. 检查缓存
    const cacheKey = `${lang}:${computeStringHash(rawContext)}`;
    if (enableCache && contextCache.has(cacheKey)) {
        console.log('[ContextOptimization] Cache hit! Returning cached result.');
        return contextCache.get(cacheKey)!;
    }

    const ai = getAiClient();
    // 默认使用 2.5 Flash, 如果失败则回退到 Lite
    let model = 'gemini-2.5-flash';

    // 使用统一管理的提示词
    const systemPrompt = CONTEXT_OPTIMIZATION_SYSTEM_PROMPT(lang);

    const prompt = `
    ${systemPrompt}

    [RAW INPUT BUNDLE]:
    ${rawContext.substring(0, 60000)} 
    `;

    const executeOptimization = async (targetModel: string) => {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: { responseMimeType: "application/json" } // Force JSON
        }));
        return response.text || "{}";
    };

    try {
        let jsonText = "";
        try {
            jsonText = await executeOptimization(model);
        } catch (e) {
            console.warn(`[ContextOptimization] ${model} failed, falling back to gemini-flash-lite-latest`, e);
            model = 'gemini-flash-lite-latest';
            jsonText = await executeOptimization(model);
        }

        const cleanedJson = cleanJson(jsonText);
        console.log('[ContextOptimization] Raw JSON:', jsonText.substring(0, 200));

        let parsed: any = {};
        try {
            parsed = JSON.parse(cleanedJson);
        } catch (e) {
            console.error('[ContextOptimization] JSON Parse Error:', e, '\nCleaned Text:', cleanedJson);
            // 如果 JSON 解析失败，尝试直接返回清洗后的文本（如果它看起来像文本而非 JSON）
            // 但这里我们要求 JSON，所以这通常意味着失败
            throw e;
        }

        // 重新组装为高密度结构化文本
        let reconstructed = "";

        if (parsed.entities && Array.isArray(parsed.entities) && parsed.entities.length > 0) {
            reconstructed += `[ENTS]: ` + parsed.entities.map((e: any) => `${e.n}(${e.d})`).join('; ') + "\n";
        }

        if (parsed.facts && Array.isArray(parsed.facts) && parsed.facts.length > 0) {
            reconstructed += `[FACTS]: ` + parsed.facts.join('; ');
        }

        // Fallback for old schema
        if (!parsed.entities && !parsed.facts && parsed.knowledge_graph) {
            const kg = parsed.knowledge_graph;
            if (kg.facts) reconstructed += `[FACTS]: ` + kg.facts.join('; ');
            if (kg.entities) reconstructed += `\n[ENTS]: ` + kg.entities.map((e: any) => `${e.name}(${e.desc})`).join('; ');
        }

        // 如果重构结果为空，说明提取失败，返回原文以防丢失信息
        if (!reconstructed.trim()) {
            console.warn('[ContextOptimization] Reconstructed text is empty, returning raw context.');
            return rawContext;
        }

        console.log(`[ContextOptimization] Success. Ratio: ${(reconstructed.length / rawContext.length * 100).toFixed(1)}%`);

        // 写入缓存
        if (enableCache) {
            if (contextCache.size >= MAX_CACHE_SIZE) {
                // 简单的 LRU: 删除第一个 (最早插入的)
                const firstKey = contextCache.keys().next().value;
                if (firstKey) contextCache.delete(firstKey);
            }
            contextCache.set(cacheKey, reconstructed);
        }

        return reconstructed;

    } catch (error) {
        console.error("[ContextOptimization] Fatal error, using raw context.", error);
        return rawContext;
    }
};

/**
 * 提示词格式转换 (结构化 <-> 自然语言)
 * 核心要求：意思一致，转回时必须一模一样（尽可能无损）。
 */
export const transformPromptFormat = async (
    text: string,
    targetFormat: 'structured' | 'natural',
    lang: string
): Promise<string> => {
    const ai = getAiClient();
    const model = 'gemini-flash-lite-latest';

    // 使用统一管理的提示词
    const instruction = PROMPT_CONVERSION_INSTRUCTION(targetFormat === 'structured' ? 'to_structured' : 'to_natural');

    const prompt = `
    ${instruction}
    [INPUT TEXT]:
    ${text}
    ${PromptService.getLangInstruction(lang)}
    `;

    try {
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt
        }));
        return response.text || text;
    } catch (e) {
        return text;
    }
}

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
        if (s === 'qidian') return '起点中文网';
        if (s === 'fanqie') return '番茄小说';
        if (s === 'jinjiang') return '晋江文学城';
        return s;
    }).join('、');
    const genderStr = gender === 'male' ? '男频' : '女频';

    const prompt = `
    请使用 Google Search 搜索最新的"${platformNames} ${genderStr} 小说排行榜"。
    查找当前排名靠前的网络小说,分析它们的书名和题材。
    根据搜索到的真实数据,${PromptService.analyzeTrend(sources)}
    ${PromptService.getLangInstruction(lang)}
    `;

    // Create display prompt hiding long instructions for debug
    const displayPrompt = `
    请使用 Google Search 搜索最新的"${platformNames} ${genderStr} 小说排行榜"。
    [...Analysis Instruction Hidden...]
    `;

    const finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);

    // 初始调试信息
    if (onDebug) {
        onDebug({
            prompt: displayPrompt,
            model: model,
            systemInstruction: finalSystemInstruction,
            context: `Grounding Search: ${platformNames} ${genderStr}`,
            sourceData: "Requesting Google Search..."
        });
    }

    try {
        const startTime = Date.now();
        const response = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: {
                systemInstruction: finalSystemInstruction,
                tools: [{ googleSearch: {} }]
            }
        }));

        // Extract metrics
        const metrics = extractMetrics(response, model, startTime);

        // Pass complete API payload and metrics after response
        if (onDebug) {
            onDebug({
                apiPayload: {
                    request: `System: ${finalSystemInstruction}\n\nUser: ${prompt}`,
                    response: response.text || ""
                },
                metrics: metrics
            });
        }

        // 后处理:清洗AI返回的文本,提取纯净关键词
        let rawResult = response.text?.trim() || "热门趋势";
        let cleanedKeyword = rawResult;

        // 1. 去除常见描述性前缀
        const prefixPatterns = [
            /^根据.*?[，,：:]/,
            /^搜索.*?[，,：:]/,
            /^分析.*?[，,：:]/,
            /^推荐.*?[，,：:]/,
            /^一些.*?[，,：:]/,
            /^当前.*?[，,：:]/,
            /^热门.*?[，,：:]/,
            /^上榜.*?[，,：:]/,
            /^被推荐.*?[，,：:]/
        ];

        for (const pattern of prefixPatterns) {
            cleanedKeyword = cleanedKeyword.replace(pattern, '');
        }

        // 2. 按行分割,取第一个非空行
        const lines = cleanedKeyword.split(/[\n\r]+/).map(l => l.trim()).filter(l => l);
        if (lines.length > 0) {
            cleanedKeyword = lines[0];
        }

        // 3. 去除序号
        cleanedKeyword = cleanedKeyword.replace(/^[\d一二三四五]+[、.．。)\)]\s*/, '');

        // 4. 去除markdown格式
        cleanedKeyword = cleanedKeyword.replace(/[*_`]/g, '');

        // 5. 去除引号
        cleanedKeyword = cleanedKeyword.replace(/["「」『』""'']/g, '');

        // 6. 提取冒号前的内容
        if (cleanedKeyword.includes('：') || cleanedKeyword.includes(':')) {
            const parts = cleanedKeyword.split(/[：:]/);
            if (parts[0].length >= 2 && parts[0].length <= 10) {
                cleanedKeyword = parts[0];
            }
        }

        // 7. 如果太长,尝试按标点分割
        if (cleanedKeyword.length > 15) {
            const segments = cleanedKeyword.split(/[，,。.！!？?、]/);
            if (segments.length > 0 && segments[0].length >= 2 && segments[0].length <= 10) {
                cleanedKeyword = segments[0];
            } else {
                cleanedKeyword = cleanedKeyword.substring(0, 10);
            }
        }

        // 8. 最终清理
        cleanedKeyword = cleanedKeyword.trim().replace(/^[^\u4e00-\u9fa5a-zA-Z]+|[^\u4e00-\u9fa5a-zA-Z]+$/g, '');

        // 9. 验证结果
        if (!cleanedKeyword || cleanedKeyword.length < 2) {
            console.warn('[analyzeTrendKeywords] 清洗后关键词无效,使用默认值。原始结果:', rawResult);
            cleanedKeyword = '玄幻';
        }

        return cleanedKeyword;
    } catch (error: any) {
        console.error("Trend Analysis Failed", error);

        // 失败时也传递调试信息
        if (onDebug) {
            const errorDetails = getErrorDetails(error);
            onDebug({
                error: true,
                errorMessage: errorDetails,
                apiPayload: {
                    request: `System: ${finalSystemInstruction}\n\nUser: ${prompt}`,
                    response: `Error: ${errorDetails}`
                },
                // 尝试提取部分指标(如果有)
                metrics: error.response ? extractMetrics(error.response, model, Date.now()) : undefined
            });
        }

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
                    required: ["source", "gender", "majorCategory", "trope", "goldenFinger", "coolPoint", "burstPoint", "memoryAnchor"] // Added memoryAnchor
                }
            },
            required: ["title", "synopsis", "metadata"]
        }
    };

    const executeGen = async (targetModel: string) => {
        return await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: finalSystemInstruction
            }
        }));
    };

    try {
        if (onUpdate) onUpdate("正在连接 Gemini...", 20, `Model: ${model}`, undefined, {
            prompt,
            model,
            systemInstruction: finalSystemInstruction,
            context: `Trend: ${trendFocus}, Audience: ${targetAudience}`
        });

        const startTime = Date.now();
        let response: GenerateContentResponse;
        let usedModel = model;

        try {
            response = await executeGen(model);
        } catch (e: any) {
            const errStr = getErrorDetails(e);
            // Fallback logic for Quota Exceeded (429)
            if ((errStr.includes('429') || errStr.includes('resource_exhausted')) && model !== 'gemini-flash-lite-latest') {
                usedModel = 'gemini-flash-lite-latest';
                if (onUpdate) onUpdate("配额受限", 30, `自动切换至备用模型: ${usedModel}...`);
                console.warn(`[Gemini] Quota exceeded for ${model}, falling back to ${usedModel}`);
                response = await executeGen(usedModel);
            } else {
                throw e;
            }
        }

        const metrics = extractMetrics(response, usedModel, startTime);
        if (onUpdate) onUpdate("解析结果", 98, "正在清洗 JSON", metrics, {
            apiPayload: {
                request: `System: ${finalSystemInstruction}\n\nUser: ${prompt}`,
                response: response.text || ""
            }
        });

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
    // 确保 children 数组存在
    if (!node.children) node.children = [];

    // 递归处理子节点
    if (node.children.length > 0) {
        node.children = node.children.map(assignIds);
    }
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
        chapters: createRoot('章节细纲', 'volume', '具体章节规划。')
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
    chapters?: { title: string, content: string, nodeId?: string }[],
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
    } catch (e) { }

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
    onUpdate?: (stage: string, progress: number, log?: string, metrics?: AIMetrics, debugInfo?: any) => void,
    previousContent?: string,
    nextChapterInfo?: { title: string, desc?: string, childrenText?: string }
): Promise<string> => {
    const ai = getAiClient();

    let fullContext = context;

    // 强化上一章结尾的上下文注入，明确标识
    // 注意：previousContent 已经由调用方进行了截取，这里直接使用
    if (previousContent) {
        fullContext += `\n\n【上一章结尾】\n(请承接此处的剧情和悬念)\n${previousContent}\n\n`;
    }

    // 强化下一章预告的上下文注入
    if (nextChapterInfo) {
        fullContext += `\n\n=== 【🚀 下一章预告 (Next Chapter Preview)】 ===\n目标章节：${nextChapterInfo.title}\n章节梗概：${nextChapterInfo.desc || '未知'}\n`;
        if (nextChapterInfo.childrenText) {
            fullContext += `包含场景：\n${nextChapterInfo.childrenText}\n`;
        }
        fullContext += `(请在本章结尾为上述内容做铺垫/设钩子)\n=== 结束 ===\n`;
    }

    const safeContext = truncateContext(fullContext, 40000);
    // PromptService.writeChapter embeds context directly. 
    const prompt = `${PromptService.writeChapter(node.name, node.description || '', safeContext, wordCount, stylePrompt)} ${PromptService.getLangInstruction(lang)}`;
    const finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);

    // Create a display-friendly prompt that hides the massive context
    // We pass a placeholder string to writeChapter so the structure is preserved but content is hidden
    const displayPrompt = `${PromptService.writeChapter(node.name, node.description || '', '...[Context Layer Hidden - See Context Tab]...', wordCount, stylePrompt)} ${PromptService.getLangInstruction(lang)}`;

    if (onUpdate) onUpdate("章节生成", 20, "构建 Prompt...", undefined, {
        prompt: displayPrompt, // Use display version
        context: safeContext,
        model,
        systemInstruction: finalSystemInstruction
    });

    const executeGen = async (targetModel: string) => {
        return await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
                systemInstruction: finalSystemInstruction
            }
        }));
    };

    try {
        const startTime = Date.now();
        let response: GenerateContentResponse;
        let usedModel = model;

        try {
            response = await executeGen(model);
        } catch (e: any) {
            const errStr = getErrorDetails(e);
            if ((errStr.includes('429') || errStr.includes('resource_exhausted')) && model !== 'gemini-flash-lite-latest') {
                usedModel = 'gemini-flash-lite-latest';
                if (onUpdate) onUpdate("章节生成", 25, `配额不足，切换至备用模型: ${usedModel}...`);
                console.warn(`[Gemini] Quota exceeded for ${model}, falling back to ${usedModel}`);
                response = await executeGen(usedModel);
            } else {
                throw e;
            }
        }

        const metrics = extractMetrics(response, usedModel, startTime);
        if (onUpdate) onUpdate("章节生成", 100, "完成", metrics, {
            apiPayload: {
                request: `System: ${finalSystemInstruction}\n\nUser: ${prompt}`,
                response: response.text || ""
            }
        });

        return response.text || "生成失败，请重试。";
    } catch (error) { throw new Error(handleGeminiError(error, 'generateChapterContent')); }
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
    } catch (error) {
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
    } catch (error) { throw new Error(handleGeminiError(error, 'manipulateText')); }
};

/**
 * 分析文本
 */
export const analyzeText = async (textOrUrl: string, focus: 'pacing' | 'characters' | 'viral_factors', lang: string, model: string, systemInstruction?: string): Promise<string> => {
    const ai = getAiClient();
    // 使用统一管理的提示词
    const prompt = `${TEXT_ANALYSIS_PROMPT(focus)}\n${PromptService.getLangInstruction(lang)}\n内容：${textOrUrl.substring(0, 10000)}`;
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
) => {
    const ai = getAiClient();

    // 动态决定子节点类型，修复“生成细纲后无法生成草稿”的问题
    let childType = "setting";
    let rootType = mapType; // 默认根节点类型为导图类型

    // 针对不同导图类型进行类型微调
    if (mapType === 'chapters') {
        // 如果是章节细纲，根节点通常是卷(volume)或书(book)，子节点必须是 chapter
        rootType = 'volume';
        childType = 'chapter';
    } else if (mapType === 'character') {
        childType = 'character';
    } else if (mapType === 'system') {
        childType = 'system';
    } else if (mapType === 'events') {
        childType = 'event';
    } else if (mapType === 'mission') {
        childType = 'mission';
    }

    // 强制性的递归结构提示 - 增强版 v4,注入具体的 type,强调多层级
    const structurePrompt = `
    ========================================
    【输出格式】: JSON (严格模式)
    ========================================
    
    你必须返回一个代表根节点的 JSON 对象。
    禁止用数组包裹,禁止用 {"root": ...} 这样的额外层级。
    
    【目标结构示例】(注意多层级):
    {
      "name": "根节点名称",
      "type": "${rootType}",
      "description": "简短概述(不超过100字)",
      "children": [
         { 
           "name": "子节点1", 
           "type": "${childType}", 
           "description": "简短描述(不超过80字)", 
           "children": [
             {
               "name": "二级子节点1-1",
               "type": "${childType}",
               "description": "更具体的描述",
               "children": []
             },
             {
               "name": "二级子节点1-2",
               "type": "${childType}",
               "description": "更具体的描述",
               "children": []
             }
           ]
         },
         { 
           "name": "子节点2", 
           "type": "${childType}", 
           "description": "简短描述(不超过80字)", 
           "children": [
             {
               "name": "二级子节点2-1",
               "type": "${childType}",
               "description": "更具体的描述",
               "children": []
             }
           ]
         }
      ]
    }
    
    ========================================
    【关键结构规则】(必须严格遵守):
    ========================================
    
    1. ⚠️ 禁止在 description 中堆砌大量内容!
       - 每个节点的 description 必须简洁(50-100字)
       - 如果有多个要点,必须拆分成多个子节点
       - description 只用于概述,不要列举详细内容
    
    2. ✅ 必须创建足够的子节点:
       - 根节点的 children 数组至少要有 4-8 个子节点
       - 每个子节点必须有 'type'='${childType}'
       - 子节点的 name 要具体明确,不要用"其他"、"更多"等模糊词
    
    3. ✅ 必须创建多层级结构:
       - **目标层级深度: 3-4层** (这是重点!)
       - 如果某个子节点内容复杂,必须继续创建它的 children
       - 不要把复杂内容都写在 description 里,而是拆分成子节点
       - 至少50%的一级子节点应该有自己的二级子节点
       - 叶子节点的 children 可以是空数组 []
    
    4. ⚠️ 严禁的错误做法:
       - ❌ 把所有内容写在根节点的 description 里
       - ❌ 只创建1-2个子节点,其他内容都塞在 description
       - ❌ 使用"包括但不限于"、"等等"这样的模糊表述
       - ❌ 子节点 name 重复或过于笼统
       - ❌ 只有一层子节点,没有继续展开
    
    5. ✅ 正确的做法示例:
       错误: { "name": "角色", "description": "主角张三,配角李四,反派王五..." }
       正确: { 
         "name": "角色", 
         "description": "小说主要角色设定",
         "children": [
           { 
             "name": "主角-张三", 
             "description": "热血少年,修仙天才",
             "children": [
               { "name": "性格特点", "description": "坚韧不拔,重情重义" },
               { "name": "修炼天赋", "description": "拥有罕见的雷灵根" },
               { "name": "核心关系", "description": "师父是玄天宗长老" }
             ]
           },
           { 
             "name": "配角-李四", 
             "description": "主角的好友",
             "children": [
               { "name": "性格特点", "description": "机智幽默,善于谋略" },
               { "name": "核心关系", "description": "世家子弟" }
             ]
           },
           { "name": "反派-王五", "description": "魔道高手" }
         ]
       }
    
    6. ✅ 层级展开策略:
       - 第1层: 主要分类 (4-8个节点)
       - 第2层: 具体项目 (每个分类下2-5个节点)
       - 第3层: 详细属性 (复杂项目下1-3个节点)
       - 第4层: 可选的更细节内容
    `;

    let specificInstruction = "";
    if (mapType === 'system') {
        specificInstruction = `
【力量体系专项要求】:
⚠️ 内容丰富度要求:
- 必须创建完整的等级体系,至少 8-12 个等级节点
- 每个等级必须有独特的能力和特征,不能千篇一律
- 必须包含特殊能力、稀有技能、禁术等吸引眼球的设定

✅ 结构要求:
- 每个等级节点下必须展开 4-6 个子节点:
  * 修炼条件(具体的资源、天赋要求)
  * 能力特征(独特的法术、技能)
  * 突破方法(关键的突破契机)
  * 战力表现(与其他等级的对比)
  * 稀有能力(该等级的特殊技能)
  * 修炼难度(时间、资源消耗)

🎯 精彩程度要求:
- 每个等级要有令人向往的独特能力
- 突破过程要有戏剧性和挑战性
- 高等级要有震撼性的力量展示
- 示例: "金丹期" -> ["凝聚金丹", "御剑飞行", "神识外放", "寿命延长至500年", "雷劫考验", "可炼制四品丹药"]
        `;
    } else if (mapType === 'world') {
        specificInstruction = `
【世界观专项要求】:
⚠️ 内容丰富度要求:
- 必须创建宏大而独特的世界观,避免套路化设定
- 地理要有特色地标、奇异地形、神秘区域
- 历史要有重大事件、传奇人物、未解之谜
- 势力要有复杂关系、明争暗斗、隐藏组织
- 法则要有独特的世界规则、禁忌、天道设定

✅ 结构要求(至少5个一级节点):
1. 地理 -> 至少4-6个区域,每个区域3-5个子节点
   * 主要城市(繁华程度、特色产业、统治者)
   * 险地秘境(危险等级、宝物传说、历史由来)
   * 地形特征(独特地貌、资源分布)
   * 气候环境(对修炼的影响)

2. 历史 -> 至少3-5个重大历史时期
   * 远古时代(神话传说、上古大能)
   * 重大战争(正邪大战、种族冲突)
   * 关键转折(改变世界格局的事件)
   * 未解之谜(引发后续剧情的伏笔)

3. 势力 -> 至少5-8个主要势力
   * 正道门派(实力排名、特色功法、掌门)
   * 魔道势力(野心、手段、秘密)
   * 中立组织(商会、杀手组织)
   * 隐世家族(底蕴、传承)
   * 势力关系(联盟、敌对、暗中较量)

4. 法则 -> 世界运行规则
   * 修炼体系(天赋、资源、瓶颈)
   * 天道规则(天劫、因果、气运)
   * 禁忌(不可触碰的底线)
   * 特殊现象(天地异象、灵气潮汐)

5. 特色设定 -> 让世界独一无二的元素
   * 独特资源(灵石、天材地宝)
   * 神秘种族(妖族、魔族、异族)
   * 传说宝物(上古神器、仙府遗迹)

🎯 精彩程度要求:
- 每个区域要有吸引人的特色和故事
- 势力之间要有复杂的恩怨情仇
- 历史要为当前剧情埋下伏笔
- 法则要能产生戏剧冲突
        `;
    } else if (mapType === 'chapters') {
        specificInstruction = `
【章节细纲专项要求】:
⚠️ 内容丰富度要求:
- 必须创建完整的章节规划,形成连贯的故事线
- 每章要有明确的剧情推进和爽点设计
- 章节之间要有递进关系和悬念衔接
- 至少创建 15-25 个章节节点

✅ 结构要求(每个章节5-8个子节点):
1. 章节标题
   * 要有吸引力和悬念感
   * 避免平淡的"第X章"
   * 示例: "第1章 重生之谜" "第5章 血战魔窟" "第10章 惊天秘密"

2. 场景设定
   * 主要场景(地点、时间)
   * 场景氛围(紧张、轻松、诡异)
   * 出场角色

3. 剧情概要
   * 本章主线(核心事件)
   * 支线内容(次要情节)
   * 承上启下(与前后章的联系)

4. 冲突设计
   * 外部冲突(与敌人、环境的对抗)
   * 内部冲突(心理挣扎、选择困境)
   * 冲突升级(矛盾如何激化)

5. 转折/高潮
   * 意外事件(打破常规)
   * 反转时刻(出人意料)
   * 爽点爆发(装逼、打脸、收获)

6. 角色表现
   * 主角行动(如何应对)
   * 配角作用(助攻或阻碍)
   * 角色成长(心态或实力变化)

7. 悬念/伏笔
   * 章末悬念(吸引读者继续)
   * 埋下伏笔(为后续铺垫)
   * 未解之谜(引发好奇)

8. 爽点/看点
   * 装逼打脸(主角展示实力)
   * 收获奖励(宝物、功法、美女)
   * 情感共鸣(热血、感动、愤怒)

🎯 精彩程度要求:
- 开篇3章: 必须有强烈的钩子,吸引读者
- 每5章: 要有一个小高潮
- 每10章: 要有一个大高潮或重大转折
- 每章结尾: 必须有悬念或爽点,不能平淡收尾

📊 章节节奏建议:
- 快节奏章节(60%): 冲突、战斗、危机
- 慢节奏章节(25%): 修炼、感情、日常
- 转折章节(15%): 重大变故、剧情反转

示例(精彩章节):
"第8章 绝地反击" ->
  "场景" -> "魔窟深处,被敌人围困"
  "剧情" -> "主角陷入绝境,生死一线"
  "冲突-外部" -> "三名筑基期修士围攻"
  "冲突-内部" -> "是否使用禁术,代价是损伤根基"
  "转折" -> "血脉觉醒,实力暴涨"
  "高潮" -> "以炼气期修为,反杀筑基修士"
  "悬念" -> "血脉觉醒引来神秘强者关注"
  "爽点" -> "越级杀敌+打脸+震撼全场"
        `;
    } else if (mapType === 'character') {
        specificInstruction = `
【角色档案专项要求】:
⚠️ 内容丰富度要求:
- 必须创建立体丰满的角色,避免脸谱化
- 每个角色要有独特的性格、动机、成长轨迹
- 角色之间要有复杂的关系网络
- 至少包含: 主角、核心配角(3-5个)、主要反派(2-3个)、关键配角(2-3个)

✅ 结构要求(每个角色至少6-8个子节点):
1. 基本信息
   * 姓名、年龄、身份
   * 外貌特征(独特的标志)
   * 修为境界

2. 性格特点
   * 核心性格(3-4个关键词)
   * 性格缺陷(使角色更真实)
   * 行为习惯
   * 说话方式

3. 背景故事
   * 出身来历(家族、经历)
   * 重大转折(改变命运的事件)
   * 心理创伤或执念
   * 隐藏秘密

4. 核心关系
   * 与主角的关系(如何相识、情感纽带)
   * 与其他角色的关系
   * 情感线索(爱恨情仇)
   * 利益纠葛

5. 能力特长
   * 修炼天赋(灵根、体质)
   * 独门绝技(标志性能力)
   * 特殊宝物(法宝、灵兽)
   * 隐藏实力

6. 动机目标
   * 短期目标(当前追求)
   * 长期野心(终极目的)
   * 行动准则(底线)

7. 成长轨迹
   * 初期状态
   * 关键转变
   * 最终走向(正派/反派/亦正亦邪)

8. 角色魅力
   * 吸引读者的特质
   * 经典台词或行为
   * 高光时刻

🎯 精彩程度要求:
- 主角要有独特的金手指或成长路线
- 配角要有鲜明个性,不是工具人
- 反派要有合理动机,不是纯粹的恶
- 角色关系要有张力和冲突
- 每个角色都要有高光时刻
        `;
    } else if (mapType === 'events') {
        specificInstruction = `
【事件时间轴专项要求】:
⚠️ 内容丰富度要求:
- 必须创建完整的事件链,形成起承转合的故事线
- 事件之间要有因果关系和递进关系
- 必须包含高潮事件、转折事件、伏笔事件
- 至少创建 12-20 个事件节点,覆盖故事的主要发展

✅ 结构要求(每个事件5-7个子节点):
1. 事件概述
   * 事件名称(要有吸引力)
   * 发生时间/地点
   * 涉及角色

2. 起因(为什么发生)
   * 直接导火索
   * 深层原因
   * 前置事件的铺垫

3. 经过(如何发展)
   * 开端(事件爆发)
   * 发展(矛盾升级)
   * 高潮(冲突顶点)
   * 意外转折(出人意料的变化)

4. 结果(最终如何)
   * 表面结果
   * 隐藏后果
   * 角色变化

5. 影响(对后续的作用)
   * 对主角的影响(实力、心态、地位)
   * 对势力格局的影响
   * 对剧情走向的影响
   * 埋下的伏笔

6. 精彩看点
   * 爽点(主角装逼、打脸、收获)
   * 冲突(激烈的对抗)
   * 反转(出人意料的发展)
   * 情感(感动、愤怒、震撼)

7. 关键细节
   * 重要道具或信息
   * 关键对话
   * 伏笔线索

🎯 精彩程度要求(起承转合):
- 起: 事件开端要有悬念或冲突
- 承: 发展过程要有波折,不能一帆风顺
- 转: 必须有意外转折,打破读者预期
- 合: 结局要有爽点或震撼,同时埋下新的悬念

📊 事件类型分布建议:
- 成长事件(30%): 主角实力提升、获得机缘
- 冲突事件(40%): 与敌对势力的对抗、生死危机
- 情感事件(15%): 友情、爱情、师徒情
- 转折事件(15%): 改变剧情走向的重大变故

示例(精彩事件):
"事件5: 生死试炼-魔窟探险" ->
  "起因" -> "为获得筑基丹,主角接受宗门任务"
  "经过-开端" -> "进入魔窟,遭遇魔兽群"
  "经过-发展" -> "队友背叛,主角身陷绝境"
  "经过-高潮" -> "激发血脉觉醒,反杀背叛者"
  "经过-转折" -> "意外发现上古洞府,获得传承"
  "结果" -> "实力暴涨,突破筑基期"
  "影响" -> "引起宗门高层关注,树立强敌"
  "精彩看点" -> "血脉觉醒+打脸背叛者+获得传承,三重爽点"
        `;
    } else if (mapType === 'mission') {
        specificInstruction = `
【任务状态专项要求】:
- 每个阶段的任务/状态必须是独立的子节点
- 至少创建 5-8 个任务节点
- 每个任务包含: 任务名称、目标、奖励/后果
        `;
    } else if (mapType === 'anchor') {
        specificInstruction = `
【伏笔锚点专项要求】:
- 每个伏笔/关键物品必须是独立的子节点
- 至少创建 4-6 个伏笔节点
- 每个伏笔包含: 名称、埋设位置、揭示时机
        `;
    } else if (mapType === 'structure') {
        specificInstruction = `
【宏观结构专项要求】:
- 必须将小说拆分成多个卷/篇章
- 每卷必须是独立的子节点
- 至少创建 3-5 个卷节点
- 每卷包含: 卷名、核心冲突、预期章节数
        `;
    }

    const promptContext = context ? `\n【参考上下文】:\n${context}` : "";
    let finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);

    if (style) {
        finalSystemInstruction += `\n\n### CRITICAL REQUIREMENTS (文风/指令) ###\n用户指定了以下强制性要求：\n${style}\n如果上下文与此冲突，以本要求为准。`;
    }

    if (mandatoryRequirements) {
        finalSystemInstruction += `\n\n### ⛔ OVERRIDE RULES (绝对硬性约束) ###\n用户指定了以下必须无条件满足的约束条件：\n${mandatoryRequirements}\n注意：如果上下文 (Context) 中的信息与此要求冲突，请务必修改或重绘，必须严格遵守上述硬性约束！`;
    }

    // 使用统一管理的提示词模板
    const prompt = REGENERATE_MAP_FULL_PROMPT(mapType, idea, context, specificInstruction, structurePrompt, lang);
    const displayPrompt = REGENERATE_MAP_DISPLAY_PROMPT(mapType, idea, specificInstruction, structurePrompt, lang);

    if (onUpdate) onUpdate("构建提示词", 10, undefined, undefined, {
        prompt: displayPrompt, // Use display version
        context,
        model,
        systemInstruction: finalSystemInstruction
    });

    const executeGen = async (targetModel: string) => {
        return await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model: targetModel,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                systemInstruction: finalSystemInstruction
            }
        }));
    };

    const startTime = Date.now();
    try {
        let res: GenerateContentResponse;
        let usedModel = model;

        try {
            res = await executeGen(model);
        } catch (e: any) {
            const errStr = getErrorDetails(e);
            if ((errStr.includes('429') || errStr.includes('resource_exhausted')) && model !== 'gemini-flash-lite-latest') {
                usedModel = 'gemini-flash-lite-latest';
                if (onUpdate) onUpdate("解析结果", 15, `配额不足，切换至备用模型: ${usedModel}...`);
                console.warn(`[Gemini] Quota exceeded for ${model}, falling back to ${usedModel}`);
                res = await executeGen(usedModel);
            } else {
                throw e;
            }
        }

        const metrics = extractMetrics(res, usedModel, startTime);
        if (onUpdate) onUpdate("解析结果", 90, "JSON 清洗中", metrics, {
            apiPayload: {
                request: `System: ${finalSystemInstruction}\n\nUser: ${prompt}`,
                response: res.text || ""
            }
        });

        console.log('[regenerateSingleMap] 原始响应文本:', res.text?.substring(0, 500));

        let rawObj = JSON.parse(cleanJson(res.text || "{}"));
        console.log('[regenerateSingleMap] 解析后的原始对象:', JSON.stringify(rawObj, null, 2).substring(0, 1000));

        // 智能解包逻辑 (Smart Unwrapping) v3 - 增强版
        // Case 1: Array wrapper [ {name...} ] -> {name...}
        if (Array.isArray(rawObj)) {
            console.log('[regenerateSingleMap] 检测到数组包装,长度:', rawObj.length);
            if (rawObj.length > 0) {
                rawObj = rawObj[0];
                console.log('[regenerateSingleMap] 解包数组后:', JSON.stringify(rawObj, null, 2).substring(0, 500));
            } else {
                rawObj = {};
            }
        }

        // Case 2: Object wrapper { "mindmap": {name...} } or { "world": {name...} }
        // 检查根对象是否是有效的节点（必须有 name 或 children）
        if (!rawObj.name && !rawObj.children) {
            console.log('[regenerateSingleMap] 根对象缺少name和children,尝试智能解包...');
            // 尝试寻找内部包含有效节点属性的子对象
            const keys = Object.keys(rawObj);
            console.log('[regenerateSingleMap] 可用的键:', keys);

            for (const key of keys) {
                const val = rawObj[key];
                if (val && typeof val === 'object' && !Array.isArray(val) && (val.name || Array.isArray(val.children))) {
                    console.warn(`[regenerateSingleMap] 检测到包装的JSON响应,键名: '${key}', 正在解包...`);
                    rawObj = val;
                    break;
                }
            }
        }

        console.log('[regenerateSingleMap] 解包后的最终对象:', JSON.stringify(rawObj, null, 2).substring(0, 1000));

        // 有效性兜底：如果依然无效，手动构建一个错误提示节点，防止 UI 空白
        if (!rawObj.name) {
            console.warn('[regenerateSingleMap] 缺少name字段,使用默认值');
            rawObj.name = `${mapType} (生成不完整)`;
            rawObj.description = "AI 返回的数据结构不完整或为空。请检查上下文长度或重试。";
            rawObj.type = rootType;
        }

        // 强制修正根节点类型
        if (!rawObj.type || rawObj.type !== rootType) {
            console.log(`[regenerateSingleMap] 修正根节点类型: ${rawObj.type} -> ${rootType}`);
            rawObj.type = rootType;
        }

        if (!Array.isArray(rawObj.children)) {
            console.warn('[regenerateSingleMap] children不是数组,初始化为空数组');
            rawObj.children = [];
        }

        console.log(`[regenerateSingleMap] 最终children数量: ${rawObj.children.length}`);

        // 这里的空数据兜底非常重要
        if (rawObj.children.length === 0) {
            console.error('[regenerateSingleMap] ⚠️ children数组为空! 原始响应:', res.text?.substring(0, 1000));
            rawObj.children.push({
                name: "生成结果为空",
                type: childType,
                description: "模型未返回有效子节点。这通常是因为 Context 过长导致截断，或者 Prompt 限制过严。建议减少上下文引用后重试。",
                children: []
            });
        } else {
            console.log('[regenerateSingleMap] ✅ 成功解析children:', rawObj.children.map((c: any) => c.name));
        }

        return assignIds(rawObj);
    } catch (error: any) {
        console.error('[regenerateSingleMap] 错误:', error);
        throw new Error(handleGeminiError(error, 'regenerateSingleMap'));
    }
}

// 扩展节点
export const expandNodeContent = async (parentNode: OutlineNode, context: string, lang: string, model: string, style: string | undefined, systemInstruction?: string) => {
    const ai = getAiClient();
    // 使用统一管理的提示词模板
    const prompt = EXPAND_NODE_FULL_PROMPT(parentNode.name, context, style, lang);
    try {
        const res = await retryWithBackoff<GenerateContentResponse>(() => ai.models.generateContent({
            model,
            contents: prompt,
            config: { responseMimeType: "application/json", systemInstruction: systemInstruction || PromptService.getGlobalSystemInstruction(lang) }
        }));
        return JSON.parse(cleanJson(res.text || "{}")).children?.map(assignIds) || [];
    } catch (error) { throw new Error(handleGeminiError(error, 'expandNodeContent')); }
}