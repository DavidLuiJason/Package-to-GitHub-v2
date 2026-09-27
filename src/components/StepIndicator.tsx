import React from 'react';
import { Archive, Eye, Settings, UploadCloud, CheckCircle } from 'lucide-react';

export type AppStep = 'input' | 'preview' | 'configure' | 'publishing' | 'verified';

interface StepIndicatorProps {
  currentStep: AppStep;
  onStepClick?: (step: AppStep) => void;
  canNavigateToPreview: boolean;
  canNavigateToConfigure: boolean;
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  onStepClick,
  canNavigateToPreview,
  canNavigateToConfigure,
}) => {
  const steps: Array<{
    id: AppStep;
    label: string;
    icon: React.ElementType;
    enabled: boolean;
  }> = [
    { id: 'input', label: '1. Select ZIP', icon: Archive, enabled: true },
    { id: 'preview', label: '2. Inspect & Preview', icon: Eye, enabled: canNavigateToPreview },
    { id: 'configure', label: '3. GitHub Setup', icon: Settings, enabled: canNavigateToConfigure },
    { id: 'publishing', label: '4. Publishing', icon: UploadCloud, enabled: currentStep === 'publishing' || currentStep === 'verified' },
    { id: 'verified', label: '5. Verified', icon: CheckCircle, enabled: currentStep === 'verified' },
  ];

  const getStepIndex = (stepId: AppStep) => steps.findIndex((s) => s.id === stepId);
  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full bg-slate-950/60 border-b border-slate-800/80 py-3 px-4 overflow-x-auto scrollbar-none">
      <div className="max-w-4xl mx-auto flex items-center justify-between min-w-[560px]">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isDone = currentIndex > idx;
          const isClickable = step.enabled && onStepClick && currentStep !== 'publishing';

          return (
            <React.Fragment key={step.id}>
              {idx > 0 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors duration-300 ${
                    idx <= currentIndex ? 'bg-indigo-500' : 'bg-slate-800'
                  }`}
                />
              )}
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                    : isDone
                    ? 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30 cursor-pointer'
                    : step.enabled
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 cursor-pointer'
                    : 'text-slate-600 cursor-not-allowed'
                }`}
              >
                <Icon
                  className={`w-3.5 h-3.5 ${
                    isActive
                      ? 'text-indigo-400'
                      : isDone
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }`}
                />
                <span>{step.label}</span>
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
