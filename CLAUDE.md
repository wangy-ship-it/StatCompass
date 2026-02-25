# StatCompass

Interactive statistics reference app: 34 modules covering experiment design, A/B testing, and ML evaluation. Built with React 19, Vite 6, Tailwind 4, TypeScript (strict mode). No chart libraries -- all visualizations are hand-crafted SVG.

## Quick Start

```bash
npm install
npm run dev          # local dev server (Vite)
npm test             # vitest run (all tests)
npm run test:coverage # coverage with V8 provider
npm run build        # production build
npm run lint         # ESLint
npm run typecheck    # tsc --noEmit
```

Husky pre-commit hooks run `lint-staged` (ESLint --fix + Prettier) on `*.{ts,tsx,css}` files.

## Architecture

- **Hash routing** -- `window.location.hash` drives navigation (no react-router). `App.tsx` maps `#m1`..`#m34` to lazy-loaded module components.
- **Lazy loading** -- Every module is `React.lazy(() => import(...))` with a shared `<Suspense>` fallback and `<ErrorBoundary>`.
- **ModuleContext** -- Wraps each module with `<ModuleProvider moduleId={active}>`, used by `ConceptLink` auto-linking.
- **ThemeContext** -- Light/dark theme via CSS custom properties. Toggle in sidebar footer.
- **URL params** -- `useModuleParams` syncs slider state to the hash query string (`#m1?alp=0.1&eff=3`), enabling shareable URLs and browser back/forward.

## Directory Structure

```
src/
  App.tsx                 -- root: hash router, lazy imports, search overlay
  components/
    modules/              -- M1TypeErrors.tsx .. M34BootstrapPermutation.tsx, Landing.tsx
    modules/__tests__/    -- smoke.test.tsx, integration.test.tsx
    nav/Navigation.tsx    -- sidebar: sections array, module list, search filter
    ui/                   -- shared components (see below)
    ui/__tests__/         -- component tests, accessibility tests
  hooks/                  -- useAnimatedParams, useModuleParams, useSpring, useChartTooltip
  hooks/__tests__/        -- hook unit tests
  utils/                  -- math.ts (nPDF, nCDF, zInv, etc.), conceptLinker.tsx
  utils/__tests__/        -- utility tests
  data/conceptRegistry.ts -- term-to-module mapping for auto-linking
  context/                -- ThemeContext.tsx, ModuleContext.tsx
  styles/theme.ts         -- color constants and CSS variable references (colors, sv)
  index.css               -- Tailwind imports, CSS custom properties, slider styles
```

## Module Pattern

Every module follows the same structure. Reference: `M1TypeErrors.tsx`.

```tsx
import { useMemo, useCallback } from 'react';
import { colors, sv } from '../../styles/theme';
import { Hdr, Desc, ChartBox, Sl, QA, TechNote, Insight } from '../ui';
import useAnimatedParams from '../../hooks/useAnimatedParams';

const defaults = { alp: 0.05, eff: 2.0, ss: 30 };

export default function M1TypeErrors() {
  // 1. Animated params from URL hash
  const [p, set] = useAnimatedParams(defaults);

  // 2. useMemo: compute all chart geometry from params
  const d = useMemo(() => { /* coordinate math, SVG paths */ }, [p.alp, p.eff, p.ss]);

  // 3. useCallback: tooltipLookup(vbX) => { x, y, lines[], markers[] } | null
  const tooltipLookup = useCallback((vbX: number) => { ... }, [d]);

  // 4. JSX layout (always this order):
  return (
    <div>
      <Hdr sub="Section Name">Module Title</Hdr>
      <Desc>Plain-language explanation.</Desc>
      <ChartBox h={240} tooltipLookup={tooltipLookup}>
        {/* SVG elements: <defs>, <path>, <line>, <text>, <circle> */}
      </ChartBox>
      {/* Optional: StatBox for key metrics display */}
      <Sl label="..." value={p.alp} min={0} max={1} step={0.01} onChange={v => set('alp', v)} />
      <QA items={[{ q: '...', a: '...' }]} />
      <TechNote>Technical details.</TechNote>
      <Insight>Key takeaway.</Insight>
    </div>
  );
}
```

