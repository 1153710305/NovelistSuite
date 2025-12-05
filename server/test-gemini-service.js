/**
 * @file server/test-gemini-service.js
 * @description 测试增强版 GeminiService
 */

const geminiService = require('./src/services/GeminiService');
const { cleanJson, retryWithBackoff } = require('./src/utils/aiUtils');

// 模拟 API Key
const API_KEY = process.env.GEMINI_API_KEYS?.split(',')[0] || 'test-key';

console.log('\n=== GeminiService 增强版测试 ===\n');

async function test() {
    try {
        // 1. 测试 cleanJson
        console.log('1. 测试 cleanJson...');
        const rawJson = '```json\n{"key": "value"}\n```';
        const cleaned = cleanJson(rawJson);
        console.log(`   原始: ${JSON.stringify(rawJson)}`);
        console.log(`   清洗: ${JSON.stringify(cleaned)}`);
        if (cleaned === '{"key": "value"}') {
            console.log('✅ cleanJson 测试通过\n');
        } else {
            console.error('❌ cleanJson 测试失败\n');
        }

        // 2. 测试 retryWithBackoff
        console.log('2. 测试 retryWithBackoff...');
        let attempts = 0;
        const failingFunc = async () => {
            attempts++;
            console.log(`   尝试第 ${attempts} 次...`);
            if (attempts < 3) {
                throw new Error('模拟失败');
            }
            return '成功';
        };

        const result = await retryWithBackoff(failingFunc, 3, 100);
        console.log(`   结果: ${result}`);
        if (result === '成功' && attempts === 3) {
            console.log('✅ retryWithBackoff 测试通过\n');
        } else {
            console.error('❌ retryWithBackoff 测试失败\n');
        }

        // 3. 测试 generateContent (如果有真实 Key)
        if (API_KEY !== 'test-key') {
            console.log('3. 测试 generateContent (真实调用)...');
            const genResult = await geminiService.generateContent(
                API_KEY,
                'gemini-2.0-flash-exp',
                'Say hello in JSON format: {"message": "hello"}',
                { jsonMode: true }
            );
            console.log('   生成结果:', genResult.text);
            console.log('   Metrics:', genResult.metrics);

            try {
                JSON.parse(genResult.text);
                console.log('✅ generateContent JSON模式测试通过\n');
            } catch (e) {
                console.error('❌ generateContent JSON模式测试失败\n');
            }
        } else {
            console.log('⚠️ 跳过真实 API 调用测试 (无 API Key)\n');
        }

        console.log('=== 所有测试完成 ===\n');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

test();
