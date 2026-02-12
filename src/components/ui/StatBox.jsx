export default function StatBox({ label, value, color }) {
  const c = color || '#818cf8';
  return (
    <div className="rounded-xl backdrop-blur-sm bg-app-glass ring-1 ring-[var(--color-border-subtle)] py-3.5 px-4 text-center flex-1 min-w-[85px] transition-all duration-300">
      <div className="text-[17px] font-bold font-mono transition-all duration-300" style={{ color: c }}>
        {value}
      </div>
      <div className="text-[11px] text-[var(--svg-text)] mt-1">{label}</div>
    </div>
  );
}
