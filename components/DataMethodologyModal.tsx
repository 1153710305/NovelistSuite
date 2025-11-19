
import React from 'react';
import { X, Database, ShieldCheck, Network } from 'lucide-react';
import { useI18n } from '../i18n';

interface DataMethodologyModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const DataMethodologyModal: React.FC<DataMethodologyModalProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Database className="text-teal-600" size={20}/>
                        {t('dataDoc.title')}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="p-8 overflow-y-auto space-y-8">
                    
                    {/* Method */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                            <Network size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('dataDoc.method.title')}</h3>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                {t('dataDoc.method.desc')}
                            </p>
                        </div>
                    </div>

                    {/* Sources */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                            <Database size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('dataDoc.sources.title')}</h3>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                {t('dataDoc.sources.desc')}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {['douyin', 'fanqie', 'qidian', 'weibo', 'bilibili'].map(s => (
                                    <span key={s} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200">
                                        {t(`sources.${s}`)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Reliability */}
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-lg bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                            <ShieldCheck size={24} />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 mb-2">{t('dataDoc.reliability.title')}</h3>
                            <p className="text-slate-600 leading-relaxed text-sm">
                                {t('dataDoc.reliability.desc')}
                            </p>
                        </div>
                    </div>

                </div>

                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                    >
                        {t('onboarding.finish')}
                    </button>
                </div>
            </div>
        </div>
    );
};
