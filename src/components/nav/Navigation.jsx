import ThemeToggle from '../ui/ThemeToggle';

const sections = [
  {
    id: 's1',
    title: 'Foundations',
    desc: 'Understand the building blocks',
    modules: [
      { id: 'm3', label: 'Type I & II Errors' },
      { id: 'm4', label: 'P-Value & Significance' },
      { id: 'm5', label: 'Confidence Intervals' },
      { id: 'm13', label: 'Bayesian vs Frequentist' },
    ],
  },
  {
    id: 's2',
    title: 'Design',
    desc: 'Plan your experiment',
    modules: [
      { id: 'm1', label: 'Experiment Structure' },
      { id: 'm15', label: 'Metrics & Guardrails' },
      { id: 'm2', label: 'Sample Size & Power' },
      { id: 'm16', label: 'Effect Size & MDE' },
      { id: 'm22', label: 'Variance Reduction (CUPED)' },
    ],
  },
  {
    id: 's3',
    title: 'Validate & Run',
    desc: 'Execute with confidence',
    modules: [
      { id: 'm17', label: 'A/A Testing' },
      { id: 'm18', label: 'Sequential Testing' },
      { id: 'm9', label: 'Validity Threats' },
      { id: 'm24', label: 'Novelty & Time Effects' },
      { id: 'm25', label: 'Interaction Effects' },
    ],
  },
  {
    id: 's4',
    title: 'Analyze',
    desc: 'Crunch the numbers',
    modules: [
      { id: 'm12', label: 'Choosing the Right Test' },
      { id: 'm11', label: 'Multiple Testing' },
      { id: 'm7', label: 'Lift Calculator' },
      { id: 'm21', label: 'Practical vs Statistical Significance' },
    ],
  },
  {
    id: 's5',
    title: 'Interpret & Decide',
    desc: 'Make the call',
    modules: [
      { id: 'm8', label: 'Result Interpreter' },
      { id: 'm19', label: 'Heterogeneous Effects' },
      { id: 'm14', label: "Simpson's Paradox" },
      { id: 'm23', label: 'Regression to the Mean' },
    ],
  },
  {
    id: 's6',
    title: 'Model & Evaluate',
    desc: 'Beyond A/B testing',
    modules: [
      { id: 'm6', label: 'Model Metrics' },
      { id: 'm28', label: 'Calibration' },
      { id: 'm29', label: 'Cumulative Gains' },
      { id: 'm26', label: 'Feature Importance' },
      { id: 'm10', label: 'Bias-Variance Tradeoff' },
      { id: 'm20', label: 'Cross-Validation' },
      { id: 'm27', label: 'Model Drift & Monitoring' },
    ],
  },
];

export const allModules = sections.flatMap((s) => s.modules);

export default function Navigation({ active, setActive, onClose }) {
  const activeSection = sections.find((s) => s.modules.some((m) => m.id === active));

  return (
    <nav className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 pt-6 pb-5">
        <div className="text-[17px] font-semibold text-[var(--color-text-primary)] tracking-tight">StatCompass</div>
        <div className="text-[11px] text-[var(--svg-text-faint)] mt-0.5">Interactive Statistics Reference</div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-3">
        {sections.map((s) => (
          <div key={s.id} className="mb-5">
            <div className={
              'text-[12px] uppercase tracking-[0.12em] font-semibold px-2 mb-0.5 transition-colors duration-200 ' +
              (activeSection?.id === s.id ? 'text-[var(--color-accent)]' : 'text-[var(--svg-text-faint)]')
            }>
              {s.title}
            </div>
            <div className="text-[10px] text-[var(--color-text-muted)] px-2 mb-1.5">{s.desc}</div>
            {s.modules.map((m) => (
              <button
                key={m.id}
                onClick={() => { setActive(m.id); onClose?.(); }}
                className={
                  'w-full text-left px-3 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all duration-150 block ' +
                  (active === m.id
                    ? 'bg-[var(--color-sidebar-active)] text-[var(--color-text-primary)] font-medium ring-1 ring-indigo-400/20'
                    : 'text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)]')
                }
              >
                {m.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="px-3 pb-4 pt-1 border-t border-[var(--color-border-subtle)]">
        <ThemeToggle />
      </div>
    </nav>
  );
}
