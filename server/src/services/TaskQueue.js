/**
 * @file server/src/services/TaskQueue.js
 * @description 任务队列管理器
 * 
 * 功能：
 * - 管理任务队列
 * - 控制并发执行
 * - API Key 自动轮换
 * - 任务失败重试
 */

const { TaskModel, TaskLogModel, TaskStatus, LogLevel } = require('../models');
const apiKeyManager = require('./ApiKeyManager');
const { config } = require('../config');

class TaskQueue {
    constructor() {
        // 任务队列
        this.queue = [];

        // 正在运行的任务
        this.running = new Map();

        // 最大并发数
        this.maxConcurrent = config.tasks.maxConcurrent || 3;

        // 任务超时时间（毫秒）
        this.timeout = config.tasks.timeout || 300000; // 5分钟

        // 重试次数
        this.maxRetries = config.tasks.retryAttempts || 3;

        // 是否正在处理队列
        this.processing = false;
    }

    /**
     * 添加任务到队列
     * @param {Object} taskData - 任务数据
     * @returns {Object} 创建的任务
     */
    async addTask(taskData) {
        // 创建任务记录
        const task = await TaskModel.create(taskData);

        // 添加到队列
        this.queue.push(task.id);

        // 记录日志
        await TaskLogModel.create({
            taskId: task.id,
            level: LogLevel.INFO,
            message: '任务已加入队列'
        });

        console.log(`[TaskQueue] 任务加入队列: ${task.id} (队列长度: ${this.queue.length})`);

        // 尝试处理队列
        this.processQueue();

        return task;
    }

