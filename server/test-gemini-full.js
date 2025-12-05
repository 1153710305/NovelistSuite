/**
 * @file server/test-gemini-full.js
 * @description 测试 GeminiService 的完整生成功能（Mock 模式）
 */

const geminiService = require('./src/services/GeminiService');

// Mock generateContent 方法
geminiService.generateContent = async (apiKey, model, prompt, config) => {
    console.log('\n[Mock Gemini API Call]');
    console.log(`Model: ${model}`);
    console.log(`Config: ${JSON.stringify(config)}`);
    console.log(`Prompt Preview: ${prompt.substring(0, 100)}...`);

    // 返回模拟数据
    if (prompt.includes('每日灵感')) {
        return {
            text: JSON.stringify([{
                title: "模拟灵感",
                synopsis: "这是一个模拟的灵感...",
                metadata: {
                    source: "Mock",
                    gender: "male",
                    majorCategory: "玄幻",
                    coolPoint: "模拟爽点",
                    burstPoint: "模拟爆点",
                    memoryAnchor: "模拟记忆点",
                    trope: "模拟梗",
                    goldenFinger: "模拟金手指"
                }
            }]),
            metrics: { tokens: 100 }
        };
    } else if (prompt.includes('章节正文')) {
        return {
            text: "这是模拟生成的章节正文内容...",
            metrics: { tokens: 200 }
        };
    } else if (prompt.includes('基础架构')) {
        return {
            text: JSON.stringify({
                worldview: "模拟世界观",
                protagonist: { name: "模拟主角" }
            }),
            metrics: { tokens: 150 }
        };
    }

    return { text: "Unknown prompt", metrics: {} };
};

async function test() {
    try {
        console.log('=== 测试完整生成功能 ===');

        // 1. 测试每日灵感
        console.log('\n1. 测试 generateDailyStories...');
        const stories = await geminiService.generateDailyStories('mock-key', {
            trendFocus: '赛博修仙',
            targetAudience: 'male',
            lang: 'zh'
        });
        console.log('   结果:', JSON.stringify(stories, null, 2));

        // 2. 测试小说架构
        console.log('\n2. 测试 generateNovelArchitecture...');
        const architecture = await geminiService.generateNovelArchitecture('mock-key', {
            idea: '赛博朋克世界的修仙者',
            lang: 'zh'
        });
        console.log('   结果:', JSON.stringify(architecture, null, 2));

        // 3. 测试章节内容
        console.log('\n3. 测试 generateChapterContent...');
        const chapter = await geminiService.generateChapterContent('mock-key', {
            title: '第一章 觉醒',
            outline: '主角在垃圾场醒来，发现自己拥有了系统。',
            wordCount: 2000,
            lang: 'zh'
        });
        console.log('   结果:', JSON.stringify(chapter, null, 2));

        console.log('\n=== 测试完成 ===');

    } catch (error) {
        console.error('❌ 测试失败:', error);
    }
}

test();
