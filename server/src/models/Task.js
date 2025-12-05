/**
 * @file server/src/models/Task.js
 * @description 任务数据模型
 */

const { v4: uuidv4 } = require('uuid');
const { getDatabase, saveDatabase } = require('./database');

/**
 * 任务状态枚举
 */
const TaskStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
};

/**
 * 任务类型枚举
 */
const TaskType = {
    DAILY_STORIES: 'daily_stories',
    NOVEL_ARCHITECTURE: 'novel_architecture',
    CHAPTER_CONTENT: 'chapter_content',
    REGENERATE_MAP: 'regenerate_map',
    EXPAND_NODE: 'expand_node',
    MANIPULATE_TEXT: 'manipulate_text',
    REWRITE_CHAPTER: 'rewrite_chapter',
    ANALYZE_TREND: 'analyze_trend'
};

class TaskModel {
    /**
     * 创建新任务
     */
    static async create(data) {
        const db = getDatabase();

        const task = {
            id: uuidv4(),
            type: data.type,
            status: TaskStatus.PENDING,
            priority: data.priority || 0,
            payload: data.payload || {},
            result: null,
            error: null,
            apiKeyId: null,
            progress: 0,
            startTime: null,
            endTime: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        db.tasks.push(task);
        await saveDatabase();

        console.log(`[TaskModel] 创建任务: ${task.id} (${task.type})`);
        return task;
    }

    /**
     * 根据 ID 查找任务
     */
    static async findById(id) {
        const db = getDatabase();
        return db.tasks.find(t => t.id === id);
    }

    /**
     * 查找所有任务
     */
    static async findAll(filter = {}) {
        const db = getDatabase();
        let tasks = db.tasks;

        // 状态过滤
        if (filter.status) {
            tasks = tasks.filter(t => t.status === filter.status);
        }

        // 类型过滤
        if (filter.type) {
            tasks = tasks.filter(t => t.type === filter.type);
        }

        // 分页
        const limit = filter.limit || 50;
        const offset = filter.offset || 0;

        return tasks.slice(offset, offset + limit);
    }

    /**
     * 更新任务
     */
    static async update(id, updates) {
        const db = getDatabase();
        const index = db.tasks.findIndex(t => t.id === id);

        if (index === -1) {
            throw new Error(`任务不存在: ${id}`);
        }

        db.tasks[index] = {
            ...db.tasks[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        await saveDatabase();
        return db.tasks[index];
    }

    /**
     * 更新任务状态
     */
    static async updateStatus(id, status, additionalData = {}) {
        const updates = {
            status,
            ...additionalData
        };

        if (status === TaskStatus.RUNNING && !additionalData.startTime) {
            updates.startTime = new Date().toISOString();
        }

        if ([TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED].includes(status) && !additionalData.endTime) {
            updates.endTime = new Date().toISOString();
        }

        return await this.update(id, updates);
    }

    /**
     * 更新任务进度
     */
    static async updateProgress(id, progress) {
        return await this.update(id, { progress });
    }

    /**
     * 删除任务
     */
    static async delete(id) {
        const db = getDatabase();
        const index = db.tasks.findIndex(t => t.id === id);

        if (index === -1) {
            return false;
        }

        db.tasks.splice(index, 1);
        await saveDatabase();

        console.log(`[TaskModel] 删除任务: ${id}`);
        return true;
    }

    /**
     * 清理旧任务（保留最近的 N 个）
     */
    static async cleanup(keepCount = 100) {
        const db = getDatabase();

        if (db.tasks.length <= keepCount) {
            return 0;
        }

        // 按创建时间排序，保留最新的
        db.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const removed = db.tasks.splice(keepCount);

        await saveDatabase();

        console.log(`[TaskModel] 清理了 ${removed.length} 个旧任务`);
        return removed.length;
    }

    /**
     * 获取统计信息
     */
    static async getStats() {
        const db = getDatabase();
        const tasks = db.tasks;

        return {
            total: tasks.length,
            pending: tasks.filter(t => t.status === TaskStatus.PENDING).length,
            running: tasks.filter(t => t.status === TaskStatus.RUNNING).length,
            completed: tasks.filter(t => t.status === TaskStatus.COMPLETED).length,
            failed: tasks.filter(t => t.status === TaskStatus.FAILED).length
        };
    }
}

module.exports = {
    TaskModel,
    TaskStatus,
    TaskType
};