The `useAnimatedParams` hook composes `useModuleParams` (URL sync) with `useSpring` (60fps interpolation) so sliders animate smoothly.

## Shared UI Components

| Component | Purpose |
|-----------|---------|
| `ChartBox` | Glass-card wrapper with `<svg>`, pointer-based tooltip overlay, `role="img"` + `aria-label` |
| `Sl` | Styled range slider with label, formatted value display, spring-compatible |
| `StatBox` | Key-value metric display |
| `Hdr` | Module title with section subtitle |
| `Desc` | Prose description (auto-links concept terms via `ConceptLink`) |
| `QA` | Expandable Q&A accordion |
| `TechNote` | Collapsible technical details |
| `Insight` | Highlighted takeaway box |
| `PillBtn` | Toggle/option button |
| `ConceptLink` | Hover tooltip linking to another module; auto-inserted by `conceptLinker.tsx` |

All exported from `src/components/ui/index.ts`.

## Adding a New Module

1. **Create** `src/components/modules/M35YourModule.tsx` following the module pattern above.
2. **Register in Navigation** -- Add `{ id: 'm35', label: 'Your Module' }` to the appropriate section in `src/components/nav/Navigation.tsx`.
3. **Add lazy import** -- Add `m35: lazy(() => import('./components/modules/M35YourModule'))` to the `modules` record in `src/App.tsx`.
4. **Add smoke test** -- Import and add to the `modules` array in `src/components/modules/__tests__/smoke.test.tsx`.
5. **Register concepts** -- Add entries to `src/data/conceptRegistry.ts` for terms that should auto-link to your module. Use `wordBoundary: true` for short/ambiguous terms.

## SVG Chart Conventions

- All charts are hand-crafted SVG inside `<ChartBox>`. No D3, Recharts, or other chart libraries.
- Coordinate transforms: define `tX(v)` and `tY(v)` functions mapping data space to SVG viewBox coordinates. Standard padding: `pl=36, pr=36, pt=16, pb=34`.
- Use `colors` (hex) for stroke/fill and `sv` (CSS vars) for theme-adaptive fills like `sv.fillRed`, `sv.axis`, `sv.grid`.
- SVG gradient/pattern IDs must be unique per module. Append a suffix if the module has multiple charts (e.g., `grad-alpha-m1`).
- `ChartBox` injects a `<style>` block giving all `<text>` elements a paint-order stroke for legibility and enabling 80ms transitions on shapes.
- Tooltip support: pass a `tooltipLookup` function to `ChartBox`. It receives `vbX` (viewBox x-coordinate) and returns `{ x, y, lines[], markers[] }` or `null`.

## Testing

- **Framework**: Vitest with jsdom, `@testing-library/react`, `axe-core` for a11y.
- **Smoke tests** (`smoke.test.tsx`): Every module renders without crashing. Add new modules here.
- **Integration tests** (`integration.test.tsx`): Slider interaction, URL param sync, tooltip behavior.
- **Accessibility tests** (`accessibility.test.tsx`): axe-core checks on UI components.
- **Unit tests**: Hooks (`useAnimatedParams`, `useModuleParams`, `useSpring`, `useChartTooltip`), utilities (`math.ts`, `conceptLinker.tsx`).
- **Coverage thresholds** (80% for statements/branches/functions/lines):
  - `src/utils/**`
  - `src/hooks/**`
  - `src/components/ui/**`
  - Module files (`src/components/modules/**`) are excluded from coverage.

## Code Style

- **ESLint 9** flat config + `typescript-eslint` + `eslint-plugin-react-hooks` + `eslint-config-prettier`.
- **Prettier** for formatting.
- **Husky + lint-staged** pre-commit: auto-fixes and formats staged `.ts`, `.tsx`, `.css` files.
- **TypeScript strict mode** -- `tsc --noEmit` runs via `npm run typecheck`.
- Import shared UI from the barrel: `import { Hdr, Desc, ChartBox, Sl } from '../ui';`
- Theme colors: use `colors.indigo` etc. for fixed colors, `sv.axis` etc. for theme-adaptive CSS vars.
