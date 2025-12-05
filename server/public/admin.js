// InkFlow Backend Admin Panel JavaScript
const API_BASE = window.location.origin;

// 翻译
const translations = {
    zh: {
        serverRunning: '服务器运行中',
        backendMonitor: '后端监控',
        apiKeys: 'API Keys',
        autoRefresh: '自动刷新 (5秒)',
        recentTasks: '最近任务',
        type: '类型',
        status: '状态',
        created: '创建时间',
        duration: '耗时',
        actions: '操作',
        apiKeyManagement: 'API Key 管理',
        addKeyPlaceholder: '输入新的 Gemini API Key...',
        addKey: '添加 Key',
        keyStatus: '状态',
        usage: '使用次数',
        failures: '失败次数',
        lastUsed: '最后使用',
        keyActions: '操作',
        rotationTitle: '关于 API Key 轮换',
        rotationDesc: '系统使用最近最少使用 (LRU) 策略自动在激活的 Key 之间轮换。如果某个 Key 失败次数过多，将被自动禁用。您可以在此手动重新激活。',
        queueLength: '队列长度',
        runningTasks: '运行中任务',
        completedToday: '今日完成',
        failedToday: '今日失败',
        viewLogs: '查看日志',
        cancelTask: '取消任务',
        noTasks: '无任务记录',
        active: '激活',
        disabled: '已禁用',
        never: '从未使用',
        reactivate: '重新激活',
        removeKey: '删除 Key',
        noKeys: '无 API Key 记录',
        confirmCancel: '确定要取消此任务吗？',
        confirmDelete: '确定要删除此 API Key 吗？',
        taskLogs: '任务日志',
        noLogs: '无日志记录'
    },
    en: {
        serverRunning: 'Server Running',
        backendMonitor: 'Backend Monitor',
        apiKeys: 'API Keys',
        autoRefresh: 'Auto Refresh (5s)',
        recentTasks: 'Recent Tasks',
        type: 'Type',
        status: 'Status',
        created: 'Created At',
        duration: 'Duration',
        actions: 'Actions',
        apiKeyManagement: 'API Key Management',
        addKeyPlaceholder: 'Enter new Gemini API Key...',
        addKey: 'Add Key',
        keyStatus: 'Status',
        usage: 'Usage Count',
        failures: 'Failures',
        lastUsed: 'Last Used',
        keyActions: 'Actions',
        rotationTitle: 'About API Key Rotation',
        rotationDesc: 'The system automatically rotates between active keys using a Least Recently Used (LRU) strategy. If a key fails too many times, it will be automatically disabled. You can manually reactivate it here.',
        queueLength: 'Queue Length',
        runningTasks: 'Running Tasks',
        completedToday: 'Completed Today',
        failedToday: 'Failed Today',
        viewLogs: 'View Logs',
        cancelTask: 'Cancel Task',
        noTasks: 'No tasks found',
        active: 'Active',
        disabled: 'Disabled',
        never: 'Never',
        reactivate: 'Reactivate',
        removeKey: 'Remove Key',
        noKeys: 'No API keys found',
        confirmCancel: 'Are you sure you want to cancel this task?',
        confirmDelete: 'Are you sure you want to remove this API key?',
        taskLogs: 'Task Logs',
        noLogs: 'No logs available'
    }
};

let currentLang = 'zh';
let autoRefreshInterval = null;

// 翻译函数
function t(key) {
    return translations[currentLang][key] || key;
}

// 更新界面语言
function updateLanguage() {
    document.getElementById('statusText').textContent = t('serverRunning');
    document.getElementById('tabMonitor').textContent = t('backendMonitor');
    document.getElementById('tabApiKeys').textContent = t('apiKeys');
    document.getElementById('autoRefreshText').textContent = t('autoRefresh');
    document.getElementById('monitorTitle').textContent = t('backendMonitor');
    document.getElementById('recentTasksTitle').textContent = t('recentTasks');
    document.getElementById('thType').textContent = t('type');
    document.getElementById('thStatus').textContent = t('status');
    document.getElementById('thCreated').textContent = t('created');
    document.getElementById('thDuration').textContent = t('duration');
    document.getElementById('thActions').textContent = t('actions');

    document.getElementById('apiKeysTitle').textContent = t('apiKeyManagement');
    document.getElementById('newKeyInput').placeholder = t('addKeyPlaceholder');
    document.getElementById('addKeyText').textContent = t('addKey');
    document.getElementById('thKeyStatus').textContent = t('keyStatus');
    document.getElementById('thUsage').textContent = t('usage');
    document.getElementById('thFailures').textContent = t('failures');
    document.getElementById('thLastUsed').textContent = t('lastUsed');
    document.getElementById('thKeyActions').textContent = t('keyActions');
    document.getElementById('rotationTitle').textContent = t('rotationTitle');
    document.getElementById('rotationDesc').textContent = t('rotationDesc');
    document.getElementById('logsModalTitle').textContent = t('taskLogs');
}

