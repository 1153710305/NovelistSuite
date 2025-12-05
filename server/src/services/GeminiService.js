/**
 * @file server/src/services/GeminiService.js
 * @description Gemini AI 服务（后端版本）
 */

const { GoogleGenerativeAI } = require('@google/generative-ai');

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
     * 生成内容
     * @param {string} apiKey - API Key
     * @param {string} model - 模型名称
     * @param {string} prompt - 提示词
     * @param {Object} config - 配置
     */
    async generateContent(apiKey, model, prompt, config = {}) {
        // 初始化客户端
        this.initClient(apiKey);

        try {
            const generativeModel = this.client.getGenerativeModel({
                model: model || 'gemini-2.0-flash-exp'
            });

            const result = await generativeModel.generateContent({
                contents: prompt,
                generationConfig: {
                    temperature: config.temperature || 0.9,
                    topP: config.topP || 0.95,
                    topK: config.topK || 40,
                    maxOutputTokens: config.maxOutputTokens || 8192,
                }
            });

            return {
                text: result.response.text(),
                metrics: {
                    model,
                    timestamp: new Date().toISOString()
                }
            };
        } catch (error) {
            throw new Error(`Gemini API 调用失败: ${error.message}`);
        }
    }

    /**
     * 生成每日灵感（简化版）
     */
    async generateDailyStories(apiKey, params) {
        const { trendFocus, targetAudience } = params;

        const prompt = `请生成一个${targetAudience === 'male' ? '男频' : '女频'}网文灵感，主题是：${trendFocus}。

要求：
1. 提供一个吸引人的标题
2. 写一个简短的故事梗概（200字左右）
3. 指出核心爽点

请以JSON格式返回，包含 title, synopsis, coolPoint 三个字段。`;

        const result = await this.generateContent(apiKey, 'gemini-2.0-flash-exp', prompt);

        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // 如果解析失败，返回原始文本
        }

        return {
            title: '生成的标题',
            synopsis: result.text,
            coolPoint: '核心爽点'
        };
    }

    /**
     * 生成章节内容（简化版）
     */
    async generateChapterContent(apiKey, params) {
        const { title, outline, wordCount } = params;

        const prompt = `请根据以下信息生成章节正文：

章节标题：${title}
章节大纲：${outline || '无'}
字数要求：${wordCount || 2000}字

请生成完整的章节正文，注意：
1. 符合网文写作风格
2. 节奏紧凑，有悬念
3. 字数符合要求`;

        const result = await this.generateContent(apiKey, 'gemini-2.0-flash-exp', prompt);

        return {
            content: result.text,
            wordCount: result.text.length
        };
    }

    /**
     * 生成小说架构（简化版）
     */
    async generateNovelArchitecture(apiKey, params) {
        const { idea } = params;

        const prompt = `请根据以下创意生成小说架构：

创意：${idea}

请生成：
1. 世界观设定
2. 主要角色（至少3个）
3. 力量体系
4. 主线剧情大纲

请以JSON格式返回。`;

        const result = await this.generateContent(apiKey, 'gemini-2.0-flash-exp', prompt);

        try {
            const jsonMatch = result.text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
        } catch (e) {
            // 解析失败
        }

        return {
            worldview: '世界观设定',
            characters: ['主角', '配角1', '配角2'],
            powerSystem: '力量体系',
            plotOutline: result.text
        };
    }
}

module.exports = new GeminiService();
