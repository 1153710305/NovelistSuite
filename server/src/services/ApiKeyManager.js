/**
 * @file server/src/services/ApiKeyManager.js
 * @description API Key 管理器
 * 
 * 功能：
 * - 管理多个 API Key 池
 * - 实现"距离上次使用时间最远"的选择策略
 * - 追踪每个 Key 的使用情况
 * - 支持失败时自动切换
 */

class ApiKeyManager {
    constructor() {
        // API Key 池
        this.keys = [];

        // 每个 Key 的使用记录
        // { keyId, key, lastUsedAt, totalUsage, failCount, isActive }
        this.keyStats = new Map();
    }

    /**
     * 初始化 API Keys
     * @param {string|string[]} keys - API Key 或 Key 数组
     */
    initialize(keys) {
        // 支持逗号分隔的字符串或数组
        const keyArray = Array.isArray(keys)
            ? keys
            : keys.split(',').map(k => k.trim()).filter(k => k);

        if (keyArray.length === 0) {
            throw new Error('至少需要提供一个有效的 API Key');
        }

        this.keys = keyArray;

        // 初始化统计信息
        keyArray.forEach((key, index) => {
            const keyId = `key_${index + 1}`;
            this.keyStats.set(keyId, {
                keyId,
                key,
                lastUsedAt: null,
                totalUsage: 0,
                failCount: 0,
                isActive: true
            });
        });

        console.log(`[ApiKeyManager] 初始化完成，共 ${this.keys.length} 个 API Keys`);
    }

    /**
     * 获取下一个可用的 API Key
     * 策略：选择距离上次使用时间最远的 Key
     * @returns {{ keyId: string, key: string }}
     */
    getNextKey() {
        const activeKeys = Array.from(this.keyStats.values()).filter(k => k.isActive);

        if (activeKeys.length === 0) {
            throw new Error('没有可用的 API Key');
        }

        // 找出上次使用时间最久远的 Key
        let selectedKey = null;
        let oldestTime = Date.now();

        for (const keyInfo of activeKeys) {
            const lastUsed = keyInfo.lastUsedAt || 0;
            if (lastUsed < oldestTime) {
                oldestTime = lastUsed;
                selectedKey = keyInfo;
            }
        }

        if (!selectedKey) {
            // 如果所有 Key 都没用过，选第一个
            selectedKey = activeKeys[0];
        }

        console.log(`[ApiKeyManager] 选择 Key: ${selectedKey.keyId} (上次使用: ${selectedKey.lastUsedAt ? new Date(selectedKey.lastUsedAt).toISOString() : '从未使用'})`);

        return {
            keyId: selectedKey.keyId,
            key: selectedKey.key
        };
    }

    /**
     * 标记 Key 使用成功
     * @param {string} keyId - Key ID
     */
    markSuccess(keyId) {
        const keyInfo = this.keyStats.get(keyId);
        if (keyInfo) {
            keyInfo.lastUsedAt = Date.now();
            keyInfo.totalUsage++;
            console.log(`[ApiKeyManager] ${keyId} 使用成功 (总使用次数: ${keyInfo.totalUsage})`);
        }
    }

    /**
     * 标记 Key 使用失败
     * @param {string} keyId - Key ID
     * @param {string} reason - 失败原因
     */
    markFailure(keyId, reason) {
        const keyInfo = this.keyStats.get(keyId);
        if (keyInfo) {
            keyInfo.failCount++;
            console.warn(`[ApiKeyManager] ${keyId} 使用失败 (失败次数: ${keyInfo.failCount}): ${reason}`);

            // 如果连续失败超过5次，暂时禁用该 Key
            if (keyInfo.failCount >= 5) {
                keyInfo.isActive = false;
                console.error(`[ApiKeyManager] ${keyId} 已被禁用（失败次数过多）`);
            }
        }
    }

    /**
     * 重新启用某个 Key
     * @param {string} keyId - Key ID
     */
    reactivateKey(keyId) {
        const keyInfo = this.keyStats.get(keyId);
        if (keyInfo) {
            keyInfo.isActive = true;
            keyInfo.failCount = 0;
            console.log(`[ApiKeyManager] ${keyId} 已重新启用`);
        }
    }

    /**
     * 获取所有 Key 的统计信息
     * @returns {Array}
     */
    getStats() {
        return Array.from(this.keyStats.values()).map(k => ({
            keyId: k.keyId,
            key: k.key.substring(0, 10) + '...' + k.key.substring(k.key.length - 4), // 脱敏
            lastUsedAt: k.lastUsedAt,
            totalUsage: k.totalUsage,
            failCount: k.failCount,
            isActive: k.isActive
        }));
    }

    /**
     * 添加新的 API Key
     * @param {string} key - API Key
     */
    addKey(key) {
        if (!key || this.keys.includes(key)) {
            return false;
        }

        this.keys.push(key);
        const keyId = `key_${this.keys.length}`;

        this.keyStats.set(keyId, {
            keyId,
            key,
            lastUsedAt: null,
            totalUsage: 0,
            failCount: 0,
            isActive: true
        });

        console.log(`[ApiKeyManager] 添加新 Key: ${keyId}`);
        return true;
    }

    /**
     * 删除 API Key
     * @param {string} keyId - Key ID
     */
    removeKey(keyId) {
        const keyInfo = this.keyStats.get(keyId);
        if (!keyInfo) {
            return false;
        }

        const index = this.keys.indexOf(keyInfo.key);
        if (index > -1) {
            this.keys.splice(index, 1);
        }

        this.keyStats.delete(keyId);
        console.log(`[ApiKeyManager] 删除 Key: ${keyId}`);
        return true;
    }

    /**
     * 获取 Key 总数
     */
    getKeyCount() {
        return this.keys.length;
    }

    /**
     * 获取活跃 Key 数量
     */
    getActiveKeyCount() {
        return Array.from(this.keyStats.values()).filter(k => k.isActive).length;
    }
}

// 导出单例
module.exports = new ApiKeyManager();
