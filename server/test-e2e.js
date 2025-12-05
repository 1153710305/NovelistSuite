const BASE_URL = 'http://localhost:3001';

async function runE2ETest() {
    console.log('🚀 开始端到端集成测试...');
    console.log('-----------------------------------');

    try {
        // 1. 健康检查
        console.log('1️⃣  测试健康检查...');
        const healthRes = await fetch(`${BASE_URL}/health`);
        const healthData = await healthRes.json();
        console.log(`   Status: ${healthRes.status}, Data:`, healthData);
        if (healthData.status !== 'ok') throw new Error('Health check failed');

        // 2. 检查 API Key 配置
        console.log('\n2️⃣  检查 API Key...');
        const keysRes = await fetch(`${BASE_URL}/api/admin/api-keys`);
        const keysData = await keysRes.json();

        if (!keysData.success || !keysData.data) {
            throw new Error('Failed to fetch keys or invalid format');
        }

        console.log(`   Keys Count: ${keysData.data.totalCount}`);
        if (keysData.data.totalCount === 0) {
            console.warn('   ⚠️  警告: 没有配置 API Key，后续生成任务可能会失败。');
        }

        // 3. 提交文本处理任务
        console.log('\n3️⃣  提交文本处理任务 (Manipulate Text)...');
        const taskPayload = {
            text: '这是一个测试文本，用于验证端到端流程。',
            mode: 'polish',
            lang: 'zh',
            model: 'gemini-2.0-flash-exp'
        };

        const taskRes = await fetch(`${BASE_URL}/api/generate/manipulate-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(taskPayload)
        });
        const taskData = await taskRes.json();
        console.log(`   Task Created:`, taskData);

        if (!taskData.success) throw new Error('Task creation failed');
        const taskId = taskData.data.taskId;

        // 4. 轮询任务状态
        console.log(`\n4️⃣  轮询任务状态 (${taskId})...`);
        let status = 'pending';
        let attempts = 0;
        const maxAttempts = 10;

        while (['pending', 'running'].includes(status) && attempts < maxAttempts) {
            await new Promise(r => setTimeout(r, 2000)); // 等待 2 秒
            attempts++;

            const statusRes = await fetch(`${BASE_URL}/api/tasks/${taskId}`);
            const statusData = await statusRes.json();
            status = statusData.data.status;
            console.log(`   Attempt ${attempts}: Status = ${status}`);

            if (status === 'completed') {
                console.log('   ✅ 任务成功完成！');
                console.log('   Result:', statusData.data.result);
            } else if (status === 'failed') {
                console.log('   ❌ 任务失败 (预期内，如果 Key 无效)');
                console.log('   Error:', statusData.data.error);
            }
        }

        if (status === 'pending' || status === 'running') {
            console.log('   ⚠️  任务仍在运行或超时');
        }

        // 5. 验证任务日志
        console.log('\n5️⃣  验证任务日志...');
        const logsRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/logs`);
        const logsData = await logsRes.json();
        console.log(`   Logs count: ${logsData.data.length}`);
        if (logsData.data.length > 0) {
            console.log('   Latest log:', logsData.data[logsData.data.length - 1].message);
        }

        console.log('\n-----------------------------------');
        console.log('✅ 集成测试流程结束');

    } catch (error) {
        console.error('\n❌ 测试失败:', error);
        process.exit(1);
    }
}

runE2ETest();
