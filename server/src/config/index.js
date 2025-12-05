/**
 * @file server/src/config/index.js
 * @description 服务器配置管理
 */

require('dotenv').config();

const config = {
    // 服务器配置
    server: {
        port: process.env.PORT || 3001,
        env: process.env.NODE_ENV || 'development'
    },

    // API Keys 配置
    apiKeys: {
        gemini: process.env.GEMINI_API_KEYS || '',
    },

    // 任务配置
    tasks: {
        maxConcurrent: parseInt(process.env.MAX_CONCURRENT_TASKS) || 3,
        timeout: parseInt(process.env.TASK_TIMEOUT) || 300000, // 5分钟
        retryAttempts: 3,
        retryDelay: 3000 // 3秒
    },

    // 数据库配置
    database: {
        path: process.env.DB_PATH || './data/inkflow.db'
    },

    // 管理员配置
    admin: {
        username: process.env.ADMIN_USERNAME || 'admin',
        password: process.env.ADMIN_PASSWORD || 'admin123'
    },

    // 日志配置
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    }
};

/**
 * 验证配置
 */
function validateConfig() {
    const errors = [];

    // 验证 API Keys
    if (!config.apiKeys.gemini) {
        errors.push('缺少 GEMINI_API_KEYS 环境变量');
    }

    if (errors.length > 0) {
        console.error('配置验证失败:');
        errors.forEach(err => console.error(`  - ${err}`));
        return false;
    }

    return true;
}

/**
 * 打印配置信息（脱敏）
 */
function printConfig() {
    console.log('='.repeat(60));
    console.log('服务器配置:');
    console.log(`  端口: ${config.server.port}`);
    console.log(`  环境: ${config.server.env}`);
    console.log(`  最大并发任务: ${config.tasks.maxConcurrent}`);
    console.log(`  任务超时: ${config.tasks.timeout}ms`);

    const keyCount = config.apiKeys.gemini.split(',').filter(k => k.trim()).length;
    console.log(`  Gemini API Keys: ${keyCount} 个`);
    console.log('='.repeat(60));
}

module.exports = {
    config,
    validateConfig,
    printConfig
};
