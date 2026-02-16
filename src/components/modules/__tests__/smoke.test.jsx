import { describe, it, expect, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { ThemeProvider } from '../../../context/ThemeContext';

beforeEach(() => {
  window.location.hash = '';
});

function Wrapper({ children }) {
  return (
    <ThemeProvider>
      {children}
    </ThemeProvider>
  );
}

// Static imports for all modules
import M1 from '../M1TypeErrors';
import M2 from '../M2PValueTesting';
import M3 from '../M3ConfidenceIntervals';
import M4 from '../M4BayesianFrequentist';
import M5 from '../M5ExperimentStructure';
import M6 from '../M6MetricsGuardrails';
import M7 from '../M7SampleSizePower';
import M8 from '../M8EffectSizeMDE';
import M9 from '../M9VarianceReduction';
import M10 from '../M10AATesting';
import M11 from '../M11SequentialTesting';
import M12 from '../M12ValidityThreats';
import M13 from '../M13NoveltyTimeEffects';
import M14 from '../M14InteractionEffects';
import M15 from '../M15TestChooser';
import M16 from '../M16MultipleTesting';
import M17 from '../M17LiftCalculator';
import M18 from '../M18PracticalSignificance';
import M19 from '../M19ResultInterpreter';
import M20 from '../M20HeterogeneousEffects';
import M21 from '../M21SimpsonsParadox';
import M22 from '../M22RegressionToMean';
import M23 from '../M23ModelMetrics';
import M24 from '../M24Calibration';
import M25 from '../M25CumulativeGains';
import M26 from '../M26FeatureImportance';
import M27 from '../M27BiasVariance';
import M28 from '../M28CrossValidation';
import M29 from '../M29ModelDrift';
import Landing from '../Landing';

const modules = [
  ['M1 – Type I & II Errors', M1],
  ['M2 – P-Value & Significance', M2],
  ['M3 – Confidence Intervals', M3],
  ['M4 – Bayesian vs Frequentist', M4],
  ['M5 – Experiment Structure', M5],
  ['M6 – Metrics & Guardrails', M6],
  ['M7 – Sample Size & Power', M7],
  ['M8 – Effect Size & MDE', M8],
  ['M9 – Variance Reduction', M9],
  ['M10 – A/A Testing', M10],
  ['M11 – Sequential Testing', M11],
  ['M12 – Validity Threats', M12],
  ['M13 – Novelty & Time Effects', M13],
  ['M14 – Interaction Effects', M14],
  ['M15 – Choosing the Right Test', M15],
  ['M16 – Multiple Testing', M16],
  ['M17 – Lift Calculator', M17],
  ['M18 – Practical Significance', M18],
  ['M19 – Result Interpreter', M19],
  ['M20 – Heterogeneous Effects', M20],
  ['M21 – Simpson\'s Paradox', M21],
  ['M22 – Regression to the Mean', M22],
  ['M23 – Model Metrics', M23],
  ['M24 – Calibration', M24],
  ['M25 – Cumulative Gains', M25],
  ['M26 – Feature Importance', M26],
  ['M27 – Bias-Variance Tradeoff', M27],
  ['M28 – Cross-Validation', M28],
  ['M29 – Model Drift', M29],
];

describe('Module smoke tests', () => {
  it.each(modules)('%s renders without crashing', (name, Component) => {
    const { container } = render(
      <Wrapper>
        <Component />
      </Wrapper>
    );
    expect(container.firstChild).toBeTruthy();
  });

  it('Landing page renders without crashing', () => {
    const navigate = () => {};
    const visited = new Set(['m1', 'm2']);
    const { container } = render(
      <Wrapper>
        <Landing navigate={navigate} visited={visited} resetVisited={() => {}} />
      </Wrapper>
    );
    expect(container.firstChild).toBeTruthy();
    expect(container.textContent).toContain('StatCompass');
    expect(container.textContent).toContain('2 of 29');
  });
});
