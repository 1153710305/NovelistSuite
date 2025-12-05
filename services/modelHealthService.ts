/**
 * @file services/modelHealthService.ts
 * @description 模型健康检测服务 - 用于测试各个 AI 模型的可用性和网络延迟
 * 
 * ## 功能
 * - 测试模型是否可用
 * - 测量网络延迟
 * - 提供统一的健康检测接口
 */

import { GoogleGenAI } from '@google/genai';

/**
 * 模型健康检测结果接口
 */
export interface ModelHealthResult {
    modelId: string;           // 模型ID
    status: 'healthy' | 'unhealthy' | 'testing' | 'unknown'; // 健康状态
    latency?: number;          // 延迟(毫秒)
    error?: string;            // 错误信息
    timestamp: number;         // 检测时间戳
    responsePreview?: string;  // 响应预览(前100字符)
}

/**
 * 测试单个模型的健康状态
 * @param modelId 模型ID
 * @param apiKey API密钥
 * @returns 健康检测结果
 */
export const testModelHealth = async (
    modelId: string,
    apiKey: string
): Promise<ModelHealthResult> => {
    const startTime = Date.now();

    try {
        // 根据模型类型选择不同的测试策略
        if (modelId.startsWith('gemini-') || modelId.includes('flash') || modelId.includes('pro')) {
            // Google Gemini 系列
            return await testGeminiModel(modelId, apiKey, startTime);
        } else if (modelId.startsWith('qwen-')) {
            // 阿里千问系列
            return await testQwenModel(modelId, apiKey, startTime);
        } else if (modelId.startsWith('doubao-')) {
            // 字节豆包系列
            return await testDoubaoModel(modelId, apiKey, startTime);
        } else {
            // 未知模型类型
            return {
                modelId,
                status: 'unknown',
                error: '不支持的模型类型',
                timestamp: Date.now()
            };
        }
    } catch (error: any) {
        const latency = Date.now() - startTime;
        return {
            modelId,
            status: 'unhealthy',
            latency,
            error: error.message || '未知错误',
            timestamp: Date.now()
        };
    }
};

import BackendAPI from './backendApi';

/**
 * 测试 Google Gemini 模型
 */
const testGeminiModel = async (
    modelId: string,
    apiKey: string,
    startTime: number
): Promise<ModelHealthResult> => {
    const USE_BACKEND = process.env.NEXT_PUBLIC_USE_BACKEND !== 'false';

    if (USE_BACKEND) {
        try {
            const res = await BackendAPI.admin.testModel(modelId);
            return {
                modelId,
                status: 'healthy',
                latency: res.data.latency,
                responsePreview: res.data.response,
                timestamp: Date.now()
            };
        } catch (error: any) {
            return {
                modelId,
                status: 'unhealthy',
                latency: Date.now() - startTime,
                error: error.message || '后端测试失败',
                timestamp: Date.now()
            };
        }
    }

    try {
        const ai = new GoogleGenAI({ apiKey });

        // 发送简单的测试请求
        const response = await ai.models.generateContent({
            model: modelId,
            contents: '请用一句话介绍你自己。',
            config: {
                maxOutputTokens: 50,
                temperature: 0.1
            }
        });

        const latency = Date.now() - startTime;
        const responseText = response.text || '';

        return {
            modelId,
            status: 'healthy',
            latency,
            responsePreview: responseText.substring(0, 100),
            timestamp: Date.now()
        };
    } catch (error: any) {
        const latency = Date.now() - startTime;

        // 解析错误信息
        let errorMessage = '连接失败';
        if (error.message) {
            if (error.message.includes('API key')) {
                errorMessage = 'API密钥无效';
            } else if (error.message.includes('not found')) {
                errorMessage = '模型不存在';
            } else if (error.message.includes('quota')) {
                errorMessage = '配额已用尽';
            } else if (error.message.includes('timeout')) {
                errorMessage = '请求超时';
            } else {
                errorMessage = error.message;
            }
        }

        return {
            modelId,
            status: 'unhealthy',
            latency,
            error: errorMessage,
            timestamp: Date.now()
        };
    }
};

/**
 * 测试阿里千问模型
 * 注意: 这是一个占位实现,实际需要根据千问的 SDK 进行调整
 */
const testQwenModel = async (
    modelId: string,
    apiKey: string,
    startTime: number
): Promise<ModelHealthResult> => {
    // TODO: 实现千问模型的健康检测
    // 目前返回未实现状态
    return {
        modelId,
        status: 'unknown',
        error: '千问模型检测功能待实现 - 需要配置千问 API',
        timestamp: Date.now()
    };
};

/**
 * 测试字节豆包模型
 * 注意: 这是一个占位实现,实际需要根据豆包的 SDK 进行调整
 */
const testDoubaoModel = async (
    modelId: string,
    apiKey: string,
    startTime: number
): Promise<ModelHealthResult> => {
    // TODO: 实现豆包模型的健康检测
    // 目前返回未实现状态
    return {
        modelId,
        status: 'unknown',
        error: '豆包模型检测功能待实现 - 需要配置豆包 API',
        timestamp: Date.now()
    };
};

/**
 * 批量测试所有模型
 * @param modelIds 模型ID列表
 * @param apiKey API密钥
 * @param onProgress 进度回调
 * @returns 所有模型的健康检测结果
 */
export const testAllModels = async (
    modelIds: string[],
    apiKey: string,
    onProgress?: (current: number, total: number, modelId: string) => void
): Promise<ModelHealthResult[]> => {
    const results: ModelHealthResult[] = [];

    for (let i = 0; i < modelIds.length; i++) {
        const modelId = modelIds[i];

        // 通知进度
        if (onProgress) {
            onProgress(i + 1, modelIds.length, modelId);
        }

        // 测试单个模型
        const result = await testModelHealth(modelId, apiKey);
        results.push(result);

        // 避免请求过快,添加小延迟
        if (i < modelIds.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    return results;
};

/**
 * 获取延迟等级描述
 * @param latency 延迟(毫秒)
 * @returns 延迟等级
 */
export const getLatencyLevel = (latency?: number): {
    level: 'excellent' | 'good' | 'fair' | 'poor' | 'unknown';
    label: string;
    color: string;
} => {
    if (!latency) {
        return { level: 'unknown', label: '未知', color: 'text-slate-400' };
    }

    if (latency < 1000) {
        return { level: 'excellent', label: '优秀', color: 'text-green-600' };
    } else if (latency < 3000) {
        return { level: 'good', label: '良好', color: 'text-blue-600' };
    } else if (latency < 5000) {
        return { level: 'fair', label: '一般', color: 'text-yellow-600' };
    } else {
        return { level: 'poor', label: '较慢', color: 'text-red-600' };
    }
};
