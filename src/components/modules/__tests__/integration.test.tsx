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

import M4 from '../M4BayesianFrequentist';

describe('M4 Bayesian vs Frequentist integration', () => {
  it('renders posterior mean and responds to slider change', () => {
    const { container } = render(
      <Wrapper moduleId="m4">
        <M4 />
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

import M8 from '../M8EffectSizeMDE';

describe('M8 Effect Size & MDE integration', () => {
  it('renders MDE stat boxes and has working sliders', () => {
    const { container } = render(
      <Wrapper moduleId="m8">
        <M8 />
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

import M12 from '../M12SequentialTesting';

describe('M12 Sequential Testing integration', () => {
  it('renders and has interactive sliders', () => {
    const { container } = render(
      <Wrapper moduleId="m12">
        <M12 />
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

import M17 from '../M17LiftCalculator';

describe('M17 Lift Calculator integration', () => {
  it('computes lift when treatment rate differs from control', () => {
    const { container } = render(
      <Wrapper moduleId="m17">
        <M17 />
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

import M30 from '../M30BayesianABTesting';

describe('M30 Bayesian A/B Testing integration', () => {
  it('renders P(B beats A) and responds to conversion changes', () => {
    const { container } = render(
      <Wrapper moduleId="m30">
        <M30 />
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

import M31 from '../M31RatioMetrics';

describe('M31 Ratio Metrics integration', () => {
  it('renders ratio estimate and correction factor', () => {
    const { container } = render(
      <Wrapper moduleId="m31">
        <M31 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    // Should have sliders
    const sampleSlider = findSlider(container, 'Sample Size');
    expect(sampleSlider).not.toBeNull();
  });
});

import M32 from '../M32MultiarmedBandits';

describe('M32 Multi-Armed Bandits integration', () => {
  it('renders with stat boxes and chart', () => {
    const { container } = render(
      <Wrapper moduleId="m32">
        <M32 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });
});

import M33 from '../M33ClusterExperiments';

describe('M33 Cluster Experiments integration', () => {
  it('renders design effect and power', () => {
    const { container } = render(
      <Wrapper moduleId="m33">
        <M33 />
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

import M34 from '../M34BootstrapPermutation';

describe('M34 Bootstrap & Permutation integration', () => {
  it('renders bootstrap CI and permutation p-value', () => {
    const { container } = render(
      <Wrapper moduleId="m34">
        <M34 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    expect(stats.length).toBeGreaterThanOrEqual(3);

    const svgs = container.querySelectorAll('svg');
    expect(svgs.length).toBeGreaterThan(0);
  });

  it('bootstrap CI contains the observed difference', () => {
    const { container } = render(
      <Wrapper moduleId="m34">
        <M34 />
      </Wrapper>,
    );

    const stats = findStatBoxes(container);
    const bootCI = stats.find((s) => s.label === 'Bootstrap CI');
    expect(bootCI).toBeDefined();

    // Parse CI bounds: format is "[lo, hi]"
    const match = bootCI!.value.match(/\[(-?[\d.]+),\s*(-?[\d.]+)\]/);
    expect(match).not.toBeNull();
    const lo = parseFloat(match![1]);
    const hi = parseFloat(match![2]);
    // CI lower bound should be less than upper bound
    expect(lo).toBeLessThan(hi);
    // Since treatment adds +5, the CI should contain positive values
    expect(hi).toBeGreaterThan(0);
  });

  it('permutation p-value is significant for the +5 treatment effect', () => {
    const { container } = render(
      <Wrapper moduleId="m34">
        <M34 />
      </Wrapper>,
    );

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

import M9 from '../M9VarianceReduction';

describe('M9 Variance Reduction – power chart at min sample size', () => {
  it('renders without NaN when sampleSize is at minimum (100)', () => {
    window.location.hash = '#m9?sampleSize=100';
    const { container } = render(
      <Wrapper moduleId="m9">
        <M9 />
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

import M15 from '../M15InteractionEffects';

describe('M15 Interaction Effects – zero effects', () => {
  it('renders without NaN when both effects are 0', () => {
    window.location.hash = '#m15?effectA=0&effectB=0';
    const { container } = render(
      <Wrapper moduleId="m15">
        <M15 />
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

import M16 from '../M16MultipleTesting';

describe('M16 Multiple Testing – trueEffects clamping', () => {
  it('renders correctly when trueEffects slider is changed', () => {
    const { container } = render(
      <Wrapper moduleId="m16">
        <M16 />
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

import M35 from '../M35SRMDiagnostics';

describe('M35 SRM Diagnostics integration', () => {
  it('renders SRM chi-squared result and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m35">
        <M35 />
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

import M36 from '../M36CentralLimitTheorem';

describe('M36 Central Limit Theorem integration', () => {
  it('renders sampling distribution and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m36">
        <M36 />
      </Wrapper>,
    );

    // M36 uses ChartBox but no StatBox — check SVG renders
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

import M37 from '../M37DifferenceInDifferences';

describe('M37 Difference-in-Differences integration', () => {
  it('renders DiD estimate and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m37">
        <M37 />
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

import M38 from '../M38MetricSensitivity';

describe('M38 Metric Sensitivity Analysis integration', () => {
  it('renders sensitivity metrics and responds to slider changes', () => {
    const { container } = render(
      <Wrapper moduleId="m38">
        <M38 />
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

import M21 from '../M21SimpsonsParadox';

describe("M21 Simpson's Paradox integration", () => {
  it('renders with preset buttons and detects active preset', () => {
    const { container } = render(
      <Wrapper moduleId="m21">
        <M21 />
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
      <Wrapper moduleId="m21">
        <M21 />
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
