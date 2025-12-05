/**
 * @file server/test-api-key-manager.js
 * @description 测试 API Key Manager
 */

// 临时设置环境变量
process.env.GEMINI_API_KEYS = 'test-key-1,test-key-2,test-key-3';

const apiKeyManager = require('./src/services/ApiKeyManager');

console.log('\n=== API Key Manager 测试 ===\n');

// 1. 初始化测试
console.log('1. 初始化 API Key Manager...');
try {
    apiKeyManager.initialize(process.env.GEMINI_API_KEYS);
    console.log('✅ 初始化成功\n');
} catch (error) {
    console.error('❌ 初始化失败:', error.message);
    process.exit(1);
}

// 2. 获取统计信息
console.log('2. 获取初始统计信息...');
const initialStats = apiKeyManager.getStats();
console.log('Keys:', initialStats);
console.log(`总数: ${apiKeyManager.getKeyCount()}, 活跃: ${apiKeyManager.getActiveKeyCount()}\n`);

// 3. 测试选择策略
console.log('3. 测试"距离上次使用时间最远"的选择策略...');

// 第一次选择
let selected1 = apiKeyManager.getNextKey();
console.log(`选择: ${selected1.keyId}`);
apiKeyManager.markSuccess(selected1.keyId);

// 等待1秒
setTimeout(() => {
    // 第二次选择
    let selected2 = apiKeyManager.getNextKey();
    console.log(`选择: ${selected2.keyId}`);
    apiKeyManager.markSuccess(selected2.keyId);

    setTimeout(() => {
        // 第三次选择（应该选择第一个，因为它最久）
        let selected3 = apiKeyManager.getNextKey();
        console.log(`选择: ${selected3.keyId} (应该是 key_1，因为它使用时间最早)`);
        apiKeyManager.markSuccess(selected3.keyId);

        console.log('\n4. 查看使用后的统计信息...');
        const stats = apiKeyManager.getStats();
        stats.forEach(k => {
            console.log(`${k.keyId}: 使用 ${k.totalUsage} 次, ${k.isActive ? '活跃' : '禁用'}`);
        });

        // 5. 测试失败标记
        console.log('\n5. 测试失败标记和自动禁用...');
        for (let i = 0; i < 6; i++) {
            apiKeyManager.markFailure('key_1', '模拟失败');
        }

        console.log('失败6次后的状态:');
        const failedStats = apiKeyManager.getStats();
        const key1 = failedStats.find(k => k.keyId === 'key_1');
        console.log(`key_1: ${key1.isActive ? '活跃' : '已禁用'} (失败次数: ${key1.failCount})`);

        // 6. 测试重新启用
        console.log('\n6. 测试重新启用...');
        apiKeyManager.reactivateKey('key_1');
        const reactivatedStats = apiKeyManager.getStats();
        const key1After = reactivatedStats.find(k => k.keyId === 'key_1');
        console.log(`key_1: ${key1After.isActive ? '活跃' : '已禁用'} (失败次数: ${key1After.failCount})`);

        console.log('\n=== 测试完成 ===\n');
    }, 1000);
}, 1000);
