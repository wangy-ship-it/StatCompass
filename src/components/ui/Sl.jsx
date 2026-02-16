import { colors } from '../../styles/theme';

export default function Sl({ label, value, min, max, step, onChange, fmt, color }) {
  const c = color || colors.indigo;
  const displayValue = fmt ? fmt(value) : String(value);
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-[var(--svg-text-faint)]">{label}</span>
        <span className="text-[13px] font-mono font-medium transition-all duration-200" style={{ color: c }}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ '--thumb-color': c }}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      />
    </div>
  );
}
