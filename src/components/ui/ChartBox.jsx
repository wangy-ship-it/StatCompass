import useChartTooltip from '../../hooks/useChartTooltip';
import ChartTooltipOverlay from './ChartTooltipOverlay';

export default function ChartBox({ children, h, label, tooltipLookup }) {
  const { svgRef, tip, onPointerMove, onPointerLeave } = useChartTooltip(tooltipLookup);
  return (
    <div className="backdrop-blur-xl bg-app-glass rounded-3xl p-4 sm:p-8 mb-8 ring-1 ring-[var(--color-border-subtle)]">
      <svg
        ref={tooltipLookup ? svgRef : undefined}
        viewBox={'0 0 600 ' + (h || 260)}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: h || 260, display: 'block', overflow: 'visible', touchAction: tooltipLookup ? 'none' : undefined }}
        role="img"
        aria-label={label || 'Interactive chart'}
        onPointerMove={tooltipLookup ? onPointerMove : undefined}
        onPointerLeave={tooltipLookup ? onPointerLeave : undefined}
      >
        <style>{`text { paint-order: stroke; stroke: var(--color-app-bg); stroke-width: 2.5px; stroke-linejoin: round; stroke-opacity: 0.85; }
@media (prefers-reduced-motion: no-preference) { line, circle, rect { transition: all 80ms ease-out; } }`}</style>
        {children}
        {tooltipLookup && <ChartTooltipOverlay tip={tip} h={h} />}
      </svg>
    </div>
  );
}
