"use client";

type Props = {
  currentStep: number;
  totalSteps?: number;
};

export function WizardProgress({ currentStep, totalSteps = 6 }: Props) {
  return (
    <div className="md:hidden" aria-label={`Step ${currentStep} of ${totalSteps}`}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = i + 1;
          const isComplete = step < currentStep;
          const isCurrent = step === currentStep;
          return (
            <div
              key={step}
              className={`h-1.5 flex-1 rounded-none transition-colors ${
                isCurrent
                  ? "bg-[#fbbf24]"
                  : isComplete
                    ? "bg-[#fbbf24]/40"
                    : "bg-[#2a2a38]"
              }`}
              aria-hidden
            />
          );
        })}
      </div>
    </div>
  );
}
