export default function ChartBox({ children, h, label }) {
  return (
    <div className="backdrop-blur-xl bg-app-glass rounded-3xl p-4 sm:p-8 mb-8 ring-1 ring-[var(--color-border-subtle)]">
      <svg
        viewBox={'0 0 600 ' + (h || 260)}
        width="100%"
        preserveAspectRatio="xMidYMid meet"
        style={{ maxHeight: h || 260, display: 'block', overflow: 'visible' }}
        role="img"
        aria-label={label || 'Interactive chart'}
      >
        <style>{`text { paint-order: stroke; stroke: var(--color-app-bg); stroke-width: 2.5px; stroke-linejoin: round; stroke-opacity: 0.85; }`}</style>
        {children}
      </svg>
    </div>
  );
}
