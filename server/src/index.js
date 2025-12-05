/**
 * @file server/src/index.js
 * @description InkFlow 后端服务器入口文件
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { config, validateConfig, printConfig } = require('./config');
const apiKeyManager = require('./services/ApiKeyManager');
const { initDatabase } = require('./models');

// 验证配置
if (!validateConfig()) {
    console.error('配置验证失败，服务器启动中止');
    process.exit(1);
}

// 初始化数据库
async function initialize() {
    try {
        // 初始化数据库
        await initDatabase();

        // 初始化 API Key Manager
        apiKeyManager.initialize(config.apiKeys.gemini);

        console.log('[Server] 初始化完成');
    } catch (error) {
        console.error('[Server] 初始化失败:', error.message);
        process.exit(1);
    }
}

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件配置
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// 请求日志中间件
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.path}`);
    next();
});

// 健康检查端点
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        service: 'InkFlow Server',
        version: '1.0.0',
        timestamp: new Date().toISOString()
    });
});

// API 路由
app.get('/api/info', (req, res) => {
    res.json({
        name: 'InkFlow API',
        version: '1.0.0',
        description: 'AI小说创作助手后端服务'
    });
});

// 静态文件服务（管理界面）
const path = require('path');
app.use(express.static(path.join(__dirname, '../public')));

// 管理界面路由
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// 任务路由
const tasksRoutes = require('./routes/tasks');
app.use('/api/tasks', tasksRoutes);

// AI生成路由
const generateRoutes = require('./routes/generate');
app.use('/api/generate', generateRoutes);

// 管理员路由
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
        error: {
            message: err.message || '服务器内部错误',
            status: err.status || 500
        }
    });
});

// 404 处理
app.use((req, res) => {
    res.status(404).json({
        error: {
            message: '接口不存在',
            path: req.path
        }
    });
});

// 启动服务器
async function startServer() {
    // 先初始化
    await initialize();

    // 再启动服务器
    app.listen(PORT, () => {
        console.log('='.repeat(60));
        console.log(`🚀 InkFlow Server 启动成功！`);
        console.log(`📍 服务地址: http://localhost:${PORT}`);
        console.log(`🏥 健康检查: http://localhost:${PORT}/health`);
        console.log(`📄 API信息: http://localhost:${PORT}/api/info`);
        console.log('='.repeat(60));
    });
}

// 启动
startServer().catch(error => {
    console.error('服务器启动失败:', error);
    process.exit(1);
});

module.exports = app;
