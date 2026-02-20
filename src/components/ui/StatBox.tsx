interface StatBoxProps {
  label: string;
  value: string | number;
  color?: string;
}

export default function StatBox({ label, value, color }: StatBoxProps) {
  const c = color || '#818cf8';
  return (
    <div
      className="rounded-xl backdrop-blur-sm bg-app-glass ring-1 ring-[var(--color-border-subtle)] py-3.5 px-4 text-center flex-1 min-w-[72px] sm:min-w-[85px] transition-all duration-300"
      role="status"
      aria-label={label + ': ' + value}
    >
      <div
        className="text-[15px] sm:text-[17px] font-bold font-mono transition-all duration-300"
        style={{ color: c }}
      >
        {value}
      </div>
      <div className="text-[10px] sm:text-[11px] text-[var(--svg-text)] mt-1">{label}</div>
    </div>
  );
}
