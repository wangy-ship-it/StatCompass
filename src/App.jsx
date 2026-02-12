import { useState, lazy, Suspense } from 'react';
import Navigation from './components/nav/Navigation';

const modules = {
  m1: lazy(() => import('./components/modules/M1ExperimentStructure')),
  m2: lazy(() => import('./components/modules/M2SampleSizePower')),
  m3: lazy(() => import('./components/modules/M3TypeErrors')),
  m4: lazy(() => import('./components/modules/M4PValueTesting')),
  m5: lazy(() => import('./components/modules/M5ConfidenceIntervals')),
  m6: lazy(() => import('./components/modules/M6ModelMetrics')),
  m7: lazy(() => import('./components/modules/M7LiftCalculator')),
  m8: lazy(() => import('./components/modules/M8ResultInterpreter')),
  m9: lazy(() => import('./components/modules/M9ValidityThreats')),
  m10: lazy(() => import('./components/modules/M10BiasVariance')),
  m11: lazy(() => import('./components/modules/M11MultipleTesting')),
  m12: lazy(() => import('./components/modules/M12TestChooser')),
  m13: lazy(() => import('./components/modules/M13BayesianFrequentist')),
  m14: lazy(() => import('./components/modules/M14SimpsonsParadox')),
  m15: lazy(() => import('./components/modules/M15MetricsGuardrails')),
  m16: lazy(() => import('./components/modules/M16EffectSizeMDE')),
  m17: lazy(() => import('./components/modules/M17AATesting')),
  m18: lazy(() => import('./components/modules/M18SequentialTesting')),
  m19: lazy(() => import('./components/modules/M19HeterogeneousEffects')),
  m20: lazy(() => import('./components/modules/M20CrossValidation')),
};

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center py-32">
      <div className="text-[var(--svg-text-faint)] text-sm">Loading...</div>
    </div>
  );
}

export default function App() {
  const [active, setActive] = useState('m1');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const Comp = modules[active];

  return (
    <div className="min-h-screen bg-app-bg text-[var(--color-text-primary)] flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-[240px] flex-shrink-0 bg-sidebar border-r border-[var(--color-border-subtle)] h-screen sticky top-0">
        <Navigation active={active} setActive={setActive} />
      </aside>

      {/* Sidebar — mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-[260px] bg-sidebar border-r border-[var(--color-border-subtle)]">
            <Navigation active={active} setActive={setActive} onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border-subtle)] bg-sidebar">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-[var(--svg-text)] hover:text-[var(--color-text-primary)] p-1 cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <span className="text-sm font-medium text-[var(--svg-text)]">StatCompass</span>
        </div>

        <div className="max-w-[800px] mx-auto px-6 md:px-10 py-8 md:py-12 pb-20">
          <Suspense fallback={<LoadingFallback />}>
            {Comp && <Comp />}
          </Suspense>
        </div>
      </main>
    </div>
  );
}
