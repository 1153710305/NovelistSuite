/**
 * @file server/src/models/database.js
 * @description 数据库初始化和管理（基于 JSON 文件）
 */

const fs = require('fs');
const path = require('path');

// 数据库文件路径
const DB_DIR = path.join(__dirname, '../../data');
const DB_PATH = path.join(DB_DIR, 'inkflow.json');

// 默认数据结构
const defaultData = {
    tasks: [],
    taskLogs: [],
    settings: {
        maxConcurrentTasks: 3,
        taskTimeout: 300000,
        createdAt: new Date().toISOString()
    }
};

let db = null;

/**
 * 初始化数据库
 */
async function initDatabase() {
    if (db) {
        return db;
    }

    try {
        // 确保数据目录存在
        if (!fs.existsSync(DB_DIR)) {
            fs.mkdirSync(DB_DIR, { recursive: true });
        }

        // 如果数据库文件不存在，创建默认文件
        if (!fs.existsSync(DB_PATH)) {
            fs.writeFileSync(DB_PATH, JSON.stringify(defaultData, null, 2), 'utf8');
            console.log('[Database] 创建新数据库文件');
        }

        // 读取数据库文件
        const data = fs.readFileSync(DB_PATH, 'utf8');
        db = JSON.parse(data);

        console.log('[Database] 数据库初始化成功');
        console.log(`[Database] 数据文件：${DB_PATH}`);
        return db;
    } catch (error) {
        console.error('[Database] 初始化失败:', error);
        throw error;
    }
}

/**
 * 获取数据库实例
 */
function getDatabase() {
    if (!db) {
        throw new Error('数据库未初始化，请先调用 initDatabase()');
    }
    return db;
}

/**
 * 保存数据到文件
 */
async function saveDatabase() {
    if (db) {
        try {
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
        } catch (error) {
            console.error('[Database] 保存失败:', error);
            throw error;
        }
    }
}

module.exports = {
    initDatabase,
    getDatabase,
    saveDatabase
};

