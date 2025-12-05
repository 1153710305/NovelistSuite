/**
 * @file server/src/routes/tasks.js
 * @description 任务管理路由
 */

const express = require('express');
const router = express.Router();
const taskQueue = require('../services/TaskQueue');
const notificationService = require('../services/NotificationService');
const { TaskModel, TaskLogModel } = require('../models');

// SSE 路由：实时任务更新
router.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    notificationService.addClient(res);
});

/**
 * POST /tasks
 * 创建新任务
 */
router.post('/', async (req, res) => {
    try {
        const { type, payload, priority } = req.body;

        if (!type) {
            return res.status(400).json({
                success: false,
                error: '缺少 type 参数'
            });
        }

        const task = await taskQueue.addTask({
            type,
            payload: payload || {},
            priority: priority || 0
        });

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks
 * 获取任务列表
 */
router.get('/', async (req, res) => {
    try {
        const { status, type, limit, offset } = req.query;

        const tasks = await TaskModel.findAll({
            status,
            type,
            limit: parseInt(limit) || 50,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: tasks
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks/stats
 * 获取任务统计
 */
router.get('/stats', async (req, res) => {
    try {
        const stats = await TaskModel.getStats();
        const queueStatus = taskQueue.getStatus();

        res.json({
            success: true,
            data: {
                ...stats,
                queue: queueStatus
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks/:id
 * 获取单个任务详情
 */
router.get('/:id', async (req, res) => {
    try {
        const task = await TaskModel.findById(req.params.id);

        if (!task) {
            return res.status(404).json({
                success: false,
                error: '任务不存在'
            });
        }

        res.json({
            success: true,
            data: task
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks/:id/logs
 * 获取任务日志
 */
router.get('/:id/logs', async (req, res) => {
    try {
        const { level, limit, offset } = req.query;

        const logs = await TaskLogModel.findByTaskId(req.params.id, {
            level,
            limit: parseInt(limit) || 100,
            offset: parseInt(offset) || 0
        });

        res.json({
            success: true,
            data: logs
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * DELETE /tasks/:id
 * 取消/删除任务
 */
router.delete('/:id', async (req, res) => {
    try {
        const taskId = req.params.id;

        // 尝试取消任务
        const cancelled = await taskQueue.cancelTask(taskId);

        if (!cancelled) {
            // 如果无法取消，尝试删除
            const deleted = await TaskModel.delete(taskId);

            if (deleted) {
                res.json({
                    success: true,
                    message: '任务已删除'
                });
            } else {
                res.status(404).json({
                    success: false,
                    error: '任务不存在或正在运行'
                });
            }
        } else {
            res.json({
                success: true,
                message: '任务已取消'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /tasks/queue/status
 * 获取队列状态
 */
router.get('/queue/status', (req, res) => {
    try {
        const status = taskQueue.getStatus();

        res.json({
            success: true,
            data: status
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /tasks/queue/config
 * 配置队列参数
 */
router.post('/queue/config', (req, res) => {
    try {
        const { maxConcurrent } = req.body;

        if (maxConcurrent !== undefined) {
            taskQueue.setMaxConcurrent(parseInt(maxConcurrent));
        }

        res.json({
            success: true,
            message: '配置已更新',
            data: taskQueue.getStatus()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
