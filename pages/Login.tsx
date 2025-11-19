
import React from 'react';
import { Feather, User, Shield } from 'lucide-react';
import { useI18n } from '../i18n';

interface LoginProps {
    onLogin: (role: 'user' | 'admin') => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const { t } = useI18n();

    return (
        <div className="h-screen w-full bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-w-4xl w-full flex flex-col md:flex-row">
                {/* Left Banner */}
                <div className="w-full md:w-1/2 bg-gradient-to-br from-teal-600 to-slate-800 p-10 flex flex-col justify-between text-white">
                    <div>
                        <div className="flex items-center gap-3 mb-6">
                            <Feather size={32} />
                            <h1 className="text-2xl font-bold">{t('app.title')}</h1>
                        </div>
                        <p className="text-teal-100 leading-relaxed opacity-90">
                            {t('onboarding.steps.welcome.desc')}
                        </p>
                    </div>
                    <div className="text-xs text-teal-200 mt-10">
                        v1.2.0 • Powered by Gemini 2.5 & 3.0
                    </div>
                </div>

                {/* Right Content */}
                <div className="w-full md:w-1/2 p-10 flex flex-col justify-center bg-white">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">{t('login.title')}</h2>
                    <p className="text-slate-500 mb-8">{t('login.subtitle')}</p>

                    <div className="space-y-4">
                        <button 
                            onClick={() => onLogin('user')}
                            className="w-full p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group flex items-center gap-4 text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-teal-200 flex items-center justify-center text-slate-600 group-hover:text-teal-800 transition-colors">
                                <User size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 group-hover:text-teal-900">{t('login.userBtn')}</h3>
                                <p className="text-sm text-slate-500">{t('login.userDesc')}</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => onLogin('admin')}
                            className="w-full p-4 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-50 transition-all group flex items-center gap-4 text-left"
                        >
                            <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-slate-200 flex items-center justify-center text-slate-600 group-hover:text-slate-900 transition-colors">
                                <Shield size={24} />
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800">{t('login.adminBtn')}</h3>
                                <p className="text-sm text-slate-500">{t('login.adminDesc')}</p>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
