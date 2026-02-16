import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import Navigation, { allModules, sections } from './components/nav/Navigation';
import ErrorBoundary from './components/ui/ErrorBoundary';
import { usePresent } from './context/PresentContext';

const modules = {
  home: lazy(() => import('./components/modules/Landing')),
  m1: lazy(() => import('./components/modules/M1TypeErrors')),
  m2: lazy(() => import('./components/modules/M2PValueTesting')),
  m3: lazy(() => import('./components/modules/M3ConfidenceIntervals')),
  m4: lazy(() => import('./components/modules/M4BayesianFrequentist')),
  m5: lazy(() => import('./components/modules/M5ExperimentStructure')),
  m6: lazy(() => import('./components/modules/M6MetricsGuardrails')),
  m7: lazy(() => import('./components/modules/M7SampleSizePower')),
  m8: lazy(() => import('./components/modules/M8EffectSizeMDE')),
  m9: lazy(() => import('./components/modules/M9VarianceReduction')),
  m10: lazy(() => import('./components/modules/M10AATesting')),
  m11: lazy(() => import('./components/modules/M11SequentialTesting')),
  m12: lazy(() => import('./components/modules/M12ValidityThreats')),
  m13: lazy(() => import('./components/modules/M13NoveltyTimeEffects')),
  m14: lazy(() => import('./components/modules/M14InteractionEffects')),
  m15: lazy(() => import('./components/modules/M15TestChooser')),
  m16: lazy(() => import('./components/modules/M16MultipleTesting')),
  m17: lazy(() => import('./components/modules/M17LiftCalculator')),
  m18: lazy(() => import('./components/modules/M18PracticalSignificance')),
  m19: lazy(() => import('./components/modules/M19ResultInterpreter')),
  m20: lazy(() => import('./components/modules/M20HeterogeneousEffects')),
  m21: lazy(() => import('./components/modules/M21SimpsonsParadox')),
  m22: lazy(() => import('./components/modules/M22RegressionToMean')),
  m23: lazy(() => import('./components/modules/M23ModelMetrics')),
  m24: lazy(() => import('./components/modules/M24Calibration')),
  m25: lazy(() => import('./components/modules/M25CumulativeGains')),
  m26: lazy(() => import('./components/modules/M26FeatureImportance')),
  m27: lazy(() => import('./components/modules/M27BiasVariance')),
  m28: lazy(() => import('./components/modules/M28CrossValidation')),
  m29: lazy(() => import('./components/modules/M29ModelDrift')),
};

