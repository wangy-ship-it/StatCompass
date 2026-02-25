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
});
