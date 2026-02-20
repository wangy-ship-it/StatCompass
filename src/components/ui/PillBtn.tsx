import type { ReactNode } from 'react';

interface PillBtnProps {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}

export default function PillBtn({ on, onClick, children }: PillBtnProps) {
  return (
    <button
      onClick={onClick}
      className={
        'py-2 px-4 rounded-lg text-[13px] font-medium cursor-pointer whitespace-nowrap transition-all duration-200 min-h-[36px] ' +
        (on
          ? 'backdrop-blur-sm bg-app-card text-[var(--color-text-primary)] ring-1 ring-[var(--color-border)]'
          : 'text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-app-glass ring-1 ring-[var(--color-border-subtle)]')
      }
    >
      {children}
    </button>
  );
}
