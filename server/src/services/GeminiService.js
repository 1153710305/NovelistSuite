/**
 * @file server/src/services/GeminiService.js
 * @description Gemini AI 服务（后端版本）
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { cleanJson, retryWithBackoff, handleGeminiError } = require('../utils/aiUtils');

class GeminiService {
    constructor() {
        this.client = null;
    }

    /**
     * 初始化客户端
     * @param {string} apiKey - API Key
     */
    initClient(apiKey) {
        this.client = new GoogleGenerativeAI(apiKey);
    }

    /**
     * 生成内容（增强版）
     * @param {string} apiKey - API Key
     * @param {string} model - 模型名称
     * @param {string} prompt - 提示词
     * @param {Object} config - 配置
     */
    async generateContent(apiKey, model, prompt, config = {}) {
        // 初始化客户端
        this.initClient(apiKey);

        const executeGen = async () => {
            const generativeModel = this.client.getGenerativeModel({
                model: model || 'gemini-2.0-flash-exp'
            });

            const result = await generativeModel.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: config.temperature || 0.9,
                    topP: config.topP || 0.95,
                    topK: config.topK || 40,
                    maxOutputTokens: config.maxOutputTokens || 8192,
                    responseMimeType: config.jsonMode ? 'application/json' : 'text/plain'
                }
            });

            const response = await result.response;
            const text = response.text();

            return {
                text: config.jsonMode ? cleanJson(text) : text,
                metrics: {
                    model,
                    timestamp: new Date().toISOString(),
                    tokens: response.usageMetadata?.totalTokenCount || 0
                }
            };
        };

        try {
            // 使用重试机制
            return await retryWithBackoff(executeGen, 3, 2000);
        } catch (error) {
            const errorMsg = handleGeminiError(error, 'GenerateContent');
            throw new Error(errorMsg);
        }
    }

    /**
     * 生成每日灵感（完整版）
     */
    async generateDailyStories(apiKey, params) {
        const { trendFocus, targetAudience, lang = 'zh', model, systemInstruction, customRules } = params;
        const PromptService = require('./PromptService');

        const prompt = `${PromptService.dailyInspiration(trendFocus, targetAudience, customRules)} ${PromptService.getLangInstruction(lang)}`;
        const finalSystemInstruction = systemInstruction || PromptService.getGlobalSystemInstruction(lang);

        // 定义 Schema (简化版，Gemini API 支持部分 Schema)
        // 注意：Gemini Node SDK 的 Schema 定义可能与 REST API 略有不同，这里主要依赖 Prompt 约束 JSON
        const config = {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            jsonMode: true
        };

        const result = await this.generateContent(apiKey, model, prompt, config);

        try {
            // 尝试解析 JSON
            const data = JSON.parse(result.text);
            // 确保是数组
            return Array.isArray(data) ? data : [data];
        } catch (e) {
            console.warn('[GeminiService] JSON解析失败，尝试修复:', e.message);
            // 如果解析失败但内容看起来像 JSON，可能需要进一步清洗
            // 这里简单返回原始文本封装
            return [{
                title: '解析错误',
                synopsis: result.text,
                metadata: {
                    source: 'System',
                    gender: targetAudience,
                    majorCategory: 'Error',
                    coolPoint: '生成内容格式错误',
                    burstPoint: '无',
                    memoryAnchor: '无',
                    trope: '无',
                    goldenFinger: '无'
                }
            }];
        }
    }

    /**
     * 生成章节内容（完整版）
     */
    async generateChapterContent(apiKey, params) {
        const { title, outline, wordCount, lang = 'zh', model } = params;
        const PromptService = require('./PromptService');

        const prompt = `${PromptService.chapterContent(title, outline, wordCount)} ${PromptService.getLangInstruction(lang)}`;

        const config = {
            temperature: 0.8, // 稍微降低温度以保持连贯性
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            jsonMode: false
        };

        const result = await this.generateContent(apiKey, model, prompt, config);

        return {
            content: result.text,
            wordCount: result.text.length,
            metrics: result.metrics
        };
    }

    /**
     * 生成小说架构（完整版）
     */
    async generateNovelArchitecture(apiKey, params) {
        const { idea, lang = 'zh', model } = params;
        const PromptService = require('./PromptService');

        const prompt = `${PromptService.architectureStep1(idea)} ${PromptService.getLangInstruction(lang)}`;

        const config = {
            temperature: 0.9,
            topP: 0.95,
            topK: 40,
            maxOutputTokens: 8192,
            jsonMode: true
        };

        const result = await this.generateContent(apiKey, model, prompt, config);

        try {
            return JSON.parse(result.text);
        } catch (e) {
            return {
                error: 'JSON解析失败',
                rawText: result.text
            };
        }
    }
}

module.exports = new GeminiService();
