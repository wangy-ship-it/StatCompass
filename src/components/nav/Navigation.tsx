import { useState } from 'react';
import ThemeToggle from '../ui/ThemeToggle';

export interface NavModule {
  id: string;
  label: string;
}

interface NavSection {
  id: string;
  title: string;
  desc: string;
  modules: NavModule[];
}

const sections: NavSection[] = [
  {
    id: 's1',
    title: 'Foundations',
    desc: 'Understand the building blocks',
    modules: [
      { id: 'm1', label: 'Type I & II Errors' },
      { id: 'm2', label: 'P-Value & Significance' },
      { id: 'm3', label: 'Confidence Intervals' },
      { id: 'm4', label: 'Bayesian vs Frequentist' },
    ],
  },
  {
    id: 's2',
    title: 'Design',
    desc: 'Plan your experiment',
    modules: [
      { id: 'm5', label: 'Experiment Structure' },
      { id: 'm6', label: 'Metrics & Guardrails' },
      { id: 'm7', label: 'Sample Size & Power' },
      { id: 'm8', label: 'Effect Size & MDE' },
      { id: 'm9', label: 'Variance Reduction (CUPED)' },
      { id: 'm10', label: 'Choosing the Right Test' },
    ],
  },
  {
    id: 's3',
    title: 'Validate & Run',
    desc: 'Execute with confidence',
    modules: [
      { id: 'm11', label: 'A/A Testing' },
      { id: 'm12', label: 'Sequential Testing' },
      { id: 'm13', label: 'Validity Threats' },
      { id: 'm14', label: 'Novelty & Time Effects' },
      { id: 'm15', label: 'Interaction Effects' },
    ],
  },
  {
    id: 's4',
    title: 'Analyze',
    desc: 'Crunch the numbers',
    modules: [
      { id: 'm16', label: 'Multiple Testing' },
      { id: 'm17', label: 'Lift Calculator' },
      { id: 'm18', label: 'Practical vs Statistical Significance' },
    ],
  },
  {
    id: 's5',
    title: 'Interpret & Decide',
    desc: 'Make the call',
    modules: [
      { id: 'm19', label: 'Result Interpreter' },
      { id: 'm20', label: 'Heterogeneous Effects' },
      { id: 'm21', label: "Simpson's Paradox" },
      { id: 'm22', label: 'Regression to the Mean' },
    ],
  },
  {
    id: 's6',
    title: 'Model & Evaluate',
    desc: 'Beyond A/B testing',
    modules: [
      { id: 'm23', label: 'Model Metrics' },
      { id: 'm24', label: 'Calibration' },
      { id: 'm25', label: 'Cumulative Gains' },
      { id: 'm26', label: 'Feature Importance' },
      { id: 'm27', label: 'Bias-Variance Tradeoff' },
      { id: 'm28', label: 'Cross-Validation' },
      { id: 'm29', label: 'Model Drift & Monitoring' },
    ],
  },
];

export { sections };
export const allModules = sections.flatMap((s) => s.modules);

interface NavigationProps {
  active: string;
  setActive: (id: string) => void;
  onClose?: () => void;
  visited?: Set<string>;
}

export default function Navigation({ active, setActive, onClose, visited }: NavigationProps) {
  const [filter, setFilter] = useState('');
  const activeSection = sections.find((s) => s.modules.some((m) => m.id === active));
  const q = filter.toLowerCase().trim();

  const filteredSections = q
    ? sections
        .map((s) => ({
          ...s,
          modules: s.modules.filter((m) => m.label.toLowerCase().includes(q)),
        }))
        .filter((s) => s.modules.length > 0)
    : sections;

  return (
    <nav className="flex flex-col h-full" aria-label="Module navigation">
      {/* Logo */}
      <div className="px-5 pt-6 pb-4">
        <div className="text-[17px] font-semibold text-[var(--color-text-primary)] tracking-tight">
          StatCompass
        </div>
        <div className="text-[11px] text-[var(--svg-text-faint)] mt-0.5">
          Interactive Statistics Reference
        </div>
      </div>

      {/* Home button */}
      <div className="px-3 pb-2">
        <button
          onClick={() => {
            setActive('home');
            onClose?.();
          }}
          className={
            'w-full text-left px-3 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all duration-150 flex items-center gap-2 ' +
            (active === 'home'
              ? 'bg-[var(--color-sidebar-active)] text-[var(--color-text-primary)] font-medium ring-1 ring-indigo-400/20'
              : 'text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)]')
          }
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Home</span>
        </button>
      </div>

      {/* Sidebar search */}
      <div className="px-3 pb-3">
        <div className="relative">
          <svg
            width="14"
            height="14"
            viewBox="0 0 20 20"
            fill="none"
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--svg-text-faint)]"
            aria-hidden="true"
          >
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path
              d="M13.5 13.5L17 17"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter..."
            className="w-full bg-app-glass text-[var(--color-text-primary)] text-[12px] pl-8 pr-3 py-1.5 rounded-lg outline-none ring-1 ring-[var(--color-border-subtle)] focus:ring-[var(--color-accent)] placeholder:text-[var(--svg-text-faint)] transition-shadow"
            aria-label="Filter modules"
          />
        </div>
      </div>

      {/* Module list */}
      <div className="flex-1 overflow-y-auto sidebar-scroll px-3 pb-3">
        {filteredSections.map((s) => {
          const sectionVisited = visited ? s.modules.filter((m) => visited.has(m.id)).length : 0;
          const sectionTotal = s.modules.length;
          return (
            <div key={s.id} className="mb-5">
              <div
                className={
                  'flex items-center justify-between text-[12px] uppercase tracking-[0.12em] font-semibold px-2 mb-0.5 transition-colors duration-200 ' +
                  (activeSection?.id === s.id
                    ? 'text-[var(--color-accent)]'
                    : 'text-[var(--svg-text-faint)]')
                }
              >
                <span>{s.title}</span>
                {visited && sectionVisited > 0 && (
                  <span className="text-[9px] normal-case tracking-normal font-normal opacity-60">
                    {sectionVisited}/{sectionTotal}
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[var(--color-text-muted)] px-2 mb-1.5">{s.desc}</div>
              {s.modules.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setActive(m.id);
                    onClose?.();
                  }}
                  className={
                    'w-full text-left px-3 py-[7px] rounded-lg text-[13px] cursor-pointer transition-all duration-150 flex items-center gap-2 ' +
                    (active === m.id
                      ? 'bg-[var(--color-sidebar-active)] text-[var(--color-text-primary)] font-medium ring-1 ring-indigo-400/20'
                      : 'text-[var(--svg-text)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)]')
                  }
                >
                  {visited && visited.has(m.id) && active !== m.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] opacity-40 flex-shrink-0" />
                  )}
                  <span>{m.label}</span>
                </button>
              ))}
            </div>
          );
        })}
        {filteredSections.length === 0 && (
          <div className="text-[12px] text-[var(--svg-text-faint)] text-center py-4">
            No matches
          </div>
        )}
      </div>

      {/* Theme toggle + keyboard hint */}
      <div className="px-3 pb-4 pt-1 border-t border-[var(--color-border-subtle)]">
        <ThemeToggle />
        <div className="hidden md:flex items-center justify-center gap-1.5 mt-2 text-[10px] text-[var(--svg-text-faint)]">
          <kbd className="bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">
            {navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}K
          </kbd>
          <span>search</span>
          <span className="mx-1">|</span>
          <kbd className="bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">
            ↑
          </kbd>
          <kbd className="bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">
            ↓
          </kbd>
          <span>navigate</span>
        </div>
      </div>
    </nav>
  );
}
