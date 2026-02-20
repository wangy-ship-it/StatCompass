import { type CSSProperties } from 'react';
import { colors } from '../../styles/theme';

interface SlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  fmt?: (value: number) => string;
  color?: string;
}

export default function Sl({ label, value, min, max, step, onChange, fmt, color }: SlProps) {
  const c = color || colors.indigo;
  const displayValue = fmt ? fmt(value) : String(value);
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-[var(--svg-text-faint)]">{label}</span>
        <span
          className="text-[13px] font-mono font-medium transition-all duration-200"
          style={{ color: c }}
        >
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
        style={{ '--thumb-color': c } as CSSProperties}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={displayValue}
      />
    </div>
  );
}