// Tab 切换
document.querySelectorAll('.tab-button').forEach(btn => {
    btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // 更新按钮状态
        document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // 显示对应内容
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(`content-${tab}`).classList.remove('hidden');

        // 加载数据
        if (tab === 'monitor') {
            loadMonitorData();
        } else if (tab === 'apikeys') {
            loadApiKeys();
        }
    });
});

// 语言切换
document.getElementById('langSelect').addEventListener('change', (e) => {
    currentLang = e.target.value;
    updateLanguage();
    // 重新加载当前标签页的数据以更新翻译
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'monitor') {
        loadMonitorData();
    } else if (activeTab === 'apikeys') {
        loadApiKeys();
    }
});

// 加载监控数据
async function loadMonitorData() {
    try {
        const [statsRes, queueRes, tasksRes] = await Promise.all([
            fetch(`${API_BASE}/api/tasks/stats`),
            fetch(`${API_BASE}/api/tasks/queue/status`),
            fetch(`${API_BASE}/api/tasks?limit=20`)
        ]);

        const stats = await statsRes.json();
        const queue = await queueRes.json();
        const tasks = await tasksRes.json();

        // 更新统计卡片
        document.getElementById('statsCards').innerHTML = `
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-sm text-gray-500 mb-1">${t('queueLength')}</div>
                <div class="text-2xl font-bold text-gray-800">${queue.data.queueLength || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-sm text-gray-500 mb-1">${t('runningTasks')}</div>
                <div class="text-2xl font-bold text-blue-600">${queue.data.runningCount || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-sm text-gray-500 mb-1">${t('completedToday')}</div>
                <div class="text-2xl font-bold text-green-600">${stats.data.completed || 0}</div>
            </div>
            <div class="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div class="text-sm text-gray-500 mb-1">${t('failedToday')}</div>
                <div class="text-2xl font-bold text-red-600">${stats.data.failed || 0}</div>
            </div>
        `;

        // 更新任务表格
        const tbody = document.getElementById('tasksTableBody');
        if (tasks.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">${t('noTasks')}</td></tr>`;
        } else {
            tbody.innerHTML = tasks.data.map(task => `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 font-mono text-xs text-gray-500">${task.id.slice(0, 8)}...</td>
                    <td class="p-3 font-medium text-gray-700">${task.type}</td>
                    <td class="p-3">
                        <span class="px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}">
                            ${task.status}
                        </span>
                    </td>
                    <td class="p-3 text-gray-500">${new Date(task.createdAt).toLocaleTimeString()}</td>
                    <td class="p-3 text-gray-500">
                        ${task.startTime && task.endTime
                    ? `${((new Date(task.endTime) - new Date(task.startTime)) / 1000).toFixed(1)}s`
                    : '-'}
                    </td>
                    <td class="p-3 flex gap-2">
                        <button onclick="viewLogs('${task.id}')" class="text-gray-600 hover:bg-gray-100 p-1 rounded" title="${t('viewLogs')}">
                            📄
                        </button>
                        ${task.status === 'pending' || task.status === 'running'
                    ? `<button onclick="cancelTask('${task.id}')" class="text-red-600 hover:bg-red-50 p-1 rounded" title="${t('cancelTask')}">❌</button>`
                    : ''}
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load monitor data:', error);
    }
}

// 加载 API Keys
async function loadApiKeys() {
    try {
        const res = await fetch(`${API_BASE}/api/admin/api-keys`);
        const data = await res.json();

        // 后端返回格式: { success: true, data: { keys: [...], totalCount: n, activeCount: n } }
        const keys = data.data?.keys || [];

        const tbody = document.getElementById('keysTableBody');
        if (keys.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="p-8 text-center text-gray-400">${t('noKeys')}</td></tr>`;
        } else {
            tbody.innerHTML = keys.map(key => `
                <tr class="hover:bg-gray-50">
                    <td class="p-3 font-mono text-xs text-gray-500">${key.keyId}</td>
                    <td class="p-3">
                        <div class="flex items-center gap-1.5">
                            ${key.isActive ? '✅' : '❌'}
                            <span class="text-xs font-bold ${key.isActive ? 'text-green-600' : 'text-red-600'}">
                                ${key.isActive ? t('active') : t('disabled')}
                            </span>
                        </div>
                    </td>
                    <td class="p-3 text-gray-700 font-medium">${key.totalUsage}</td>
                    <td class="p-3">
                        <span class="${key.failCount > 0 ? 'text-red-600 font-bold' : 'text-gray-500'}">
                            ${key.failCount}
                        </span>
                    </td>
                    <td class="p-3 text-gray-500">
                        ${key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : t('never')}
                    </td>
                    <td class="p-3 flex gap-2">
                        ${!key.isActive
                    ? `<button onclick="reactivateKey('${key.keyId}')" class="text-green-600 hover:bg-green-50 px-2 py-1 rounded text-xs font-bold">
                                🔄 ${t('reactivate')}
                            </button>`
                    : ''}
                        <button onclick="deleteKey('${key.keyId}')" class="text-red-600 hover:bg-red-50 p-1 rounded" title="${t('removeKey')}">
                            🗑️
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Failed to load API keys:', error);
    }
}

// 状态颜色
function getStatusColor(status) {
    switch (status) {
        case 'completed': return 'text-green-600 bg-green-50';
        case 'failed': return 'text-red-600 bg-red-50';
        case 'running': return 'text-blue-600 bg-blue-50';
        case 'pending': return 'text-amber-600 bg-amber-50';
        default: return 'text-gray-600 bg-gray-50';
    }
}

// 查看日志
async function viewLogs(taskId) {
    try {
        document.getElementById('currentTaskId').textContent = taskId;
        const res = await fetch(`${API_BASE}/api/tasks/${taskId}/logs`);
        const data = await res.json();

        const logsContent = document.getElementById('logsContent');
        if (data.data.length === 0) {
            logsContent.innerHTML = `<div class="text-center text-gray-400 py-8">${t('noLogs')}</div>`;
        } else {
            logsContent.innerHTML = data.data.map(log => `
                <div class="mb-2 border-b border-gray-100 pb-1 last:border-0">
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-gray-400">[${new Date(log.createdAt).toLocaleTimeString()}]</span>
                        <span class="px-1.5 py-0.5 rounded font-bold ${log.level === 'ERROR' ? 'text-red-600 bg-red-50' :
                    log.level === 'WARN' ? 'text-amber-600 bg-amber-50' :
                        'text-blue-600 bg-blue-50'
                }">
                            ${log.level}
                        </span>
                    </div>
                    <div class="text-gray-700 pl-2 break-all whitespace-pre-wrap">${log.message}</div>
                </div>
            `).join('');
        }

        document.getElementById('logsModal').classList.remove('hidden');
    } catch (error) {
        console.error('Failed to load logs:', error);
    }
}

// 取消任务
async function cancelTask(taskId) {
    if (!confirm(t('confirmCancel'))) return;

    try {
        await fetch(`${API_BASE}/api/tasks/${taskId}`, { method: 'DELETE' });
        loadMonitorData();
    } catch (error) {
        console.error('Failed to cancel task:', error);
        alert('Failed to cancel task');
    }
}

// 添加 API Key
document.getElementById('addKeyBtn').addEventListener('click', async () => {
    const input = document.getElementById('newKeyInput');
    const key = input.value.trim();

    if (!key) return;

    try {
        await fetch(`${API_BASE}/api/admin/api-keys`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key })
        });

        input.value = '';
        loadApiKeys();
    } catch (error) {
        console.error('Failed to add API key:', error);
        alert('Failed to add API key');
    }
});

// 重新激活 Key
async function reactivateKey(keyId) {
    try {
        await fetch(`${API_BASE}/api/admin/api-keys/${keyId}/reactivate`, {
            method: 'PUT'
        });
        loadApiKeys();
    } catch (error) {
        console.error('Failed to reactivate key:', error);
        alert('Failed to reactivate key');
    }
}

// 删除 Key
async function deleteKey(keyId) {
    if (!confirm(t('confirmDelete'))) return;

    try {
        await fetch(`${API_BASE}/api/admin/api-keys/${keyId}`, {
            method: 'DELETE'
        });
        loadApiKeys();
    } catch (error) {
        console.error('Failed to delete key:', error);
        alert('Failed to delete key');
    }
}

// 关闭日志模态框
document.getElementById('closeLogsModal').addEventListener('click', () => {
    document.getElementById('logsModal').classList.add('hidden');
});

// 刷新按钮
document.getElementById('refreshBtn').addEventListener('click', () => {
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'monitor') {
        loadMonitorData();
    } else if (activeTab === 'apikeys') {
        loadApiKeys();
    }
});

// 自动刷新
document.getElementById('autoRefresh').addEventListener('change', (e) => {
    if (e.target.checked) {
        autoRefreshInterval = setInterval(() => {
            const activeTab = document.querySelector('.tab-button.active').dataset.tab;
            if (activeTab === 'monitor') {
                loadMonitorData();
            }
        }, 5000);
    } else {
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
});

// 初始化
updateLanguage();
loadMonitorData();

// 启动自动刷新
autoRefreshInterval = setInterval(() => {
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    if (activeTab === 'monitor' && document.getElementById('autoRefresh').checked) {
        loadMonitorData();
    }
}, 5000);
