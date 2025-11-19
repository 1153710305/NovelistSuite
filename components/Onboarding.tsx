
import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../i18n';
import { X, ChevronRight, Star } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const { t } = useI18n();
  const [targetRect, setTargetRect] = useState<{top: number, left: number, width: number, height: number} | null>(null);

  const steps = [
    { id: 'welcome', target: null },
    { id: 'dashboard', target: 'nav-dashboard' },
    { id: 'market', target: 'nav-market' },
    { id: 'analysis', target: 'nav-analysis' },
    { id: 'writing', target: 'nav-writing' },
    { id: 'architect', target: 'nav-architect' },
    { id: 'settings', target: 'nav-settings' },
  ];

  useEffect(() => {
    const updatePosition = () => {
        const targetId = steps[step].target;
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) {
            const rect = el.getBoundingClientRect();
            setTargetRect({
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height
            });
            return;
          }
        }
        setTargetRect(null);
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [step]);

  const currentStepData = steps[step];
  const title = t(`onboarding.steps.${currentStepData.id}.title`);
  const desc = t(`onboarding.steps.${currentStepData.id}.desc`);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  // Calculate position for the explanation card
  const cardStyle: React.CSSProperties = targetRect 
    ? {
        top: targetRect.top,
        left: targetRect.left + targetRect.width + 20,
        transform: 'translateY(0)',
      }
    : {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      
      {/* Spotlight Layer using huge box-shadow */}
      {targetRect ? (
         <div 
            className="absolute transition-all duration-500 ease-in-out rounded-lg pointer-events-none box-content"
            style={{
                top: targetRect.top - 4, // Padding
                left: targetRect.left - 4,
                width: targetRect.width + 8,
                height: targetRect.height + 8,
                boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.75), 0 0 15px rgba(20, 184, 166, 0.5)' // Dark overlay + Teal Glow
            }}
         />
      ) : (
          // Full backdrop for welcome screen
          <div className="absolute inset-0 bg-slate-950/80 transition-all duration-500"></div>
      )}

      {/* Content Card */}
      <div 
        className="absolute transition-all duration-500 ease-in-out flex flex-col bg-white p-6 rounded-xl shadow-2xl border border-slate-100 max-w-md w-full animate-in fade-in zoom-in-95 duration-300"
        style={cardStyle}
      >
        {/* Decorative Icon for Welcome */}
        {step === 0 && (
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-teal-500 text-white p-3 rounded-full shadow-lg border-4 border-slate-800">
                <Star size={24} fill="currentColor" />
            </div>
        )}

        {/* Arrow pointing to sidebar (only if target exists) */}
        {targetRect && (
            <div className="absolute top-6 -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-slate-100"></div>
        )}

        <div className="flex justify-between items-start mb-4 mt-2">
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
            <button onClick={onComplete} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
            </button>
        </div>
        
        <p className="text-slate-600 mb-8 leading-relaxed text-sm">
            {desc}
        </p>

        <div className="flex justify-between items-center mt-auto">
            <div className="flex gap-1.5">
                {steps.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === step ? 'w-6 bg-teal-500' : 'w-1.5 bg-slate-200'}`}
                    ></div>
                ))}
            </div>
            <div className="flex gap-3">
                <button onClick={onComplete} className="text-sm text-slate-500 hover:text-slate-800 font-medium px-3 py-2">
                    {t('onboarding.skip')}
                </button>
                <button 
                    onClick={handleNext} 
                    className="text-sm bg-slate-900 text-white px-5 py-2 rounded-lg hover:bg-slate-800 font-medium flex items-center gap-1 shadow-lg shadow-slate-900/20"
                >
                    {step === steps.length - 1 ? t('onboarding.finish') : t('onboarding.next')}
                    {step !== steps.length - 1 && <ChevronRight size={14} />}
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};
