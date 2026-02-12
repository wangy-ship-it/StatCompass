export default function ChartBox({ children, h }) {
  return (
    <div className="backdrop-blur-xl bg-app-glass rounded-3xl p-8 mb-8 ring-1 ring-[var(--color-border-subtle)]">
      <svg
        viewBox={'0 0 600 ' + (h || 260)}
        width="100%"
        style={{ maxHeight: h || 260, display: 'block', overflow: 'visible' }}
      >
        <style>{`text { paint-order: stroke; stroke: var(--color-app-bg); stroke-width: 2.5px; stroke-linejoin: round; stroke-opacity: 0.85; }`}</style>
        {children}
      </svg>
    </div>
  );
}
