import { sections } from '../nav/Navigation';

const sectionIcons = {
  s1: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  s2: 'M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
  s3: 'M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11',
  s4: 'M18 20V10M12 20V4M6 20v-6',
  s5: 'M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3',
  s6: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
};

const scenarios = [
  { title: 'Explaining experiment results', desc: 'Walk stakeholders through what the numbers mean', links: [{ id: 'm19', label: 'Result Interpreter' }, { id: 'm18', label: 'Practical Significance' }] },
  { title: 'Justifying test duration', desc: 'Show why we need more time or more users', links: [{ id: 'm7', label: 'Sample Size & Power' }, { id: 'm8', label: 'Effect Size & MDE' }] },
  { title: 'Why our test showed no effect', desc: 'Explain null results without losing credibility', links: [{ id: 'm1', label: 'Type I & II Errors' }, { id: 'm22', label: 'Regression to Mean' }] },
  { title: 'Reviewing test validity', desc: 'Check for threats before trusting the results', links: [{ id: 'm12', label: 'Validity Threats' }, { id: 'm14', label: 'Interaction Effects' }] },
];

export default function Landing({ navigate, visited }) {
  const visitedCount = visited ? visited.size : 0;

  return (
    <div>
      {/* Hero */}
      <div className="mb-10">
        <div className="text-[11px] text-[var(--color-accent-faint)] uppercase tracking-[0.15em] font-medium mb-2">StatCompass</div>
        <h1 className="text-[32px] sm:text-[40px] font-semibold text-[var(--color-text-primary)] leading-tight tracking-tight mb-3">
          StatCompass
        </h1>
        <p className="text-[15px] text-[var(--svg-text)] leading-[1.7] max-w-[600px]">
          29 interactive modules covering experiment design, analysis, and interpretation.
          Each one turns a complex statistical concept into a visual you can share in a meeting.
        </p>
        {visitedCount > 0 && (
          <div className="mt-3 text-[13px] text-[var(--svg-text-faint)]">
            {visitedCount} of 29 modules explored
          </div>
        )}
      </div>

      {/* Section overview grid */}
      <div className="mb-10">
        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em] font-medium mb-4">Sections</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sections.map((s) => {
            const sVisited = visited ? s.modules.filter((m) => visited.has(m.id)).length : 0;
            return (
              <button
                key={s.id}
                onClick={() => navigate(s.modules[0].id)}
                className="text-left bg-app-surface rounded-xl p-4 ring-1 ring-[var(--color-border-subtle)] hover:ring-[var(--color-accent-ring)] transition-all cursor-pointer group"
              >
                <div className="flex items-start gap-3">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <path d={sectionIcons[s.id]} />
                  </svg>
                  <div className="min-w-0">
                    <div className="text-[14px] font-medium text-[var(--color-text-primary)] group-hover:text-[var(--color-accent)] transition-colors">{s.title}</div>
                    <div className="text-[12px] text-[var(--svg-text-faint)] mt-0.5">{s.desc}</div>
                    <div className="text-[11px] text-[var(--svg-text-faint)] mt-1.5 opacity-60">
                      {s.modules.length} modules{sVisited > 0 && <span className="text-[var(--color-accent-faint)]"> · {sVisited} visited</span>}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick-start scenarios */}
      <div className="mb-10">
        <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-[0.15em] font-medium mb-4">Quick Start</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scenarios.map((sc, i) => (
            <div key={i} className="bg-app-surface rounded-xl p-4 ring-1 ring-[var(--color-border-subtle)]">
              <div className="text-[14px] font-medium text-[var(--color-text-primary)] mb-1">{sc.title}</div>
              <div className="text-[12px] text-[var(--svg-text-faint)] mb-3">{sc.desc}</div>
              <div className="flex gap-2 flex-wrap">
                {sc.links.map((link) => (
                  <button
                    key={link.id}
                    onClick={() => navigate(link.id)}
                    className="text-[12px] text-[var(--color-accent)] hover:text-[var(--color-text-primary)] bg-[var(--color-accent-bg)] hover:bg-[var(--color-sidebar-hover)] px-2.5 py-1 rounded-lg ring-1 ring-[var(--color-accent-ring)] cursor-pointer transition-colors"
                  >
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Keyboard shortcut hints */}
      <div className="hidden md:flex items-center gap-4 text-[11px] text-[var(--svg-text-faint)] pt-4 border-t border-[var(--color-border-subtle)]">
        <span><kbd className="bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">{navigator.platform?.includes('Mac') ? '\u2318' : 'Ctrl'}K</kbd> search</span>
        <span><kbd className="bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">{'\u2191'}</kbd><kbd className="bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">{'\u2193'}</kbd> navigate</span>
      </div>
    </div>
  );
}