function getHashModule() {
  const h = window.location.hash.replace('#', '').split('?')[0];
  return modules[h] ? h : 'home';
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-[var(--svg-text-faint)] text-sm">Loading...</div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState(getHashModule);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { toggle: togglePresent } = usePresent();
  const Comp = modules[active];

  // Progress tracking via localStorage
  const [visited, setVisited] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('sc-visited') || '[]')); }
    catch { return new Set(); }
  });
  useEffect(() => {
    setVisited((prev) => {
      if (prev.has(active)) return prev;
      const next = new Set(prev);
      next.add(active);
      localStorage.setItem('sc-visited', JSON.stringify([...next]));
      return next;
    });
  }, [active]);

  // Sync hash → state
  useEffect(() => {
    const onHash = () => {
      const m = getHashModule();
      setActive(m);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Sync state → hash
  const navigate = useCallback((id) => {
    window.location.hash = id;
    setActive(id);
    window.scrollTo(0, 0);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Cmd+K / Ctrl+K → search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((o) => !o);
        return;
      }

      // Cmd+Shift+P / Ctrl+Shift+P → present mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        togglePresent();
        return;
      }

      // ArrowDown → next, ArrowUp → prev (only preventDefault when navigation occurs)
      if (e.key === 'ArrowDown') {
        const idx = allModules.findIndex((m) => m.id === active);
        if (idx < allModules.length - 1) {
          e.preventDefault();
          navigate(allModules[idx + 1].id);
        }
      }
      if (e.key === 'ArrowUp') {
        const idx = allModules.findIndex((m) => m.id === active);
        if (idx > 0) {
          e.preventDefault();
          navigate(allModules[idx - 1].id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, navigate, togglePresent]);

  // Prev/next module info
  const activeIdx = allModules.findIndex((m) => m.id === active);
  const prevModule = activeIdx > 0 ? allModules[activeIdx - 1] : null;
  const nextModule = activeIdx < allModules.length - 1 ? allModules[activeIdx + 1] : null;

  // Section-crossing detection
  const sectionOf = (id) => sections.find((s) => s.modules.some((m) => m.id === id));
  const activeSection = sectionOf(active);
  const prevSection = prevModule ? sectionOf(prevModule.id) : null;
  const nextSection = nextModule ? sectionOf(nextModule.id) : null;
  const prevCrossesSection = prevSection && activeSection && prevSection.id !== activeSection.id;
  const nextCrossesSection = nextSection && activeSection && nextSection.id !== activeSection.id;

  return (
    <div className="min-h-screen bg-app-bg text-[var(--color-text-primary)] flex">
      {/* Skip to content */}
      <a href="#main-content" className="skip-nav">Skip to content</a>

      {/* Search overlay */}
      {searchOpen && (
        <SearchOverlay
          onSelect={(id) => { navigate(id); setSearchOpen(false); }}
          onClose={() => setSearchOpen(false)}
        />
      )}

      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0 bg-sidebar border-r border-[var(--color-border-subtle)] h-screen sticky top-0">
        <Navigation active={active} setActive={navigate} visited={visited} />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-[var(--color-border-subtle)]">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-[var(--svg-text-faint)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-sidebar-hover)] transition-colors cursor-pointer"
              aria-label="Close navigation"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <Navigation active={active} setActive={(id) => { navigate(id); setSidebarOpen(false); }} onClose={() => setSidebarOpen(false)} visited={visited} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main id="main-content" className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] bg-sidebar">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--svg-text)] hover:text-[var(--color-text-primary)] p-1 cursor-pointer"
            aria-label="Open navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-medium text-[var(--svg-text)]">StatCompass</span>
          <button
            onClick={() => setSearchOpen(true)}
            className="ml-auto text-[var(--svg-text-faint)] hover:text-[var(--color-text-primary)] p-1 cursor-pointer"
            aria-label="Search modules"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="max-w-[800px] mx-auto px-6 md:px-10 py-8 md:py-12 pb-20">
          <ErrorBoundary key={active}>
            <Suspense fallback={<LoadingFallback />}>
              {Comp && <Comp navigate={navigate} visited={visited} />}
            </Suspense>
          </ErrorBoundary>

          {/* Prev / Next navigation */}
          {active !== 'home' && <nav className="flex items-center justify-between mt-12 pt-6 border-t border-[var(--color-border-subtle)]" aria-label="Module navigation">
            {prevModule ? (
              <button
                onClick={() => navigate(prevModule.id)}
                className="flex flex-col items-start gap-0.5 text-[13px] text-[var(--svg-text)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors group"
              >
                {prevCrossesSection && (
                  <span className="text-[10px] text-[var(--color-accent-faint)] uppercase tracking-wider">{prevSection.title}</span>
                )}
                <span className="flex items-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="opacity-40 group-hover:opacity-70 transition-opacity">
                    <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {prevModule.label}
                </span>
              </button>
            ) : <div />}
            {nextModule ? (
              <button
                onClick={() => navigate(nextModule.id)}
                className="flex flex-col items-end gap-0.5 text-[13px] text-[var(--svg-text)] hover:text-[var(--color-text-primary)] cursor-pointer transition-colors group"
              >
                {nextCrossesSection && (
                  <span className="text-[10px] text-[var(--color-accent-faint)] uppercase tracking-wider">{nextSection.title}</span>
                )}
                <span className="flex items-center gap-2">
                  {nextModule.label}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="opacity-40 group-hover:opacity-70 transition-opacity">
                    <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            ) : <div />}
          </nav>}
        </div>

        {/* Mobile bottom nav */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar/95 backdrop-blur-lg border-t border-[var(--color-border-subtle)] flex items-center justify-between px-3 py-2.5">
          <button
            onClick={() => prevModule && navigate(prevModule.id)}
            disabled={!prevModule}
            className="p-2 cursor-pointer text-[var(--svg-text)] hover:text-[var(--color-text-primary)] disabled:opacity-25 disabled:cursor-default transition-colors"
            aria-label="Previous module"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[12px] text-[var(--svg-text)] font-medium truncate max-w-[200px] cursor-pointer hover:text-[var(--color-text-primary)] transition-colors"
          >
            {allModules.find((m) => m.id === active)?.label || 'StatCompass'}
          </button>
          <button
            onClick={() => nextModule && navigate(nextModule.id)}
            disabled={!nextModule}
            className="p-2 cursor-pointer text-[var(--svg-text)] hover:text-[var(--color-text-primary)] disabled:opacity-25 disabled:cursor-default transition-colors"
            aria-label="Next module"
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}

// Build search index: module label + parent section title
const searchIndex = allModules.map((m) => {
  const sec = sections.find((s) => s.modules.some((sm) => sm.id === m.id));
  return { ...m, section: sec?.title || '', searchText: (m.label + ' ' + (sec?.title || '')).toLowerCase() };
});

// ── Search Overlay (Cmd+K) ──
function SearchOverlay({ onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef(null);
  const dialogRef = useRef(null);

  const filtered = query.trim()
    ? searchIndex.filter((m) => m.searchText.includes(query.toLowerCase()))
    : searchIndex;

  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const el = list.children[selectedIdx];
    if (el) el.scrollIntoView({ block: 'nearest' });
  }, [selectedIdx]);

  // Focus trap
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onKey = (e) => {
      if (e.key === 'Tab') {
        const focusable = dialog.querySelectorAll('input, button, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    };
    dialog.addEventListener('keydown', onKey);
    return () => dialog.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === 'Enter' && filtered[selectedIdx]) { onSelect(filtered[selectedIdx].id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, selectedIdx, onSelect, onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        ref={dialogRef}
        className="relative w-full max-w-[480px] mx-4 bg-app-surface rounded-2xl ring-1 ring-[var(--color-border)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Search modules"
        aria-modal="true"
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <svg width="18" height="18" viewBox="0 0 20 20" fill="none" className="text-[var(--svg-text-faint)] flex-shrink-0" aria-hidden="true">
            <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
            <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search modules..."
            className="flex-1 bg-transparent text-[var(--color-text-primary)] text-[15px] outline-none placeholder:text-[var(--svg-text-faint)]"
            autoFocus
            aria-label="Search modules"
          />
          <kbd className="hidden sm:inline text-[10px] text-[var(--svg-text-faint)] bg-app-glass px-1.5 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">ESC</kbd>
        </div>
        <div ref={listRef} className="max-h-[320px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[var(--svg-text-faint)]">No modules found</div>
          )}
          {filtered.map((m, i) => (
            <button
              key={m.id}
              onClick={() => onSelect(m.id)}
              className={
                'w-full text-left px-4 py-2.5 text-[14px] cursor-pointer transition-colors flex items-center gap-3 ' +
                (i === selectedIdx
                  ? 'bg-[var(--color-sidebar-active)] text-[var(--color-text-primary)]'
                  : 'text-[var(--svg-text)] hover:bg-[var(--color-sidebar-hover)] hover:text-[var(--color-text-primary)]')
              }
            >
              <span className="flex-1">{m.label}</span>
              <span className="text-[10px] text-[var(--svg-text-faint)] uppercase tracking-wider">{m.section}</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-[var(--color-border-subtle)] flex items-center gap-4 text-[10px] text-[var(--svg-text-faint)]">
          <span><kbd className="bg-app-glass px-1 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">&uarr;&darr;</kbd> navigate</span>
          <span><kbd className="bg-app-glass px-1 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">&crarr;</kbd> select</span>
          <span><kbd className="bg-app-glass px-1 py-0.5 rounded ring-1 ring-[var(--color-border-subtle)]">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
