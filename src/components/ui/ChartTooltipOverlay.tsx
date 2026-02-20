import type { TooltipData } from '../../hooks/useChartTooltip';

interface ChartTooltipOverlayProps {
  tip: TooltipData | null;
  h?: number;
  w?: number;
}

export default function ChartTooltipOverlay({ tip, h, w }: ChartTooltipOverlayProps) {
  if (!tip) return null;

  const { x, lines, markers } = tip;
  const boxW = 140;
  const lineH = 16;
  const padX = 8;
  const padY = 6;
  const boxH = padY * 2 + lines.length * lineH;

  const boxX = x + 12 + boxW > (w || 600) ? x - boxW - 12 : x + 12;
  const boxY = Math.max(4, Math.min((tip.y || 40) - boxH / 2, (h || 260) - boxH - 4));

  return (
    <g className="pointer-events-none">
      <line
        x1={x}
        y1={0}
        x2={x}
        y2={h || 260}
        stroke="var(--svg-text-faint)"
        strokeWidth={0.75}
        strokeDasharray="3,3"
        opacity={0.5}
      />

      {markers &&
        markers.map((m, i) => (
          <circle
            key={i}
            cx={x}
            cy={m.y}
            r={4}
            fill={m.color}
            stroke="var(--color-app-bg)"
            strokeWidth={2}
          />
        ))}

      <rect
        x={boxX}
        y={boxY}
        width={boxW}
        height={boxH}
        rx={6}
        fill="var(--color-app-surface)"
        stroke="var(--color-border)"
        strokeWidth={0.75}
        opacity={0.95}
      />

      {lines.map((line, i) => (
        <g key={i}>
          <circle
            cx={boxX + padX + 4}
            cy={boxY + padY + i * lineH + lineH / 2}
            r={3}
            fill={line.color}
          />
          <text
            x={boxX + padX + 12}
            y={boxY + padY + i * lineH + lineH / 2 + 3.5}
            fill="var(--svg-text-faint)"
            fontSize={10}
            style={{ paintOrder: 'normal', stroke: 'none' }}
          >
            {line.label}
          </text>
          <text
            x={boxX + boxW - padX}
            y={boxY + padY + i * lineH + lineH / 2 + 3.5}
            fill="var(--svg-text)"
            fontSize={10}
            fontWeight="600"
            textAnchor="end"
            style={{ paintOrder: 'normal', stroke: 'none' }}
          >
            {line.value}
          </text>
        </g>
      ))}
    </g>
  );
}
