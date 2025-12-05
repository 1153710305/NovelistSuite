/**
 * @file server/src/models/index.js
 * @description 数据模型导出
 */

const { initDatabase } = require('./database');
const { TaskModel, TaskStatus, TaskType } = require('./Task');
const { TaskLogModel, LogLevel } = require('./TaskLog');

module.exports = {
    // 数据库
    initDatabase,

    // 模型
    TaskModel,
    TaskLogModel,

    // 枚举
    TaskStatus,
    TaskType,
    LogLevel
};
