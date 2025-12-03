/**
 * @file components/ModelHealthChecker.tsx
 * @description 模型健康检测组件 - 允许用户手动测试各个模型的可用性和网络延迟
 */

import React, { useState } from 'react';
import { Activity, CheckCircle, XCircle, Clock, Zap, AlertTriangle, RefreshCw, Play, Info } from 'lucide-react';
import { AVAILABLE_MODELS, ModelConfig } from '../types';
import { testModelHealth, testAllModels, getLatencyLevel, ModelHealthResult } from '../services/modelHealthService';
import { useI18n } from '../i18n';

interface ModelHealthCheckerProps {
    apiKey: string; // Gemini API Key
    onClose?: () => void; // 关闭回调
}

/**
 * 模型健康检测组件
 */
export const ModelHealthChecker: React.FC<ModelHealthCheckerProps> = ({ apiKey, onClose }) => {
    const { t } = useI18n();
    const [results, setResults] = useState<Record<string, ModelHealthResult>>({});
    const [testing, setTesting] = useState<string | null>(null); // 当前正在测试的模型ID
    const [testingAll, setTestingAll] = useState(false); // 是否正在批量测试
    const [progress, setProgress] = useState({ current: 0, total: 0 });

    /**
     * 测试单个模型
     */
    const handleTestModel = async (modelId: string) => {
        setTesting(modelId);

        // 设置为测试中状态
        setResults(prev => ({
            ...prev,
            [modelId]: {
                modelId,
                status: 'testing',
                timestamp: Date.now()
            }
        }));

        const result = await testModelHealth(modelId, apiKey);

        setResults(prev => ({
            ...prev,
            [modelId]: result
        }));

        setTesting(null);
    };

    /**
     * 测试所有模型
     */
    const handleTestAll = async () => {
        setTestingAll(true);
        setProgress({ current: 0, total: AVAILABLE_MODELS.length });

        const modelIds = AVAILABLE_MODELS.map(m => m.id);

        const allResults = await testAllModels(
            modelIds,
            apiKey,
            (current, total, modelId) => {
                setProgress({ current, total });
                setTesting(modelId);
            }
        );

        // 将结果转换为 Record 格式
        const resultsMap: Record<string, ModelHealthResult> = {};
        allResults.forEach(result => {
            resultsMap[result.modelId] = result;
        });

        setResults(resultsMap);
        setTestingAll(false);
        setTesting(null);
    };

    /**
     * 渲染状态图标
     */
    const renderStatusIcon = (result?: ModelHealthResult) => {
        if (!result) {
            return <Activity size={16} className="text-slate-400" />;
        }

        switch (result.status) {
            case 'testing':
                return <RefreshCw size={16} className="text-blue-500 animate-spin" />;
            case 'healthy':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'unhealthy':
                return <XCircle size={16} className="text-red-500" />;
            case 'unknown':
                return <AlertTriangle size={16} className="text-yellow-500" />;
            default:
                return <Activity size={16} className="text-slate-400" />;
        }
    };

    /**
     * 渲染延迟信息
     */
    const renderLatency = (result?: ModelHealthResult) => {
        if (!result || !result.latency) {
            return <span className="text-slate-400 text-xs">-</span>;
        }

        const { label, color } = getLatencyLevel(result.latency);

        return (
            <div className="flex items-center gap-1">
                <Clock size={12} className={color} />
                <span className={`text-xs font-mono ${color}`}>
                    {result.latency}ms
                </span>
                <span className={`text-xs ${color}`}>({label})</span>
            </div>
        );
    };

    /**
     * 按提供商分组模型
     */
    const groupedModels = AVAILABLE_MODELS.reduce((acc, model) => {
        let provider = 'Google Gemini';
        if (model.id.startsWith('qwen-')) {
            provider = '阿里千问';
        } else if (model.id.startsWith('doubao-')) {
            provider = '字节豆包';
        }

        if (!acc[provider]) {
            acc[provider] = [];
        }
        acc[provider].push(model);
        return acc;
    }, {} as Record<string, ModelConfig[]>);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* 头部 */}
                <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-blue-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                                <Zap size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">模型健康检测</h2>
                                <p className="text-sm text-slate-600">测试各个 AI 模型的可用性和网络延迟</p>
                            </div>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* 操作栏 */}
                <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Info size={14} />
                        <span>点击"测试"按钮检测单个模型,或点击"全部测试"批量检测</span>
                    </div>
                    <button
                        onClick={handleTestAll}
                        disabled={testingAll}
                        className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                    >
                        {testingAll ? (
                            <>
                                <RefreshCw size={16} className="animate-spin" />
                                <span>测试中 ({progress.current}/{progress.total})</span>
                            </>
                        ) : (
                            <>
                                <Play size={16} />
                                <span>全部测试</span>
                            </>
                        )}
                    </button>
                </div>

                {/* 模型列表 */}
                <div className="flex-1 overflow-y-auto p-6">
                    {Object.entries(groupedModels).map(([provider, models]) => (
                        <div key={provider} className="mb-6 last:mb-0">
                            <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <div className="w-1 h-4 bg-teal-500 rounded"></div>
                                {provider}
                            </h3>
                            <div className="space-y-2">
                                {models.map(model => {
                                    const result = results[model.id];
                                    const isTesting = testing === model.id;

                                    return (
                                        <div
                                            key={model.id}
                                            className="bg-slate-50 border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {renderStatusIcon(result)}
                                                        <span className="font-bold text-slate-800">
                                                            {t(model.nameKey)}
                                                        </span>
                                                        <span className="text-xs text-slate-500 font-mono">
                                                            {model.id}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-slate-600 mb-2">
                                                        {t(model.descKey)}
                                                    </p>

                                                    {/* 结果信息 */}
                                                    <div className="flex items-center gap-4 text-xs">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-slate-500">延迟:</span>
                                                            {renderLatency(result)}
                                                        </div>
                                                        {result?.error && (
                                                            <div className="flex items-center gap-1 text-red-600">
                                                                <AlertTriangle size={12} />
                                                                <span>{result.error}</span>
                                                            </div>
                                                        )}
                                                        {result?.responsePreview && (
                                                            <div className="flex items-center gap-1 text-green-600">
                                                                <CheckCircle size={12} />
                                                                <span className="truncate max-w-xs">
                                                                    {result.responsePreview}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* 测试按钮 */}
                                                <button
                                                    onClick={() => handleTestModel(model.id)}
                                                    disabled={isTesting || testingAll}
                                                    className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded hover:bg-slate-50 disabled:bg-slate-100 disabled:cursor-not-allowed flex items-center gap-1 transition-colors text-sm"
                                                >
                                                    {isTesting ? (
                                                        <>
                                                            <RefreshCw size={14} className="animate-spin" />
                                                            <span>测试中</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play size={14} />
                                                            <span>测试</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 底部统计 */}
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                        <span>
                            共 {AVAILABLE_MODELS.length} 个模型 •
                            已测试 {Object.keys(results).length} 个
                        </span>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <CheckCircle size={12} className="text-green-500" />
                                <span>
                                    健康: {Object.values(results).filter(r => r.status === 'healthy').length}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <XCircle size={12} className="text-red-500" />
                                <span>
                                    异常: {Object.values(results).filter(r => r.status === 'unhealthy').length}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
