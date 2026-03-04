interface SimControlsProps {
  running: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
  progress?: string;
}

export default function SimControls({
  running,
  onPlay,
  onPause,
  onStep,
  onReset,
  progress,
}: SimControlsProps) {
  return (
    <div className="flex gap-2 mb-6 items-center">
      <button
        onClick={running ? onPause : onPlay}
        className="py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] backdrop-blur-sm bg-app-card text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)] flex items-center gap-1.5"
        aria-label={running ? 'Pause simulation' : 'Play simulation'}
      >
        {running ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <rect x="3" y="2" width="4" height="12" rx="1" fill="currentColor" />
            <rect x="9" y="2" width="4" height="12" rx="1" fill="currentColor" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M4 2.5L13 8L4 13.5V2.5Z" fill="currentColor" />
          </svg>
        )}
        {running ? 'Pause' : 'Play'}
      </button>
      <button
        onClick={onStep}
        className="py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-app-glass ring-1 ring-[var(--color-border-subtle)] flex items-center gap-1.5"
        aria-label="Step one batch"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M3 2.5L9 8L3 13.5V2.5Z" fill="currentColor" />
          <rect x="11" y="2" width="2.5" height="12" rx="0.5" fill="currentColor" />
        </svg>
        Step
      </button>
      <button
        onClick={onReset}
        className="py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-app-glass ring-1 ring-[var(--color-border-subtle)] flex items-center gap-1.5"
        aria-label="Reset simulation"
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path
            d="M2 8a6 6 0 1 1 1.76 4.24"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M2 12.5V8.5H6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Reset
      </button>
      {progress && (
        <span className="text-[12px] text-[var(--svg-text-faint)] ml-2 tabular-nums">
          {progress}
        </span>
      )}
    </div>
  );
}
