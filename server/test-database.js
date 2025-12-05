/**
 * @file server/test-database.js
 * @description 测试数据库模型
 */

const { initDatabase, TaskModel, TaskLogModel, TaskStatus, TaskType, LogLevel } = require('./src/models');

console.log('\n=== 数据库模型测试 ===\n');

async function test() {
    try {
        // 1. 初始化数据库
        console.log('1. 初始化数据库...');
        await initDatabase();
        console.log('✅ 数据库初始化成功\n');

        // 2. 测试创建任务
        console.log('2. 测试创建任务...');
        const task1 = await TaskModel.create({
            type: TaskType.DAILY_STORIES,
            payload: { trendFocus: '修仙', audience: 'male' }
        });
        console.log(`✅ 创建任务: ${task1.id}`);
        console.log(`   类型: ${task1.type}`);
        console.log(`   状态: ${task1.status}\n`);

        const task2 = await TaskModel.create({
            type: TaskType.CHAPTER_CONTENT,
            payload: { chapterTitle: '第一章' }
        });
        console.log(`✅ 创建任务: ${task2.id}\n`);

        // 3. 测试查询任务
        console.log('3. 测试查询任务...');
        const foundTask = await TaskModel.findById(task1.id);
        console.log(`✅ 查找任务: ${foundTask.id}`);
        console.log(`   找到: ${foundTask ? '是' : '否'}\n`);

        // 4. 测试更新任务状态
        console.log('4. 测试更新任务状态...');
        await TaskModel.updateStatus(task1.id, TaskStatus.RUNNING);
        const updatedTask = await TaskModel.findById(task1.id);
        console.log(`✅ 状态更新: ${updatedTask.status}`);
        console.log(`   开始时间: ${updatedTask.startTime}\n`);

        // 5. 测试更新进度
        console.log('5. 测试更新任务进度...');
        await TaskModel.updateProgress(task1.id, 50);
        const progressTask = await TaskModel.findById(task1.id);
        console.log(`✅ 进度: ${progressTask.progress}%\n`);

        // 6. 测试创建日志
        console.log('6. 测试创建任务日志...');
        await TaskLogModel.create({
            taskId: task1.id,
            level: LogLevel.INFO,
            message: '任务开始执行...'
        });
        await TaskLogModel.create({
            taskId: task1.id,
            level: LogLevel.WARN,
            message: '警告：Token 使用较多'
        });
        await TaskLogModel.create({
            taskId: task1.id,
            level: LogLevel.INFO,
            message: '任务执行完成'
        });
        console.log(`✅ 创建了 3 条日志\n`);

        // 7. 测试查询日志
        console.log('7. 测试查询任务日志...');
        const logs = await TaskLogModel.findByTaskId(task1.id);
        console.log(`✅ 找到 ${logs.length} 条日志:`);
        logs.forEach(log => {
            console.log(`   [${log.level.toUpperCase()}] ${log.message}`);
        });
        console.log();

        // 8. 测试查询所有任务
        console.log('8. 测试查询所有任务...');
        const allTasks = await TaskModel.findAll();
        console.log(`✅ 找到 ${allTasks.length} 个任务\n`);

        // 9. 测试过滤查询
        console.log('9. 测试过滤查询...');
        const runningTasks = await TaskModel.findAll({ status: TaskStatus.RUNNING });
        console.log(`✅ 运行中的任务: ${runningTasks.length} 个\n`);

        // 10. 测试统计信息
        console.log('10. 测试获取统计信息...');
        const taskStats = await TaskModel.getStats();
        console.log('✅ 任务统计:');
        console.log(`   总数: ${taskStats.total}`);
        console.log(`   待处理: ${taskStats.pending}`);
        console.log(`   运行中: ${taskStats.running}`);
        console.log(`   已完成: ${taskStats.completed}`);
        console.log(`   失败: ${taskStats.failed}\n`);

        const logStats = await TaskLogModel.getStats();
        console.log('✅ 日志统计:');
        console.log(`   总数: ${logStats.total}`);
        console.log(`   INFO: ${logStats.info}`);
        console.log(`   WARN: ${logStats.warn}`);
        console.log(`   ERROR: ${logStats.error}\n`);

        // 11. 测试完成任务
        console.log('11. 测试完成任务...');
        await TaskModel.updateStatus(task1.id, TaskStatus.COMPLETED, {
            result: { content: '生成的故事内容...' }
        });
        const completedTask = await TaskModel.findById(task1.id);
        console.log(`✅ 任务状态: ${completedTask.status}`);
        console.log(`   结束时间: ${completedTask.endTime}\n`);

        // 12. 测试删除
        console.log('12. 测试删除任务和日志...');
        await TaskModel.delete(task2.id);
        console.log(`✅ 删除任务: ${task2.id}\n`);

        console.log('=== 所有测试通过 ===\n');

    } catch (error) {
        console.error('❌ 测试失败:', error);
        process.exit(1);
    }
}

test();
