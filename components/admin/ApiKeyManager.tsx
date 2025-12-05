import React, { useState, useEffect } from 'react';
import { BackendAPI } from '../../services/backendApi';
import { Key, Plus, Trash2, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export const ApiKeyManager: React.FC = () => {
    const [keys, setKeys] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [newKey, setNewKey] = useState('');
    const [adding, setAdding] = useState(false);

    const fetchKeys = async () => {
        setLoading(true);
        try {
            const res = await BackendAPI.admin.getApiKeys();
            setKeys(res.data);
        } catch (error) {
            console.error('Failed to fetch API keys:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchKeys();
    }, []);

    const handleAddKey = async () => {
        if (!newKey.trim()) return;
        setAdding(true);
        try {
            await BackendAPI.admin.addApiKey(newKey.trim());
            setNewKey('');
            fetchKeys();
        } catch (error) {
            alert('Failed to add API key');
        } finally {
            setAdding(false);
        }
    };

    const handleDeleteKey = async (keyId: string) => {
        if (confirm('Are you sure you want to remove this API key?')) {
            try {
                await BackendAPI.admin.deleteApiKey(keyId);
                fetchKeys();
            } catch (error) {
                alert('Failed to delete API key');
            }
        }
    };

    const handleReactivateKey = async (keyId: string) => {
        try {
            await BackendAPI.admin.reactivateApiKey(keyId);
            fetchKeys();
        } catch (error) {
            alert('Failed to reactivate API key');
        }
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Key className="text-teal-600" /> API Key Management
                </h2>
                <button
                    onClick={fetchKeys}
                    className={`p-2 rounded-lg hover:bg-slate-100 text-slate-500 ${loading ? 'animate-spin' : ''}`}
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            {/* Add Key Form */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-2">
                <input
                    type="text"
                    value={newKey}
                    onChange={e => setNewKey(e.target.value)}
                    placeholder="Enter new Gemini API Key..."
                    className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                />
                <button
                    onClick={handleAddKey}
                    disabled={!newKey || adding}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
                >
                    <Plus size={18} /> Add Key
                </button>
            </div>

            {/* Keys List */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr>
                                <th className="p-3 font-medium">Key ID</th>
                                <th className="p-3 font-medium">Status</th>
                                <th className="p-3 font-medium">Usage Count</th>
                                <th className="p-3 font-medium">Failures</th>
                                <th className="p-3 font-medium">Last Used</th>
                                <th className="p-3 font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {keys.map(key => (
                                <tr key={key.id} className="hover:bg-slate-50">
                                    <td className="p-3 font-mono text-xs text-slate-500">{key.id}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-1.5">
                                            {key.isActive ? (
                                                <CheckCircle size={14} className="text-green-500" />
                                            ) : (
                                                <XCircle size={14} className="text-red-500" />
                                            )}
                                            <span className={`text-xs font-bold ${key.isActive ? 'text-green-600' : 'text-red-600'}`}>
                                                {key.isActive ? 'Active' : 'Disabled'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-slate-700 font-medium">{key.usageCount}</td>
                                    <td className="p-3">
                                        <span className={`${key.failureCount > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                                            {key.failureCount}
                                        </span>
                                    </td>
                                    <td className="p-3 text-slate-500">
                                        {key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : 'Never'}
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        {!key.isActive && (
                                            <button
                                                onClick={() => handleReactivateKey(key.id)}
                                                className="text-green-600 hover:bg-green-50 p-1 rounded flex items-center gap-1 text-xs font-bold"
                                            >
                                                <RefreshCw size={14} /> Reactivate
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeleteKey(key.id)}
                                            className="text-red-600 hover:bg-red-50 p-1 rounded"
                                            title="Remove Key"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {keys.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">No API keys found</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 items-start">
                <AlertTriangle className="text-blue-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm text-blue-700">
                    <p className="font-bold mb-1">About API Key Rotation</p>
                    <p>The system automatically rotates between active keys using a Least Recently Used (LRU) strategy. If a key fails too many times, it will be automatically disabled. You can manually reactivate it here.</p>
                </div>
            </div>
        </div>
    );
};
