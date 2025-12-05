/**
 * @file services/backendApi.ts
 * @description 后端 API 客户端
 * 
 * 封装所有对后端服务器的 HTTP 请求
 */

// 后端服务器地址（可通过环境变量配置）
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';

/**
 * 通用请求函数
 */
async function request<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`;

    const defaultOptions: RequestInit = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const config = { ...defaultOptions, ...options };

    try {
        const response = await fetch(url, config);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    } catch (error: any) {
        console.error(`[BackendAPI] 请求失败: ${endpoint}`, error);
        throw error;
    }
}

/**
 * 后端 API 客户端
 */
export const BackendAPI = {
    /**
     * 健康检查
     */
    health: async () => {
        return request<{ status: string; timestamp: string }>('/health');
    },

    /**
     * 获取 API 信息
     */
    info: async () => {
        return request<{ name: string; version: string; description: string }>('/api/info');
    },

    /**
     * 任务管理
     */
    tasks: {
        /**
         * 创建任务
         */
        create: async (data: { type: string; payload: any; priority?: number }) => {
            return request<{ success: boolean; data: any }>('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(data),
            });
        },

        /**
         * 获取任务列表
         */
        list: async (params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
            const query = new URLSearchParams(params as any).toString();
            return request<{ success: boolean; data: any[] }>(`/api/tasks?${query}`);
        },

        /**
         * 获取任务详情
         */
        get: async (taskId: string) => {
            return request<{ success: boolean; data: any }>(`/api/tasks/${taskId}`);
        },

        /**
         * 获取任务日志
         */
        logs: async (taskId: string, params?: { level?: string; limit?: number; offset?: number }) => {
            const query = new URLSearchParams(params as any).toString();
            return request<{ success: boolean; data: any[] }>(`/api/tasks/${taskId}/logs?${query}`);
        },

        /**
         * 取消/删除任务
         */
        delete: async (taskId: string) => {
            return request<{ success: boolean; message: string }>(`/api/tasks/${taskId}`, {
                method: 'DELETE',
            });
        },

        /**
         * 获取任务统计
         */
        stats: async () => {
            return request<{ success: boolean; data: any }>('/api/tasks/stats');
        },

        /**
         * 获取队列状态
         */
        queueStatus: async () => {
            return request<{ success: boolean; data: any }>('/api/tasks/queue/status');
        },

        /**
         * 配置队列参数
         */
        configQueue: async (config: { maxConcurrent?: number }) => {
            return request<{ success: boolean; data: any }>('/api/tasks/queue/config', {
                method: 'POST',
                body: JSON.stringify(config),
            });
        },
    },

    /**
     * AI 生成
     */
    generate: {
        /**
         * 生成每日灵感
         */
        dailyStories: async (params: {
            trendFocus: string;
            targetAudience: string;
            lang?: string;
            model?: string;
            systemInstruction?: string;
            customRules?: any;
        }) => {
            return request<{ success: boolean; data: { taskId: string; status: string } }>(
                '/api/generate/daily-stories',
                {
                    method: 'POST',
                    body: JSON.stringify(params),
                }
            );
        },

        /**
         * 生成小说架构
         */
        novelArchitecture: async (params: {
            idea: string;
            lang?: string;
            model?: string;
        }) => {
            return request<{ success: boolean; data: { taskId: string; status: string } }>(
                '/api/generate/novel-architecture',
                {
                    method: 'POST',
                    body: JSON.stringify(params),
                }
            );
        },

        /**
         * 生成章节内容
         */
        chapterContent: async (params: {
            title: string;
            outline?: string;
            wordCount?: number;
            lang?: string;
            model?: string;
        }) => {
            return request<{ success: boolean; data: { taskId: string; status: string } }>(
                '/api/generate/chapter-content',
                {
                    method: 'POST',
                    body: JSON.stringify(params),
                }
            );
        },

        /**
         * 重绘思维导图
         */
        regenerateMap: async (params: {
            mapType: string;
            idea: string;
            context?: string;
        }) => {
            return request<{ success: boolean; data: { taskId: string; status: string } }>(
                '/api/generate/regenerate-map',
                {
                    method: 'POST',
                    body: JSON.stringify(params),
                }
            );
        },

        /**
         * 扩展节点
         */
        expandNode: async (params: {
            nodeId: string;
            nodeName: string;
            context?: string;
        }) => {
            return request<{ success: boolean; data: { taskId: string; status: string } }>(
                '/api/generate/expand-node',
                {
                    method: 'POST',
                    body: JSON.stringify(params),
                }
            );
        },
    },

    /**
     * 管理员
     */
    admin: {
        /**
         * 获取所有 API Keys
         */
        getApiKeys: async () => {
            return request<{ success: boolean; data: any[] }>('/admin/api-keys');
        },

        /**
         * 添加 API Key
         */
        addApiKey: async (key: string) => {
            return request<{ success: boolean; message: string }>('/admin/api-keys', {
                method: 'POST',
                body: JSON.stringify({ key }),
            });
        },

        /**
         * 删除 API Key
         */
        deleteApiKey: async (keyId: string) => {
            return request<{ success: boolean; message: string }>(`/admin/api-keys/${keyId}`, {
                method: 'DELETE',
            });
        },

        /**
         * 重新启用 API Key
         */
        reactivateApiKey: async (keyId: string) => {
            return request<{ success: boolean; message: string }>(`/admin/api-keys/${keyId}/reactivate`, {
                method: 'PUT',
            });
        },

        /**
         * 测试 API Key 选择
         */
        testApiKeys: async () => {
            return request<{ success: boolean; data: any }>('/admin/api-keys/test');
        },
    },
};

/**
 * 轮询任务结果的辅助函数
 * @param taskId 任务 ID
 * @param onProgress 进度回调
 * @param maxAttempts 最大轮询次数
 * @param interval 轮询间隔（毫秒）
 */
export async function pollTaskResult(
    taskId: string,
    onProgress?: (task: any) => void,
    maxAttempts: number = 60,
    interval: number = 2000
): Promise<any> {
    for (let i = 0; i < maxAttempts; i++) {
        const response = await BackendAPI.tasks.get(taskId);
        const task = response.data;

        if (onProgress) {
            onProgress(task);
        }

        if (task.status === 'completed') {
            return task.result;
        }

        if (task.status === 'failed') {
            throw new Error(task.error || '任务执行失败');
        }

        if (task.status === 'cancelled') {
            throw new Error('任务已取消');
        }

        // 等待后继续轮询
        await new Promise(resolve => setTimeout(resolve, interval));
    }

    throw new Error('任务超时：轮询次数已达上限');
}

export default BackendAPI;
