/**
 * @file server/src/routes/admin.js
 * @description 管理员路由
 */

const express = require('express');
const router = express.Router();
const apiKeyManager = require('../services/ApiKeyManager');

/**
 * GET /admin/api-keys
 * 获取所有 API Key 的统计信息
 */
router.get('/api-keys', (req, res) => {
    try {
        const stats = apiKeyManager.getStats();
        res.json({
            success: true,
            data: {
                keys: stats,
                totalCount: apiKeyManager.getKeyCount(),
                activeCount: apiKeyManager.getActiveKeyCount()
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
 * POST /admin/api-keys
 * 添加新的 API Key
 */
router.post('/api-keys', (req, res) => {
    try {
        const { key } = req.body;

        if (!key) {
            return res.status(400).json({
                success: false,
                error: '缺少 key 参数'
            });
        }

        const result = apiKeyManager.addKey(key);

        if (result) {
            res.json({
                success: true,
                message: 'API Key 添加成功'
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'API Key 已存在或无效'
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
 * DELETE /admin/api-keys/:keyId
 * 删除 API Key
 */
router.delete('/api-keys/:keyId', (req, res) => {
    try {
        const { keyId } = req.params;
        const result = apiKeyManager.removeKey(keyId);

        if (result) {
            res.json({
                success: true,
                message: 'API Key 删除成功'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'API Key 不存在'
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
 * PUT /admin/api-keys/:keyId/reactivate
 * 重新启用 API Key
 */
router.put('/api-keys/:keyId/reactivate', (req, res) => {
    try {
        const { keyId } = req.params;
        apiKeyManager.reactivateKey(keyId);

        res.json({
            success: true,
            message: 'API Key 已重新启用'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * PUT /admin/api-keys/:keyId
 * 更新 API Key 信息（别名、标签、优先级）
 */
router.put('/api-keys/:keyId', (req, res) => {
    try {
        const { keyId } = req.params;
        const { alias, tags, priority } = req.body;

        const updates = {};
        if (alias !== undefined) updates.alias = alias;
        if (tags !== undefined) updates.tags = tags;
        if (priority !== undefined) updates.priority = priority;

        const result = apiKeyManager.updateKeyInfo(keyId, updates);

        if (result) {
            res.json({
                success: true,
                message: 'API Key 信息更新成功'
            });
        } else {
            res.status(404).json({
                success: false,
                error: 'API Key 不存在'
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
 * GET /admin/api-keys/test/:keyId
 * 测试 API Key 选择
 */
router.get('/api-keys/test', (req, res) => {
    try {
        const { keyId, key } = apiKeyManager.getNextKey();

        res.json({
            success: true,
            data: {
                selectedKeyId: keyId,
                selectedKey: key.substring(0, 10) + '...' + key.substring(key.length - 4)
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
 * POST /admin/test-model
 * 测试指定模型
 */
router.post('/test-model', async (req, res) => {
    const { model } = req.body;
    const geminiService = require('../services/GeminiService');

    try {
        const { key } = apiKeyManager.getNextKey();
        const startTime = Date.now();

        // 发送简单请求
        const result = await geminiService.generateContent(
            key,
            model,
            "Hello, reply with 'OK'.",
            { maxOutputTokens: 10 }
        );

        const latency = Date.now() - startTime;

        res.json({
            success: true,
            data: {
                model,
                latency,
                response: result.text,
                status: 'healthy'
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            data: {
                model,
                status: 'unhealthy'
            }
        });
    }
});

module.exports = router;
