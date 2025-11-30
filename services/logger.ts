
/**
 * @file services/logger.ts
 * @description 集中式日志记录服务。
 * 
 * ## 功能
 * - **分级日志**: 支持 INFO, WARN, ERROR, DEBUG 四种级别。
 * - **持久化**: 将日志保存到 localStorage，以便在 Admin 面板查看（用于无后端环境下的调试）。
 * - **控制台美化**: 在浏览器 DevTools 中输出带颜色的格式化日志。
 * - **安全处理**: 自动序列化复杂对象，防止循环引用导致崩溃。
 */

import { LogEntry, LogLevel } from '../types';
import { saveToStorage, loadFromStorage } from './storageService';

const LOG_STORAGE_KEY = 'inkflow_system_logs';
const MAX_LOGS = 500; // 限制存储日志条数，防止阻塞 LocalStorage

class LoggerService {
    private sessionId: string; // 当前会话 ID
    
    constructor() {
        // 为每次页面加载生成唯一的会话 ID，便于追踪单次运行的问题
        this.sessionId = Math.random().toString(36).substring(2, 15);
        this.info('System', 'Logger Service initialized', { sessionId: this.sessionId });
    }

    /**
     * 创建日志条目对象
     */
    private createEntry(level: LogLevel, category: string, message: string, data?: any): LogEntry {
        return {
            id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
            sessionId: this.sessionId,
            timestamp: Date.now(),
            level,
            category,
            message,
            data: this.sanitizeData(data)
        };
    }

    /**
     * 数据清洗
     * 防止日志对象中包含循环引用或过大的数据（如 Base64 图片），导致 JSON.stringify 失败。
     */
    private sanitizeData(data: any): any {
        if (!data) return undefined;
        try {
            // 尝试简单的序列化检查
            JSON.stringify(data);
            return data;
        } catch (e) {
            return '[Complex/Circular Object - Serialization Failed]';
        }
    }

    /**
     * 持久化日志
     * 输出到控制台并保存到 LocalStorage
     */
    private persist(entry: LogEntry) {
        try {
            // 1. 输出到控制台 (带有 CSS 样式)
            const style = this.getConsoleStyle(entry.level);
            console.log(
                `%c[${entry.level}]%c [${entry.category}] ${entry.message}`, 
                style, 
                'color: #64748b;', 
                entry.data || ''
            );

            // 2. 写入本地存储 (队列式)
            const storedLogs: LogEntry[] = loadFromStorage(LOG_STORAGE_KEY) || [];
            const updatedLogs = [entry, ...storedLogs].slice(0, MAX_LOGS); // 插入头部并截断
            saveToStorage(LOG_STORAGE_KEY, updatedLogs);
        } catch (e) {
            console.error('Logger failed to persist:', e);
        }
    }

    /**
     * 获取控制台输出样式
     */
    private getConsoleStyle(level: LogLevel): string {
        switch (level) {
            case LogLevel.INFO: return 'color: #0ea5e9; font-weight: bold;';
            case LogLevel.WARN: return 'color: #f59e0b; font-weight: bold;';
            case LogLevel.ERROR: return 'color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 4px; border-radius: 2px;';
            case LogLevel.DEBUG: return 'color: #a855f7; font-weight: bold;';
            default: return 'color: #334155;';
        }
    }

    // --- 公共 API ---

    public info(category: string, message: string, data?: any) {
        this.persist(this.createEntry(LogLevel.INFO, category, message, data));
    }

    public warn(category: string, message: string, data?: any) {
        this.persist(this.createEntry(LogLevel.WARN, category, message, data));
    }

    public error(category: string, message: string, data?: any) {
        this.persist(this.createEntry(LogLevel.ERROR, category, message, data));
    }

    public debug(category: string, message: string, data?: any) {
        this.persist(this.createEntry(LogLevel.DEBUG, category, message, data));
    }
    
    public getSessionId() {
        return this.sessionId;
    }
    
    // 获取所有存储的日志 (供 Admin 页面使用)
    public getLogs(): LogEntry[] {
        return loadFromStorage(LOG_STORAGE_KEY) || [];
    }
    
    // 清空日志
    public clearLogs() {
        saveToStorage(LOG_STORAGE_KEY, []);
        this.info('System', 'Logs cleared manually');
    }
}

export const Logger = new LoggerService();
