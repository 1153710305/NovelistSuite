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

module.exports = router;
