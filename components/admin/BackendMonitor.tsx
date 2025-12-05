import React, { useState, useEffect } from 'react';
import { BackendAPI } from '../../services/backendApi';
import { Activity, Server, RefreshCw, Play, XCircle, Clock, CheckCircle, AlertCircle, FileText, X } from 'lucide-react';

export const BackendMonitor: React.FC = () => {
    const [stats, setStats] = useState<any>(null);
    const [queueStatus, setQueueStatus] = useState<any>(null);
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [selectedTaskLogs, setSelectedTaskLogs] = useState<any[]>([]);
    const [showLogModal, setShowLogModal] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [statsRes, queueRes, tasksRes] = await Promise.all([
                BackendAPI.tasks.stats(),
                BackendAPI.tasks.queueStatus(),
                BackendAPI.tasks.list({ limit: 20 })
            ]);

            setStats(statsRes.data);
            setQueueStatus(queueRes.data);
            setTasks(tasksRes.data);
        } catch (error) {
            console.error('Failed to fetch backend data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            if (autoRefresh) fetchData();
        }, 5000);
        return () => clearInterval(interval);
    }, [autoRefresh]);

    const handleCancelTask = async (taskId: string) => {
        if (confirm('Are you sure you want to cancel this task?')) {
            try {
                await BackendAPI.tasks.delete(taskId);
                fetchData();
            } catch (error) {
                alert('Failed to cancel task');
            }
        }
    };

    const handleViewLogs = async (taskId: string) => {
        setCurrentTaskId(taskId);
        setShowLogModal(true);
        // Don't set global loading, just maybe local or just wait
        try {
            const res = await BackendAPI.tasks.logs(taskId);
            setSelectedTaskLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
            setSelectedTaskLogs([]);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'text-green-600 bg-green-50';
            case 'failed': return 'text-red-600 bg-red-50';
            case 'running': return 'text-blue-600 bg-blue-50';
            case 'pending': return 'text-amber-600 bg-amber-50';
            default: return 'text-slate-600 bg-slate-50';
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Server className="text-teal-600" /> Backend Monitor
                </h2>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm text-slate-600">
                        <input
                            type="checkbox"
                            checked={autoRefresh}
                            onChange={e => setAutoRefresh(e.target.checked)}
                            className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        Auto Refresh (5s)
                    </label>
                    <button
                        onClick={fetchData}
                        className={`p-2 rounded-lg hover:bg-slate-100 text-slate-500 ${loading ? 'animate-spin' : ''}`}
                    >
                        <RefreshCw size={20} />
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Queue Length</div>
                    <div className="text-2xl font-bold text-slate-800">{queueStatus?.queueLength || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Running Tasks</div>
                    <div className="text-2xl font-bold text-blue-600">{queueStatus?.runningCount || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Completed Today</div>
                    <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-sm text-slate-500 mb-1">Failed Today</div>
                    <div className="text-2xl font-bold text-red-600">{stats?.failed || 0}</div>
                </div>
            </div>

            {/* Task List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-200 font-bold text-slate-700">Recent Tasks</div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3 font-medium">ID</th>
                                <th className="p-3 font-medium">Type</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Created At</th>
                                <th className="p-3 font-medium">Duration</th>
                                <th className="p-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {tasks.map(task => (
                                <tr key={task.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-xs text-slate-500">{task.id.slice(0, 8)}...</td>
                                    <td className="p-3 font-medium text-slate-700">{task.type}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-500">{new Date(task.createdAt).toLocaleTimeString()}</td>
                                    <td className="p-3 text-slate-500">
                                        {task.startTime && task.endTime
                                            ? `${((new Date(task.endTime).getTime() - new Date(task.startTime).getTime()) / 1000).toFixed(1)}s`
                                            : '-'
                                        }
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button
                                            onClick={() => handleViewLogs(task.id)}
                                            className="text-slate-600 hover:bg-slate-100 p-1 rounded"
                                            title="View Logs"
                                        >
                                            <FileText size={16} />
                                        </button>
                                        {(task.status === 'pending' || task.status === 'running') && (
                                            <button
                                                onClick={() => handleCancelTask(task.id)}
                                                className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                title="Cancel Task"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {tasks.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">No tasks found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Logs Modal */}
            {showLogModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">Task Logs: <span className="font-mono text-sm text-slate-500">{currentTaskId}</span></h3>
                            <button onClick={() => setShowLogModal(false)} className="text-slate-500 hover:text-slate-800">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto flex-1 bg-slate-50 font-mono text-xs">
                            {selectedTaskLogs.length === 0 ? (
                                <div className="text-center text-slate-400 py-8">No logs available</div>
                            ) : (
                                selectedTaskLogs.map((log, i) => (
                                    <div key={i} className="mb-2 border-b border-slate-100 pb-1 last:border-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-slate-400">[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                                            <span className={`px-1.5 py-0.5 rounded font-bold ${log.level === 'ERROR' ? 'text-red-600 bg-red-50' :
                                                log.level === 'WARN' ? 'text-amber-600 bg-amber-50' :
                                                    'text-blue-600 bg-blue-50'
                                                }`}>
                                                {log.level}
                                            </span>
                                        </div>
                                        <div className="text-slate-700 pl-2 break-all whitespace-pre-wrap">{log.message}</div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
