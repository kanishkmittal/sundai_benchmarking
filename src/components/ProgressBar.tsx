interface ProgressBarProps {
  label: string;
  value: number;
}

export function ProgressBar({ label, value }: ProgressBarProps) {
  const normalized = Math.max(0, Math.min(100, value));

  return (
    <div className="progress" aria-label={label}>
      <div className="progress__meta">
        <span>{label}</span>
        <span>{normalized}%</span>
      </div>
      <div className="progress__track">
        <div className="progress__fill" style={{ width: `${normalized}%` }} />
      </div>
    </div>
  );
}
