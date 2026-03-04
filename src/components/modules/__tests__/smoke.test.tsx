import { describe, it, expect, beforeEach } from 'vitest';
import type { ComponentType, ReactNode } from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../../context/ThemeContext';

beforeEach(() => {
  window.location.hash = '';
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}

// Static imports for all modules
import M1 from '../M1TypeErrors';
import M2 from '../M2PValueTesting';
import M3 from '../M3CentralLimitTheorem';
import M4 from '../M4ConfidenceIntervals';
import M5 from '../M5BayesianFrequentist';
import M6 from '../M6ExperimentStructure';
import M7 from '../M7MetricsGuardrails';
import M8 from '../M8MetricSensitivity';
import M9 from '../M9SampleSizePower';
import M10 from '../M10EffectSizeMDE';
import M11 from '../M11VarianceReduction';
import M12 from '../M12TestChooser';
import M13 from '../M13ClusterExperiments';
import M14 from '../M14AATesting';
import M15 from '../M15SequentialTesting';
import M16 from '../M16SRMDiagnostics';
import M17 from '../M17ValidityThreats';
import M18 from '../M18NoveltyTimeEffects';
import M19 from '../M19InteractionEffects';
import M20 from '../M20MultipleTesting';
import M21 from '../M21BootstrapPermutation';
import M22 from '../M22LiftCalculator';
import M23 from '../M23RatioMetrics';
import M24 from '../M24PracticalSignificance';
import M25 from '../M25BayesianABTesting';
import M26 from '../M26MultiarmedBandits';
import M27 from '../M27DifferenceInDifferences';
import M28 from '../M28ResultInterpreter';
import M29 from '../M29HeterogeneousEffects';
import M30 from '../M30SimpsonsParadox';
import M31 from '../M31RegressionToMean';
import M32 from '../M32BiasVariance';
import M33 from '../M33CrossValidation';
import M34 from '../M34ModelMetrics';
import M35 from '../M35Calibration';
import M36 from '../M36CumulativeGains';
import M37 from '../M37FeatureImportance';
import M38 from '../M38ModelDrift';
import Landing from '../Landing';

const modules: [string, ComponentType][] = [
  ['M1 – Type I & II Errors', M1],
  ['M2 – P-Value & Significance', M2],
  ['M3 – Central Limit Theorem', M3],
  ['M4 – Confidence Intervals', M4],
  ['M5 – Bayesian vs Frequentist', M5],
  ['M6 – Experiment Structure', M6],
  ['M7 – Metrics & Guardrails', M7],
  ['M8 – Metric Sensitivity Analysis', M8],
  ['M9 – Sample Size & Power', M9],
  ['M10 – Effect Size & MDE', M10],
  ['M11 – Variance Reduction', M11],
  ['M12 – Choosing the Right Test', M12],
  ['M13 – Cluster Experiments', M13],
  ['M14 – A/A Testing', M14],
  ['M15 – Sequential Testing', M15],
  ['M16 – SRM Diagnostics', M16],
  ['M17 – Validity Threats', M17],
  ['M18 – Novelty & Time Effects', M18],
  ['M19 – Interaction Effects', M19],
  ['M20 – Multiple Testing', M20],
  ['M21 – Bootstrap & Permutation', M21],
  ['M22 – Lift Calculator', M22],
  ['M23 – Ratio Metrics', M23],
  ['M24 – Practical Significance', M24],
  ['M25 – Bayesian A/B Testing', M25],
  ['M26 – Multi-Armed Bandits', M26],
  ['M27 – Difference-in-Differences', M27],
  ['M28 – Result Interpreter', M28],
  ['M29 – Heterogeneous Effects', M29],
  ["M30 – Simpson's Paradox", M30],
  ['M31 – Regression to the Mean', M31],
  ['M32 – Bias-Variance Tradeoff', M32],
  ['M33 – Cross-Validation', M33],
  ['M34 – Model Metrics', M34],
  ['M35 – Calibration', M35],
  ['M36 – Cumulative Gains', M36],
  ['M37 – Feature Importance', M37],
  ['M38 – Model Drift', M38],
];

describe('Module smoke tests', () => {
  it.each(modules)('%s renders without crashing', (_name, Component) => {
    const { container } = render(
      <Wrapper>
        <Component />
      </Wrapper>,
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('Landing page renders without crashing', () => {
    const navigate = () => {};
    const visited = new Set(['m1', 'm2']);
    const { container } = render(
      <Wrapper>
        <Landing navigate={navigate} visited={visited} resetVisited={() => {}} />
      </Wrapper>,
    );
    expect(container.firstChild).toBeTruthy();
    expect(container.textContent).toContain('StatCompass');
    expect(container.textContent).toContain('2 of 38');
  });
});
