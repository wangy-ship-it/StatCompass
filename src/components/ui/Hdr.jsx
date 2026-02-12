export default function Hdr({ sub, children }) {
  return (
    <div className="mb-8">
      <div className="text-[11px] text-[var(--color-accent-faint)] uppercase tracking-[0.15em] font-medium">{sub}</div>
      <div className="text-[32px] font-semibold text-[var(--color-text-primary)] mt-1 leading-tight tracking-tight">{children}</div>
    </div>
  );
}
