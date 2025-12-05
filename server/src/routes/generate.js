/**
 * @file server/src/routes/generate.js
 * @description AI生成路由
 */

const express = require('express');
const router = express.Router();
const taskQueue = require('../services/TaskQueue');
const { TaskType } = require('../models');

/**
 * POST /generate/daily-stories
 * 生成每日灵感
 */
router.post('/daily-stories', async (req, res) => {
    try {
        const { trendFocus, targetAudience } = req.body;

        if (!trendFocus) {
            return res.status(400).json({
                success: false,
                error: '缺少 trendFocus 参数'
            });
        }

        const task = await taskQueue.addTask({
            type: TaskType.DAILY_STORIES,
            payload: {
                trendFocus,
                targetAudience: targetAudience || 'male'
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/novel-architecture
 * 生成小说架构
 */
router.post('/novel-architecture', async (req, res) => {
    try {
        const { idea } = req.body;

        if (!idea) {
            return res.status(400).json({
                success: false,
                error: '缺少 idea 参数'
            });
        }

        const task = await taskQueue.addTask({
            type: TaskType.NOVEL_ARCHITECTURE,
            payload: { idea }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/chapter-content
 * 生成章节内容
 */
router.post('/chapter-content', async (req, res) => {
    try {
        const { title, outline, wordCount } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: '缺少 title 参数'
            });
        }

        const task = await taskQueue.addTask({
            type: TaskType.CHAPTER_CONTENT,
            payload: {
                title,
                outline,
                wordCount: wordCount || 2000
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/regenerate-map
 * 重绘思维导图
 */
router.post('/regenerate-map', async (req, res) => {
    try {
        const { mapType, idea, context, style, requirements, lang, model } = req.body;

        const task = await taskQueue.addTask({
            type: TaskType.REGENERATE_MAP,
            payload: {
                mapType,
                idea,
                context,
                style,
                requirements,
                lang,
                model
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/expand-node
 * 扩展节点
 */
router.post('/expand-node', async (req, res) => {
    try {
        const { node, context, style, lang, model } = req.body;

        const task = await taskQueue.addTask({
            type: TaskType.EXPAND_NODE,
            payload: {
                node,
                context,
                style,
                lang,
                model
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/manipulate-text
 * 文本工具 (润色/续写)
 */
router.post('/manipulate-text', async (req, res) => {
    try {
        const { text, mode, lang, model } = req.body;

        const task = await taskQueue.addTask({
            type: TaskType.MANIPULATE_TEXT,
            payload: {
                text,
                mode,
                lang,
                model
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/rewrite-chapter
 * 章节重写
 */
router.post('/rewrite-chapter', async (req, res) => {
    try {
        const { content, context, style, lang, model } = req.body;

        const task = await taskQueue.addTask({
            type: TaskType.REWRITE_CHAPTER,
            payload: {
                content,
                context,
                style,
                lang,
                model
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
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
 * POST /generate/analyze-trend
 * 趋势分析
 */
router.post('/analyze-trend', async (req, res) => {
    try {
        const { sources, lang, model } = req.body;

        const task = await taskQueue.addTask({
            type: TaskType.ANALYZE_TREND,
            payload: {
                sources,
                lang,
                model
            }
        });

        res.json({
            success: true,
            message: '任务已创建',
            data: {
                taskId: task.id,
                status: task.status
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