    /**
     * 处理队列（非阻塞）
     */
    async processQueue() {
        // 如果已经在处理，直接返回
        if (this.processing) {
            return;
        }

        this.processing = true;

        try {
            while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
                // 取出第一个任务
                const taskId = this.queue.shift();

                // 开始执行任务（异步，不等待）
                this.executeTask(taskId).catch(error => {
                    console.error(`[TaskQueue] 任务执行异常: ${taskId}`, error);
                });
            }
        } finally {
            this.processing = false;
        }
    }

    /**
     * 执行单个任务
     * @param {string} taskId - 任务ID
     */
    async executeTask(taskId) {
        try {
            // 获取任务
            const task = await TaskModel.findById(taskId);
            if (!task) {
                console.error(`[TaskQueue] 任务不存在: ${taskId}`);
                return;
            }

            // 标记为运行中
            this.running.set(taskId, {
                startTime: Date.now(),
                retries: 0
            });

            await TaskModel.updateStatus(taskId, TaskStatus.RUNNING);
            await TaskLogModel.create({
                taskId,
                level: LogLevel.INFO,
                message: '任务开始执行'
            });

            console.log(`[TaskQueue] 开始执行任务: ${taskId} (运行中: ${this.running.size})`);

            // 执行任务
            await this.runTaskWithRetry(task);

        } catch (error) {
            console.error(`[TaskQueue] 任务执行失败: ${taskId}`, error);
        } finally {
            // 从运行列表中移除
            this.running.delete(taskId);

            // 继续处理队列
            this.processQueue();
        }
    }

    /**
     * 带重试的任务执行
     * @param {Object} task - 任务对象
     */
    async runTaskWithRetry(task) {
        const runInfo = this.running.get(task.id);
        let lastError = null;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                // 获取API Key
                const { keyId, key } = apiKeyManager.getNextKey();

                // 更新任务使用的Key
                await TaskModel.update(task.id, { apiKeyId: keyId });

                await TaskLogModel.create({
                    taskId: task.id,
                    level: LogLevel.INFO,
                    message: `尝试 ${attempt + 1}/${this.maxRetries + 1}，使用 ${keyId}`
                });

                // 执行任务（带超时）
                const result = await this.executeWithTimeout(task, key);

                // 标记成功
                apiKeyManager.markSuccess(keyId);

                await TaskModel.updateStatus(task.id, TaskStatus.COMPLETED, {
                    result,
                    apiKeyId: keyId
                });

                await TaskLogModel.create({
                    taskId: task.id,
                    level: LogLevel.INFO,
                    message: '任务执行成功'
                });

                console.log(`[TaskQueue] 任务完成: ${task.id}`);
                return;

            } catch (error) {
                lastError = error;
                const keyId = task.apiKeyId;

                // 标记失败
                if (keyId) {
                    apiKeyManager.markFailure(keyId, error.message);
                }

                await TaskLogModel.create({
                    taskId: task.id,
                    level: LogLevel.ERROR,
                    message: `执行失败 (尝试 ${attempt + 1}): ${error.message}`
                });

                // 如果还有重试次数，等待后继续
                if (attempt < this.maxRetries) {
                    await this.delay(config.tasks.retryDelay || 3000);
                }
            }
        }

        // 所有重试都失败
        await TaskModel.updateStatus(task.id, TaskStatus.FAILED, {
            error: lastError.message
        });

        await TaskLogModel.create({
            taskId: task.id,
            level: LogLevel.ERROR,
            message: `任务最终失败: ${lastError.message}`
        });

        console.error(`[TaskQueue] 任务失败: ${task.id}`);
    }

    /**
     * 带超时的任务执行
     * @param {Object} task - 任务对象
     * @param {string} apiKey - API Key
     */
    async executeWithTimeout(task, apiKey) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                reject(new Error('任务超时'));
            }, this.timeout);

            // 实际执行任务
            this.executeTaskLogic(task, apiKey)
                .then(result => {
                    clearTimeout(timer);
                    resolve(result);
                })
                .catch(error => {
                    clearTimeout(timer);
                    reject(error);
                });
        });
    }

    /**
     * 实际的任务执行逻辑
     * @param {Object} task - 任务对象
     * @param {string} apiKey - API Key
     */
    async executeTaskLogic(task, apiKey) {
        const geminiService = require('./GeminiService');
        const { TaskType } = require('../models');

        try {
            let result;

            switch (task.type) {
                case TaskType.DAILY_STORIES:
                    result = await geminiService.generateDailyStories(apiKey, task.payload);
                    break;

                case TaskType.NOVEL_ARCHITECTURE:
                    result = await geminiService.generateNovelArchitecture(apiKey, task.payload);
                    break;

                case TaskType.CHAPTER_CONTENT:
                    result = await geminiService.generateChapterContent(apiKey, task.payload);
                    break;

                case TaskType.REGENERATE_MAP:
                case TaskType.EXPAND_NODE:
                    // 这些功能待后续实现
                    result = {
                        message: `${task.type} 功能待实现`,
                        payload: task.payload
                    };
                    break;

                default:
                    throw new Error(`未知的任务类型: ${task.type}`);
            }

            return result;
        } catch (error) {
            throw new Error(`任务执行失败: ${error.message}`);
        }
    }

    /**
     * 延迟函数
     * @param {number} ms - 毫秒数
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 获取队列状态
     */
    getStatus() {
        return {
            queueLength: this.queue.length,
            runningCount: this.running.size,
            maxConcurrent: this.maxConcurrent,
            tasks: Array.from(this.running.keys())
        };
    }

    /**
     * 取消任务
     * @param {string} taskId - 任务ID
     */
    async cancelTask(taskId) {
        // 从队列中移除
        const queueIndex = this.queue.indexOf(taskId);
        if (queueIndex > -1) {
            this.queue.splice(queueIndex, 1);

            await TaskModel.updateStatus(taskId, TaskStatus.CANCELLED);
            await TaskLogModel.create({
                taskId,
                level: LogLevel.INFO,
                message: '任务已取消'
            });

            console.log(`[TaskQueue] 任务已取消: ${taskId}`);
            return true;
        }

        // 如果正在运行，无法取消
        if (this.running.has(taskId)) {
            console.warn(`[TaskQueue] 任务正在运行，无法取消: ${taskId}`);
            return false;
        }

        return false;
    }

    /**
     * 设置最大并发数
     * @param {number} max - 最大并发数
     */
    setMaxConcurrent(max) {
        this.maxConcurrent = max;
        console.log(`[TaskQueue] 最大并发数设置为: ${max}`);

        // 尝试处理队列（如果增加了并发数）
        this.processQueue();
    }
}

// 导出单例
module.exports = new TaskQueue();
