
import { LogEntry, LogLevel } from '../types';
import { saveToStorage, loadFromStorage } from './storageService';

const LOG_STORAGE_KEY = 'inkflow_system_logs';
const MAX_LOGS = 500; // Keep last 500 logs to avoid localStorage overflow

class LoggerService {
    private sessionId: string;
    private buffer: LogEntry[] = [];

    constructor() {
        this.sessionId = Math.random().toString(36).substring(2, 15);
        this.info('System', 'Logger Service initialized', { sessionId: this.sessionId });
    }

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

    // Prevent circular references and huge objects in logs
    private sanitizeData(data: any): any {
        if (!data) return undefined;
        try {
            // Simple serialization check
            JSON.stringify(data);
            return data;
        } catch (e) {
            return '[Complex/Circular Object]';
        }
    }

    private persist(entry: LogEntry) {
        try {
            // Output to Console with styling
            const style = this.getConsoleStyle(entry.level);
            console.log(
                `%c[${entry.level}]%c [${entry.category}] ${entry.message}`, 
                style, 
                'color: #64748b;', 
                entry.data || ''
            );

            // Output to Storage
            const storedLogs: LogEntry[] = loadFromStorage(LOG_STORAGE_KEY) || [];
            const updatedLogs = [entry, ...storedLogs].slice(0, MAX_LOGS); // Prepend and trim
            saveToStorage(LOG_STORAGE_KEY, updatedLogs);
        } catch (e) {
            console.error('Logger failed to persist:', e);
        }
    }

    private getConsoleStyle(level: LogLevel): string {
        switch (level) {
            case LogLevel.INFO: return 'color: #0ea5e9; font-weight: bold;';
            case LogLevel.WARN: return 'color: #f59e0b; font-weight: bold;';
            case LogLevel.ERROR: return 'color: #ef4444; font-weight: bold; background: #fee2e2; padding: 2px 4px; border-radius: 2px;';
            case LogLevel.DEBUG: return 'color: #a855f7; font-weight: bold;';
            default: return 'color: #334155;';
        }
    }

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
    
    public getLogs(): LogEntry[] {
        return loadFromStorage(LOG_STORAGE_KEY) || [];
    }
    
    public clearLogs() {
        saveToStorage(LOG_STORAGE_KEY, []);
        this.info('System', 'Logs cleared manually');
    }
}

export const Logger = new LoggerService();
