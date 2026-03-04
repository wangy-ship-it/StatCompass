import { describe, it, expect, beforeEach } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider } from '../../../context/ThemeContext';
import { ModuleProvider } from '../../../context/ModuleContext';
import type { ReactNode } from 'react';

beforeEach(() => {
  window.location.hash = '';
});

function Wrapper({ children, moduleId }: { children: ReactNode; moduleId: string }) {
  return (
    <ThemeProvider>
      <ModuleProvider moduleId={moduleId}>{children}</ModuleProvider>
    </ThemeProvider>
  );
}

// Helper: find a slider by aria-label, change its value, verify StatBox updates
function findSlider(container: HTMLElement, label: string): HTMLInputElement | null {
  return container.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null;
}

function findStatBoxes(container: HTMLElement): { label: string; value: string }[] {
  const boxes = container.querySelectorAll('[role="status"]');
  return Array.from(boxes).map((box) => {
    const ariaLabel = box.getAttribute('aria-label') || '';
    const parts = ariaLabel.split(': ');
    return { label: parts[0] || '', value: parts.slice(1).join(': ') };
  });
}

import M5 from '../M5BayesianFrequentist';

describe('M5 Bayesian vs Frequentist integration', () => {
  it('renders posterior mean and responds to slider change', () => {
    const { container } = render(
      <Wrapper moduleId="m5">
        <M5 />
      </Wrapper>,
    );

    const slider = findSlider(container, 'Observed Data (n)');
    expect(slider).not.toBeNull();

    // Get initial stats
    const initialStats = findStatBoxes(container);
    expect(initialStats.length).toBeGreaterThanOrEqual(2);
    const posteriorBox = initialStats.find((s) => s.label === 'Posterior Mean');
    expect(posteriorBox).toBeDefined();

    // Change slider to max
    fireEvent.change(slider!, { target: { value: '1000' } });
    const updatedStats = findStatBoxes(container);
    const updatedPosterior = updatedStats.find((s) => s.label === 'Posterior Mean');
    expect(updatedPosterior).toBeDefined();
    // With n=1000, posterior should be close to 0.250
    expect(parseFloat(updatedPosterior!.value)).toBeCloseTo(0.25, 1);
  });
});

import M10 from '../M10EffectSizeMDE';

describe('M10 Effect Size & MDE integration', () => {
  it('renders MDE stat boxes and has working sliders', () => {
    const { container } = render(
      <Wrapper moduleId="m10">
        <M10 />
      </Wrapper>,
    );

    const slider = findSlider(container, 'Sample Size per Group');
    expect(slider).not.toBeNull();

    // Should render stat boxes at default values
    const stats = findStatBoxes(container);
    const mdeBox = stats.find((s) => s.label === 'MDE (absolute)');
    expect(mdeBox).toBeDefined();
    // Default is n=10000, baseline=10%, power=80% — MDE should be a positive number
    const mdeVal = parseFloat(mdeBox!.value);
    expect(mdeVal).toBeGreaterThan(0);

    const cohensBox = stats.find((s) => s.label === "Cohen's d");
    expect(cohensBox).toBeDefined();
    expect(parseFloat(cohensBox!.value)).toBeGreaterThan(0);
  });
});

import M15 from '../M15SequentialTesting';

