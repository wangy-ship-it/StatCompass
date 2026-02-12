import { colors } from '../../styles/theme';

export default function Sl({ label, value, min, max, step, onChange, fmt, color }) {
  const c = color || colors.indigo;
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-[var(--svg-text-faint)]">{label}</span>
        <span className="text-[13px] font-mono font-medium transition-all duration-200" style={{ color: c }}>
          {fmt ? fmt(value) : value}
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
      />
    </div>
  );
}
