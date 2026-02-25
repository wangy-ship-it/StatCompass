import { useState, useRef, useEffect, type CSSProperties } from 'react';
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
  const [localVal, setLocalVal] = useState(value);
  const active = useRef(false);

  // Sync prop → local state only when user is not actively interacting.
  // This prevents spring-animated values from fighting the user's drag.
  useEffect(() => {
    if (!active.current) {
      setLocalVal(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = +e.target.value;
    active.current = true;
    setLocalVal(v);
    onChange(v);
  };

  const handleEnd = () => {
    active.current = false;
  };

  const displayValue = fmt ? fmt(localVal) : String(localVal);
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1.5">
        <span className="text-[13px] text-[var(--svg-text-faint)]">{label}</span>
        <span className="text-[13px] font-mono font-medium" style={{ color: c }}>
          {displayValue}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={localVal}
        onChange={handleChange}
        onPointerDown={() => {
          active.current = true;
        }}
        onPointerUp={handleEnd}
        onLostPointerCapture={handleEnd}
        onKeyUp={handleEnd}
        onBlur={handleEnd}
        style={{ '--thumb-color': c } as CSSProperties}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={localVal}
        aria-valuetext={displayValue}
      />
    </div>
  );
}