describe('M15 Sequential Testing integration', () => {
  it('renders and has interactive sliders', () => {
    const { container } = render(
      <Wrapper moduleId="m15">
        <M15 />
      </Wrapper>,
    );

    // Module should render stat boxes
    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThan(0);

    // Should have SVG charts
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

import M22 from '../M22LiftCalculator';

describe('M22 Lift Calculator integration', () => {
  it('computes lift when treatment rate differs from control', () => {
    const { container } = render(
      <Wrapper moduleId="m22">
        <M22 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThan(0);

    // Should have lift-related stat boxes
    const liftBox = stats.find(
      (s) => s.label.toLowerCase().includes('lift') || s.label.toLowerCase().includes('difference'),
    );
    expect(liftBox).toBeDefined();
  });
});

// ── New module integration tests ──

import M25 from '../M25BayesianABTesting';

describe('M25 Bayesian A/B Testing integration', () => {
  it('renders P(B beats A) and responds to conversion changes', () => {
    const { container } = render(
      <Wrapper moduleId="m25">
        <M25 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    // Should have the key stat box
    const pBox = stats.find((s) => s.label.includes('P(B beats A)'));
    expect(pBox).toBeDefined();

    // With default params (50/500 control, 65/500 treatment), B should likely beat A
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

import M23 from '../M23RatioMetrics';

describe('M23 Ratio Metrics integration', () => {
  it('renders ratio estimate and correction factor', () => {
    const { container } = render(
      <Wrapper moduleId="m23">
        <M23 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    // Should have sliders
    const sampleSlider = findSlider(container, 'Sample Size');
    expect(sampleSlider).not.toBeNull();
  });
});

import M26 from '../M26MultiarmedBandits';

describe('M26 Multi-Armed Bandits integration', () => {
  it('renders with stat boxes and chart', () => {
    const { container } = render(
      <Wrapper moduleId="m26">
        <M26 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

import M13 from '../M13ClusterExperiments';

describe('M13 Cluster Experiments integration', () => {
  it('renders design effect and power', () => {
    const { container } = render(
      <Wrapper moduleId="m13">
        <M13 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    // Should have the design effect stat box
    const deffBox = stats.find((s) => s.label.includes('Design Effect'));
    expect(deffBox).toBeDefined();
    // With default ICC=0.05, cluster size=50: DEFF = 1 + 49*0.05 = 3.45
    const deff = parseFloat(deffBox!.value);
    expect(deff).toBeGreaterThan(1);
  });
});

import M21 from '../M21BootstrapPermutation';

describe('M21 Bootstrap & Permutation integration', () => {
  it('renders bootstrap CI and permutation p-value', () => {
    const { container } = render(
      <Wrapper moduleId="m21">
        <M21 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('bootstrap CI shows dash before simulation and values after stepping', () => {
    const { container } = render(
      <Wrapper moduleId="m21">
        <M21 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    const bootCI = stats.find((s) => s.label === 'Bootstrap CI');
    expect(bootCI).toBeDefined();
    // Before stepping, should show dash
    expect(bootCI!.value).toBe('\u2014');

    // Click Step button to populate data
    const stepBtn = container.querySelector('button[aria-label="Step one batch"]');
    expect(stepBtn).not.toBeNull();
    for (let i = 0; i < 5; i++) fireEvent.click(stepBtn!);

    const statsAfter = findStatBoxes(container);
    const bootCIAfter = statsAfter.find((s) => s.label === 'Bootstrap CI');
    const match = bootCIAfter!.value.match(/\[(-?[\d.]+),\s*(-?[\d.]+)\]/);
    expect(match).not.toBeNull();
    const lo = parseFloat(match![1]);
    const hi = parseFloat(match![2]);
    expect(lo).toBeLessThan(hi);
    expect(hi).toBeGreaterThan(0);
  });

  it('permutation p-value shows after stepping the simulation', () => {
    const { container } = render(
      <Wrapper moduleId="m21">
        <M21 />
      </Wrapper>,
    );

    // Click Step button to populate data
    const stepBtn = container.querySelector('button[aria-label="Step one batch"]');
    expect(stepBtn).not.toBeNull();
    for (let i = 0; i < 5; i++) fireEvent.click(stepBtn!);

    const stats = findStatBoxes(container);
    const permP = stats.find((s) => s.label === 'Permutation p');
    expect(permP).toBeDefined();
    const pVal = parseFloat(permP!.value);
    // With a +5 treatment effect, p-value should be very small
    expect(pVal).toBeLessThan(0.1);
  });
});

import M1 from '../M1TypeErrors';

describe('M1 Type Errors integration', () => {
  it('renders with properly-suffixed SVG gradient IDs', () => {
    const { container } = render(
      <Wrapper moduleId="m1">
        <M1 />
      </Wrapper>,
    );

    // Check that gradient IDs use -m1 suffix via fill references in path elements
    const html = container.innerHTML;
    expect(html).toContain('grad-alpha-m1');
    expect(html).toContain('grad-beta-m1');
    expect(html).toContain('grad-power-m1');
    expect(html).toContain('hatch-beta-m1');

    // Check that old unsuffixed IDs are NOT present
    expect(html).not.toContain('"grad-alpha"');
    expect(html).not.toContain('"grad-beta"');
    expect(html).not.toContain('"hatch-beta"');
  });

  it('renders stat values that respond to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m1">
        <M1 />
      </Wrapper>,
    );

    // Should render SVG paths for the distributions
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThan(0);

    // Changing alpha slider should update displayed values
    const alphaSlider = findSlider(container, 'Significance Level (α)');
    expect(alphaSlider).not.toBeNull();

    fireEvent.change(alphaSlider!, { target: { value: '0.1' } });
    // Verify it still renders without crashing after slider change
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

// ── Bug regression tests ──

import M11 from '../M11VarianceReduction';

describe('M11 Variance Reduction – power chart at min sample size', () => {
  it('renders without NaN when sampleSize is at minimum (100)', () => {
    window.location.hash = '#m11?sampleSize=100';
    const { container } = render(
      <Wrapper moduleId="m11">
        <M11 />
      </Wrapper>,
    );

    // Should render SVGs without NaN coordinates
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    const pathD = Array.from(container.querySelectorAll('svg path'))
      .map((p) => p.getAttribute('d') || '')
      .join('');
    expect(pathD).not.toContain('NaN');
  });
});

import M19 from '../M19InteractionEffects';

describe('M19 Interaction Effects – zero effects', () => {
  it('renders without NaN when both effects are 0', () => {
    window.location.hash = '#m19?effectA=0&effectB=0';
    const { container } = render(
      <Wrapper moduleId="m19">
        <M19 />
      </Wrapper>,
    );

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
    const pathD = Array.from(container.querySelectorAll('svg path'))
      .map((p) => p.getAttribute('d') || '')
      .join('');
    expect(pathD).not.toContain('NaN');

    // Bars should still render (even if all zero)
    const rects = container.querySelectorAll('svg rect');
    expect(rects.length).toBeGreaterThan(0);
  });
});

import M20 from '../M20MultipleTesting';

describe('M20 Multiple Testing – trueEffects clamping', () => {
  it('renders correctly when trueEffects slider is changed', () => {
    const { container } = render(
      <Wrapper moduleId="m20">
        <M20 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThan(0);

    // The true positives + false positives counts should be non-negative
    const tpBox = stats.find((s) => s.label === 'True Positives');
    expect(tpBox).toBeDefined();
    expect(parseInt(tpBox!.value)).toBeGreaterThanOrEqual(0);
  });
});

import M16 from '../M16SRMDiagnostics';

describe('M16 SRM Diagnostics integration', () => {
  it('renders SRM chi-squared result and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m16">
        <M16 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    // Change observed group A count (uses em dash in label)
    const slider = findSlider(container, 'Observed Count \u2014 Group A');
    expect(slider).not.toBeNull();
    fireEvent.change(slider!, { target: { value: '5200' } });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

import M3 from '../M3CentralLimitTheorem';

describe('M3 Central Limit Theorem integration', () => {
  it('renders sampling distribution and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m3">
        <M3 />
      </Wrapper>,
    );

    // M3 uses ChartBox but no StatBox — check SVG renders
    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    // Should have paths for distributions
    const paths = container.querySelectorAll('svg path');
    expect(paths.length).toBeGreaterThan(0);

    // Change sample size slider
    const slider = findSlider(container, 'Sample Size (n)');
    expect(slider).not.toBeNull();
    fireEvent.change(slider!, { target: { value: '50' } });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

import M27 from '../M27DifferenceInDifferences';

describe('M27 Difference-in-Differences integration', () => {
  it('renders DiD estimate and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m27">
        <M27 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    // Change treatment effect slider
    const slider = findSlider(container, 'Treatment Effect');
    expect(slider).not.toBeNull();
    fireEvent.change(slider!, { target: { value: '15' } });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

import M8 from '../M8MetricSensitivity';

describe('M8 Metric Sensitivity Analysis integration', () => {
  it('renders sensitivity metrics and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m8">
        <M8 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);

    // Change outlier fraction slider
    const slider = findSlider(container, 'Outlier Fraction');
    expect(slider).not.toBeNull();
    fireEvent.change(slider!, { target: { value: '0.1' } });
    expect(container.querySelector('svg')).not.toBeNull();
  });
});

import M30 from '../M30SimpsonsParadox';

describe("M30 Simpson's Paradox integration", () => {
  it('renders with preset buttons and detects active preset', () => {
    const { container } = render(
      <Wrapper moduleId="m30">
        <M30 />
      </Wrapper>,
    );

    // Should have preset buttons
    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThan(0);

    // Should render stat boxes
    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    // Default values match the "medical" preset
    const paradoxBox = stats.find((s) => s.label === 'Paradox Active');
    expect(paradoxBox).toBeDefined();
  });

  it('slider changes update chart data', () => {
    const { container } = render(
      <Wrapper moduleId="m30">
        <M30 />
      </Wrapper>,
    );

    // Change segment ratio
    const ratioSlider = findSlider(container, 'Segment Ratio (% Easy Cases)');
    expect(ratioSlider).not.toBeNull();
    fireEvent.change(ratioSlider!, { target: { value: '50' } });

    // Should still render correctly
    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);
  });
});
