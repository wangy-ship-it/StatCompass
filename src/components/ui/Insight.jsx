export default function Insight({ emoji, children }) {
  return (
    <div className="bg-[var(--color-accent-bg)] rounded-xl px-5 py-4 mt-5 text-[14px] text-[var(--color-accent)] leading-[1.7] ring-1 ring-[var(--color-accent-ring)]">
      <span className="font-medium text-[var(--color-accent-faint)] mr-1">{emoji || '💡'}</span>{' '}
      {children}
    </div>
  );
}
