interface StepIndicatorProps {
  currentStep: number;
  labels: string[];
}

export function StepIndicator({ currentStep, labels }: StepIndicatorProps) {
  return (
    <ol className="step-indicator" aria-label="Progress">
      {labels.map((label, index) => {
        const state =
          index < currentStep ? "done" : index === currentStep ? "current" : "future";
        return (
          <li
            key={label}
            className={`step-indicator__item step-indicator__item--${state}`}
          >
            <span className="step-indicator__dot" />
            <span className="step-indicator__label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
