/**
 * @file server/test-task-queue.js
 * @description 测试任务队列系统
 */

// 设置测试环境变量
process.env.GEMINI_API_KEYS = 'test-key-1,test-key-2,test-key-3';

const { initDatabase, TaskModel, TaskType } = require('./src/models');
const apiKeyManager = require('./src/services/ApiKeyManager');
const taskQueue = require('./src/services/TaskQueue');
const { config } = require('./src/config');

console.log('\n=== 任务队列系统测试 ===\n');

async function test() {
    try {
        // 1. 初始化
        console.log('1. 初始化...');
        await initDatabase();
        apiKeyManager.initialize(config.apiKeys.gemini);
        console.log('✅ 初始化成功\n');

        // 2. 测试添加任务
        console.log('2. 测试添加任务...');
        const task1 = await taskQueue.addTask({
            type: TaskType.DAILY_STORIES,
            payload: { trendFocus: '修仙' }
        });
        console.log(`✅ 任务1已添加: ${task1.id}`);

        const task2 = await taskQueue.addTask({
            type: TaskType.CHAPTER_CONTENT,
            payload: { title: '第一章' }
        });
        console.log(`✅ 任务2已添加: ${task2.id}`);

        const task3 = await taskQueue.addTask({
            type: TaskType.NOVEL_ARCHITECTURE,
            payload: { idea: '修仙世界' }
        });
        console.log(`✅ 任务3已添加: ${task3.id}\n`);

        // 3. 查看队列状态
        console.log('3. 查看队列状态...');
        await delay(1000);
        const status1 = taskQueue.getStatus();
        console.log(`✅ 队列长度: ${status1.queueLength}`);
        console.log(`   运行中: ${status1.runningCount}`);
        console.log(`   最大并发: ${status1.maxConcurrent}\n`);

        // 4. 等待任务执行
        console.log('4. 等待任务执行...');
        await delay(5000);

        // 5. 查看任务状态
        console.log('\n5. 查看任务状态...');
        const updatedTask1 = await TaskModel.findById(task1.id);
        const updatedTask2 = await TaskModel.findById(task2.id);
        const updatedTask3 = await TaskModel.findById(task3.id);

        console.log(`任务1: ${updatedTask1.status}`);
        console.log(`任务2: ${updatedTask2.status}`);
        console.log(`任务3: ${updatedTask3.status}\n`);

        // 6. 测试统计
        console.log('6. 测试任务统计...');
        const stats = await TaskModel.getStats();
        console.log('✅ 任务统计:');
        console.log(`   总数: ${stats.total}`);
        console.log(`   待处理: ${stats.pending}`);
        console.log(`   运行中: ${stats.running}`);
        console.log(`   已完成: ${stats.completed}`);
        console.log(`   失败: ${stats.failed}\n`);

        // 7. 测试并发控制
        console.log('7. 测试并发控制...');
        console.log(`   当前最大并发: ${taskQueue.maxConcurrent}`);

        taskQueue.setMaxConcurrent(5);
        console.log(`   新的最大并发: ${taskQueue.maxConcurrent}\n`);

        // 8. 测试取消任务
        console.log('8. 测试任务取消...');
        const task4 = await taskQueue.addTask({
            type: TaskType.DAILY_STORIES,
            payload: { test: 'cancel' }
        });
        console.log(`   创建任务4: ${task4.id}`);

        const cancelled = await taskQueue.cancelTask(task4.id);
        console.log(`   取消结果: ${cancelled ? '成功' : '失败'}`);

        const cancelledTask = await TaskModel.findById(task4.id);
        console.log(`   任务状态: ${cancelledTask.status}\n`);

        // 9. 查看 API Key 使用情况
        console.log('9. 查看 API Key 使用情况...');
        const keyStats = apiKeyManager.getStats();
        keyStats.forEach(stat => {
            console.log(`   ${stat.keyId}: 使用 ${stat.totalUsage} 次, ${stat.isActive ? '活跃' : '禁用'}`);
        });

        console.log('\n=== 所有测试完成 ===\n');

    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

test();
