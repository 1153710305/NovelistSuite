/**
 * @file server/src/models/TaskLog.js
 * @description 任务日志数据模型
 */

const { v4: uuidv4 } = require('uuid');
const { getDatabase, saveDatabase } = require('./database');

/**
 * 日志级别枚举
 */
const LogLevel = {
    DEBUG: 'debug',
    INFO: 'info',
    WARN: 'warn',
    ERROR: 'error'
};

class TaskLogModel {
    /**
     * 创建日志
     */
    static async create(data) {
        const db = getDatabase();

        const log = {
            id: uuidv4(),
            taskId: data.taskId,
            level: data.level || LogLevel.INFO,
            message: data.message,
            details: data.details || null,
            timestamp: new Date().toISOString()
        };

        db.taskLogs.push(log);
        await saveDatabase();

        return log;
    }

    /**
     * 根据任务 ID 查找日志
     */
    static async findByTaskId(taskId, options = {}) {
        const db = getDatabase();
        let logs = db.taskLogs.filter(log => log.taskId === taskId);

        // 级别过滤
        if (options.level) {
            logs = logs.filter(log => log.level === options.level);
        }

        // 按时间排序
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        // 分页
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        return logs.slice(offset, offset + limit);
    }

    /**
     * 查找所有日志
     */
    static async findAll(options = {}) {
        const db = getDatabase();
        let logs = db.taskLogs;

        // 级别过滤
        if (options.level) {
            logs = logs.filter(log => log.level === options.level);
        }

        // 任务ID过滤
        if (options.taskId) {
            logs = logs.filter(log => log.taskId === options.taskId);
        }

        // 按时间排序（最新的在前）
        logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // 分页
        const limit = options.limit || 100;
        const offset = options.offset || 0;

        return logs.slice(offset, offset + limit);
    }

    /**
     * 删除指定任务的所有日志
     */
    static async deleteByTaskId(taskId) {
        const db = getDatabase();
        const before = db.taskLogs.length;

        db.taskLogs = db.taskLogs.filter(log => log.taskId !== taskId);

        await saveDatabase();

        const deleted = before - db.taskLogs.length;
        console.log(`[TaskLogModel] 删除了任务 ${taskId} 的 ${deleted} 条日志`);
        return deleted;
    }

    /**
     * 清理旧日志（保留最近 N 天的）
     */
    static async cleanup(daysToKeep = 7) {
        const db = getDatabase();
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const before = db.taskLogs.length;

        db.taskLogs = db.taskLogs.filter(log =>
            new Date(log.timestamp) > cutoffDate
        );

        await saveDatabase();

        const deleted = before - db.taskLogs.length;
        console.log(`[TaskLogModel] 清理了 ${deleted} 条旧日志（保留 ${daysToKeep} 天内的）`);
        return deleted;
    }

    /**
     * 批量创建日志
     */
    static async createBatch(logs) {
        const db = getDatabase();

        const newLogs = logs.map(data => ({
            id: uuidv4(),
            taskId: data.taskId,
            level: data.level || LogLevel.INFO,
            message: data.message,
            details: data.details || null,
            timestamp: new Date().toISOString()
        }));

        db.taskLogs.push(...newLogs);
        await saveDatabase();

        return newLogs;
    }

    /**
     * 获取统计信息
     */
    static async getStats() {
        const db = getDatabase();
        const logs = db.taskLogs;

        return {
            total: logs.length,
            debug: logs.filter(l => l.level === LogLevel.DEBUG).length,
            info: logs.filter(l => l.level === LogLevel.INFO).length,
            warn: logs.filter(l => l.level === LogLevel.WARN).length,
            error: logs.filter(l => l.level === LogLevel.ERROR).length
        };
    }
}

module.exports = {
    TaskLogModel,
    LogLevel
};
