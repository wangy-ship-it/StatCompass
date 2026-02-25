import { describe, it, expect } from 'vitest';
import {
  nPDF,
  nCDF,
  zInv,
  sR,
  sePropDiff,
  liftCI,
  polyFit,
  polyEval,
  bonferroni,
  benjaminiHochberg,
  logGamma,
  betaPDF,
  cohensD,
  mdeFromN,
  nFromMDE,
  obfBounds,
  pocockBounds,
  alphaSpend,
  cupedVariance,
  effectiveN,
  kFoldSplit,
  betaCDF,
  betaQuantile,
  probBBeatsA,
  expectedLossOfB,
  sRNormal,
  deltaMethodVar,
  ratioCI,
  naiveRatioVar,
  designEffect,
  clusterAdjustedN,
  clusterAdjustedSE,
  switchbackPower,
  bootstrapSample,
  bootstrapCI,
  permutationTest,
  betaSample,
  ucb1Score,
  cumulativeRegret,
} from '../math';

// Helpers

describe('nPDF – Normal probability density', () => {
  it('peak at mean', () => {
    const peak = nPDF(0, 0, 1);
    expect(peak).toBeCloseTo(0.3989, 3);
  });

  it('symmetric around mean', () => {
    expect(nPDF(-1, 0, 1)).toBeCloseTo(nPDF(1, 0, 1), 10);
  });

  it('scales with standard deviation', () => {
    expect(nPDF(0, 0, 2)).toBeCloseTo(0.1995, 3);
  });

  it('non-zero mean', () => {
    expect(nPDF(5, 5, 1)).toBeCloseTo(0.3989, 3);
  });
});

describe('nCDF – Normal cumulative distribution', () => {
  it('Φ(0) = 0.5', () => {
    expect(nCDF(0, 0, 1)).toBeCloseTo(0.5, 4);
  });

  it('Φ(-∞) ≈ 0', () => {
    expect(nCDF(-6, 0, 1)).toBeLessThan(0.001);
  });

  it('Φ(+∞) ≈ 1', () => {
    expect(nCDF(6, 0, 1)).toBeGreaterThan(0.999);
  });

  it('Φ(1.96) ≈ 0.975', () => {
    expect(nCDF(1.96, 0, 1)).toBeCloseTo(0.975, 2);
  });

  it('Φ(-1.96) ≈ 0.025', () => {
    expect(nCDF(-1.96, 0, 1)).toBeCloseTo(0.025, 2);
  });

  it('non-standard normal', () => {
    // P(X < 10 | μ=10, σ=3) = 0.5
    expect(nCDF(10, 10, 3)).toBeCloseTo(0.5, 4);
  });
});

describe('zInv – Inverse normal (z-critical)', () => {
  it('z for α=0.05 ≈ 1.96', () => {
    expect(zInv(0.05)).toBeCloseTo(1.96, 1);
  });

  it('z for α=0.01 ≈ 2.576', () => {
    expect(zInv(0.01)).toBeCloseTo(2.576, 1);
  });

  it('z for α=0.10 ≈ 1.645', () => {
    expect(zInv(0.1)).toBeCloseTo(1.645, 1);
  });

  it('round-trips with nCDF', () => {
    const alpha = 0.05;
    const z = zInv(alpha);
    const p = 1 - nCDF(z, 0, 1);
    expect(p).toBeCloseTo(alpha / 2, 3);
  });
});

describe('sR – Seeded random', () => {
  it('returns value in [0, 1)', () => {
    for (let s = 0; s < 100; s++) {
      const v = sR(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('deterministic for same seed', () => {
    expect(sR(42)).toBe(sR(42));
    expect(sR(123)).toBe(sR(123));
  });

  it('different seeds give different values', () => {
    expect(sR(1)).not.toBe(sR(2));
  });
});

describe('sePropDiff – Standard error of proportion difference', () => {
  it('basic computation', () => {
    const se = sePropDiff(0.1, 0.12, 10000);
    // sqrt((0.1*0.9)/10000 + (0.12*0.88)/10000)
    const expected = Math.sqrt((0.1 * 0.9 + 0.12 * 0.88) / 10000);
    expect(se).toBeCloseTo(expected, 6);
  });

  it('equal proportions', () => {
    const se = sePropDiff(0.5, 0.5, 1000);
    expect(se).toBeCloseTo(Math.sqrt((2 * 0.25) / 1000), 6);
  });
});

describe('liftCI – Lift confidence interval & significance', () => {
  it('no lift → not significant', () => {
    const r = liftCI(0.1, 0.1, 10000);
    expect(r.absLift).toBe(0);
    expect(r.relLift).toBe(0);
    expect(r.significant).toBe(false);
    expect(r.pValue).toBeCloseTo(1, 1);
  });

  it('large lift → significant', () => {
    const r = liftCI(0.1, 0.15, 100000);
    expect(r.absLift).toBeCloseTo(0.05, 4);
    expect(r.relLift).toBeCloseTo(50, 0);
    expect(r.significant).toBe(true);
    expect(r.pValue).toBeLessThan(0.05);
  });

  it('CI contains true lift', () => {
    const r = liftCI(0.1, 0.12, 50000);
    expect(r.ciLo).toBeLessThan(0.02);
    expect(r.ciHi).toBeGreaterThan(0.02);
  });

  it('respects alpha parameter', () => {
    const r01 = liftCI(0.1, 0.12, 10000, 0.01);
    const r05 = liftCI(0.1, 0.12, 10000, 0.05);
    // Wider CI at lower alpha
    expect(r01.ciHi - r01.ciLo).toBeGreaterThan(r05.ciHi - r05.ciLo);
  });
});

describe('polyFit / polyEval – Polynomial regression', () => {
  it('fits a line through two points', () => {
    const coeffs = polyFit([0, 1], [0, 1], 1);
    expect(coeffs[0]).toBeCloseTo(0, 4); // intercept
    expect(coeffs[1]).toBeCloseTo(1, 4); // slope
  });

  it('fits a quadratic', () => {
    const xs = [-2, -1, 0, 1, 2];
    const ys = xs.map((x) => x * x);
    const coeffs = polyFit(xs, ys, 2);
    expect(coeffs[0]).toBeCloseTo(0, 2); // constant
    expect(coeffs[1]).toBeCloseTo(0, 2); // linear
    expect(coeffs[2]).toBeCloseTo(1, 2); // quadratic
  });

  it('polyEval evaluates correctly', () => {
    const coeffs = [1, 2, 3]; // 1 + 2x + 3x^2
    expect(polyEval(coeffs, 0)).toBe(1);
    expect(polyEval(coeffs, 1)).toBe(6);
    expect(polyEval(coeffs, 2)).toBe(17);
  });

  it('roundtrips: fit then eval recovers data', () => {
    const xs = [0, 1, 2, 3, 4];
    const ys = [2, 5, 10, 17, 26]; // 2 + x + x^2*2? Actually 2+3x
    const coeffs = polyFit(xs, ys, 2);
    for (let i = 0; i < xs.length; i++) {
      expect(polyEval(coeffs, xs[i])).toBeCloseTo(ys[i], 2);
    }
  });
});

describe('bonferroni', () => {
  it('divides alpha by number of tests', () => {
    expect(bonferroni(0.05, 10)).toBeCloseTo(0.005, 6);
  });

  it('single test returns alpha', () => {
    expect(bonferroni(0.05, 1)).toBe(0.05);
  });
});

describe('benjaminiHochberg', () => {
  it('rejects clearly significant p-values', () => {
    const pValues = [0.001, 0.01, 0.5, 0.9];
    const { results } = benjaminiHochberg(pValues, 0.05);
    expect(results[0]).toBe(true);
    expect(results[1]).toBe(true);
    expect(results[2]).toBe(false);
    expect(results[3]).toBe(false);
  });

  it('no rejections when all p-values are large', () => {
    const pValues = [0.5, 0.6, 0.7, 0.8];
    const { results } = benjaminiHochberg(pValues, 0.05);
    expect(results.every((r) => r === false)).toBe(true);
  });

  it('all rejected when all p-values are tiny', () => {
    const pValues = [0.001, 0.002, 0.003];
    const { results } = benjaminiHochberg(pValues, 0.05);
    expect(results.every((r) => r === true)).toBe(true);
  });

  it('returns sorted p-values', () => {
    const pValues = [0.03, 0.01, 0.04];
    const { sortedPValues } = benjaminiHochberg(pValues, 0.05);
    for (let i = 1; i < sortedPValues.length; i++) {
      expect(sortedPValues[i].p).toBeGreaterThanOrEqual(sortedPValues[i - 1].p);
    }
  });
});

describe('logGamma', () => {
  it('logGamma(1) = 0 (0! = 1)', () => {
    expect(logGamma(1)).toBeCloseTo(0, 4);
  });

  it('logGamma(2) = 0 (1! = 1)', () => {
    expect(logGamma(2)).toBeCloseTo(0, 4);
  });

  it('logGamma(5) = log(24)', () => {
    expect(logGamma(5)).toBeCloseTo(Math.log(24), 3);
  });

  it('logGamma(0.5) = log(√π)', () => {
    expect(logGamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 3);
  });
});

describe('betaPDF', () => {
  it('beta(1,1) is uniform', () => {
    expect(betaPDF(0.3, 1, 1)).toBeCloseTo(1, 3);
    expect(betaPDF(0.7, 1, 1)).toBeCloseTo(1, 3);
  });

  it('returns 0 at boundaries', () => {
    expect(betaPDF(0, 2, 2)).toBe(0);
    expect(betaPDF(1, 2, 2)).toBe(0);
  });

  it('symmetric beta has peak at 0.5', () => {
    const atHalf = betaPDF(0.5, 5, 5);
    const atQuarter = betaPDF(0.25, 5, 5);
    expect(atHalf).toBeGreaterThan(atQuarter);
  });

  it('skewed beta peaks toward higher α', () => {
    const left = betaPDF(0.3, 10, 2);
    const right = betaPDF(0.8, 10, 2);
    expect(right).toBeGreaterThan(left);
  });
});

describe('cohensD – Effect size', () => {
  it('zero for identical proportions', () => {
    expect(cohensD(0.5, 0.5)).toBe(0);
  });

  it('positive for different proportions', () => {
    expect(cohensD(0.1, 0.15)).toBeGreaterThan(0);
  });

  it('symmetric', () => {
    expect(cohensD(0.1, 0.2)).toBeCloseTo(cohensD(0.2, 0.1), 10);
  });
});

describe('mdeFromN / nFromMDE – Sample size ↔ MDE', () => {
  it('larger N gives smaller MDE', () => {
    const mde1 = mdeFromN(1000, 0.05, 0.8, 0.1);
    const mde2 = mdeFromN(10000, 0.05, 0.8, 0.1);
    expect(mde2).toBeLessThan(mde1);
  });

  it('round-trips approximately', () => {
    const n = 5000;
    const mde = mdeFromN(n, 0.05, 0.8, 0.1);
    const nBack = nFromMDE(mde, 0.05, 0.8, 0.1);
    expect(nBack).toBeCloseTo(n, -2); // within ~100
  });

  it('nFromMDE returns positive integer', () => {
    const n = nFromMDE(0.02, 0.05, 0.8, 0.1);
    expect(n).toBeGreaterThan(0);
    expect(Number.isInteger(n)).toBe(true);
  });
});

describe('obfBounds / pocockBounds – Sequential testing boundaries', () => {
  it('OBF boundaries decrease over stages', () => {
    const bounds = obfBounds(5, 0.05);
    expect(bounds).toHaveLength(5);
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i]).toBeLessThan(bounds[i - 1]);
    }
  });

  it('Pocock boundaries are constant', () => {
    const bounds = pocockBounds(5, 0.05);
    expect(bounds).toHaveLength(5);
    for (let i = 1; i < bounds.length; i++) {
      expect(bounds[i]).toBeCloseTo(bounds[0], 10);
    }
  });

  it('OBF first boundary is very high', () => {
    const bounds = obfBounds(5, 0.05);
    expect(bounds[0]).toBeGreaterThan(3);
  });
});

describe('alphaSpend', () => {
  it('OBF spends almost nothing early', () => {
    const spent = alphaSpend(1, 5, 0.05, 'obf');
    expect(spent).toBeLessThan(0.005);
  });

  it('Pocock spends linearly', () => {
    const s1 = alphaSpend(1, 5, 0.05, 'pocock');
    const s2 = alphaSpend(2, 5, 0.05, 'pocock');
    expect(s2).toBeCloseTo(2 * s1, 4);
  });

  it('full spending ≈ alpha', () => {
    const spent = alphaSpend(5, 5, 0.05, 'pocock');
    expect(spent).toBeCloseTo(0.05, 4);
  });
});

describe('cupedVariance / effectiveN', () => {
  it('no correlation → no reduction', () => {
    expect(cupedVariance(1.0, 0)).toBe(1.0);
    expect(effectiveN(1000, 0)).toBe(1000);
  });

  it('high correlation → large reduction', () => {
    const v = cupedVariance(1.0, 0.9);
    expect(v).toBeCloseTo(0.19, 1);
  });

  it('effective N increases with correlation', () => {
    const n = effectiveN(1000, 0.8);
    expect(n).toBeGreaterThan(2000);
  });
});

describe('kFoldSplit', () => {
  it('returns k folds', () => {
    const folds = kFoldSplit(100, 5, 42);
    expect(folds).toHaveLength(5);
  });

  it('each fold has train and test', () => {
    const folds = kFoldSplit(100, 5, 42);
    folds.forEach((f) => {
      expect(f.train.length).toBeGreaterThan(0);
      expect(f.test.length).toBeGreaterThan(0);
    });
  });

  it('test sets cover all indices', () => {
    const folds = kFoldSplit(20, 5, 42);
    const allTest = folds.flatMap((f) => f.test).sort((a, b) => a - b);
    expect(allTest).toHaveLength(20);
    expect(allTest).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('train and test are disjoint', () => {
    const folds = kFoldSplit(50, 5, 42);
    folds.forEach((f) => {
      const testSet = new Set(f.test);
      f.train.forEach((idx) => {
        expect(testSet.has(idx)).toBe(false);
      });
    });
  });

  it('deterministic with same seed', () => {
    const a = kFoldSplit(30, 3, 99);
    const b = kFoldSplit(30, 3, 99);
    expect(a).toEqual(b);
  });
});

// ── M30: Bayesian A/B Testing functions ──

describe('betaCDF – Regularized incomplete beta', () => {
  it('betaCDF(0.5, 1, 1) = 0.5 (uniform)', () => {
    expect(betaCDF(0.5, 1, 1)).toBeCloseTo(0.5, 4);
  });

  it('betaCDF(0, a, b) = 0', () => {
    expect(betaCDF(0, 5, 5)).toBe(0);
  });

  it('betaCDF(1, a, b) = 1', () => {
    expect(betaCDF(1, 5, 5)).toBe(1);
  });

  it('symmetric beta at 0.5 = 0.5', () => {
    expect(betaCDF(0.5, 10, 10)).toBeCloseTo(0.5, 3);
  });

  it('monotonically increasing', () => {
    const v1 = betaCDF(0.3, 5, 5);
    const v2 = betaCDF(0.5, 5, 5);
    const v3 = betaCDF(0.7, 5, 5);
    expect(v1).toBeLessThan(v2);
    expect(v2).toBeLessThan(v3);
  });
});

describe('betaQuantile – Inverse beta CDF', () => {
  it('round-trips with betaCDF', () => {
    const x = 0.3;
    const p = betaCDF(x, 5, 10);
    const xBack = betaQuantile(p, 5, 10);
    expect(xBack).toBeCloseTo(x, 3);
  });

  it('betaQuantile(0.5, 1, 1) = 0.5', () => {
    expect(betaQuantile(0.5, 1, 1)).toBeCloseTo(0.5, 4);
  });

  it('betaQuantile(0) = 0 and betaQuantile(1) = 1', () => {
    expect(betaQuantile(0, 5, 5)).toBe(0);
    expect(betaQuantile(1, 5, 5)).toBe(1);
  });
});

describe('probBBeatsA – P(B > A)', () => {
  it('equal distributions → ~0.5', () => {
    const p = probBBeatsA(50, 50, 50, 50);
    expect(p).toBeCloseTo(0.5, 1);
  });

  it('B clearly better → high probability', () => {
    const p = probBBeatsA(10, 90, 90, 10);
    expect(p).toBeGreaterThan(0.99);
  });

  it('B clearly worse → low probability', () => {
    const p = probBBeatsA(90, 10, 10, 90);
    expect(p).toBeLessThan(0.01);
  });
});

describe('expectedLossOfB – Expected loss', () => {
  it('zero loss when B is clearly better', () => {
    const loss = expectedLossOfB(10, 90, 90, 10);
    expect(loss).toBeLessThan(0.01);
  });

  it('positive loss when A is clearly better', () => {
    const loss = expectedLossOfB(90, 10, 10, 90);
    expect(loss).toBeGreaterThan(0.1);
  });

  it('non-negative', () => {
    const loss = expectedLossOfB(50, 50, 50, 50);
    expect(loss).toBeGreaterThanOrEqual(0);
  });
});

// ── M31: Ratio Metrics functions ──

describe('sRNormal – Seeded normal random', () => {
  it('deterministic for same seed', () => {
    expect(sRNormal(42)).toBe(sRNormal(42));
  });

  it('different seeds give different values', () => {
    expect(sRNormal(1)).not.toBe(sRNormal(2));
  });

  it('produces values roughly in normal range', () => {
    const vals = Array.from({ length: 100 }, (_, i) => sRNormal(i));
    const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
    expect(Math.abs(mean)).toBeLessThan(1); // loose check
  });
});

describe('deltaMethodVar – Delta method variance', () => {
  it('basic computation', () => {
    // V(X/Y) ≈ (varX - 2*r*covXY + r^2*varY) / muY^2
    const v = deltaMethodVar(10, 5, 4, 1, 0.5);
    const r = 10 / 5;
    const expected = (4 - 2 * r * 0.5 + r * r * 1) / 25;
    expect(v).toBeCloseTo(expected, 6);
  });

  it('zero denominator returns Infinity', () => {
    expect(deltaMethodVar(10, 0, 4, 1, 0.5)).toBe(Infinity);
  });
});

describe('ratioCI – Ratio confidence interval', () => {
  it('ratio is muX/muY', () => {
    const result = ratioCI(10, 5, 4, 1, 0.5, 100);
    expect(result.ratio).toBeCloseTo(2, 6);
  });

  it('CI contains the ratio', () => {
    const result = ratioCI(10, 5, 4, 1, 0.5, 100);
    expect(result.lo).toBeLessThan(result.ratio);
    expect(result.hi).toBeGreaterThan(result.ratio);
  });

  it('larger n gives narrower CI', () => {
    const small = ratioCI(10, 5, 4, 1, 0.5, 100);
    const large = ratioCI(10, 5, 4, 1, 0.5, 10000);
    expect(large.hi - large.lo).toBeLessThan(small.hi - small.lo);
  });
});

describe('naiveRatioVar – Naive (incorrect) ratio variance', () => {
  it('is positive', () => {
    expect(naiveRatioVar(10, 5, 4, 1, 100)).toBeGreaterThan(0);
  });

  it('differs from delta method (ignores covariance and denominator var)', () => {
    // Naive uses only varX / (muY^2 * n), delta method includes covXY and varY terms
    const naive = naiveRatioVar(10, 5, 4, 1, 100);
    const correct = deltaMethodVar(10, 5, 4, 1, 0.5) / 100;
    // They should differ since naive ignores denominator variance and covariance
    expect(naive).not.toBe(correct);
  });
});

// ── M33: Cluster Experiments functions ──

describe('designEffect', () => {
  it('DEFF = 1 when ICC = 0', () => {
    expect(designEffect(0, 50)).toBe(1);
  });

  it('DEFF increases with ICC', () => {
    expect(designEffect(0.1, 50)).toBeCloseTo(5.9, 2);
  });

  it('DEFF increases with cluster size', () => {
    const d1 = designEffect(0.05, 10);
    const d2 = designEffect(0.05, 100);
    expect(d2).toBeGreaterThan(d1);
  });
});

describe('clusterAdjustedN', () => {
  it('no adjustment when ICC = 0', () => {
    expect(clusterAdjustedN(1000, 0, 50)).toBe(1000);
  });

  it('effective N decreases with ICC', () => {
    expect(clusterAdjustedN(1000, 0.1, 50)).toBeLessThan(1000);
  });
});

describe('clusterAdjustedSE', () => {
  it('SE increases with ICC', () => {
    const se0 = clusterAdjustedSE(1, 0, 50);
    const se1 = clusterAdjustedSE(1, 0.1, 50);
    expect(se1).toBeGreaterThan(se0);
  });
});

describe('switchbackPower', () => {
  it('power increases with more clusters', () => {
    const p1 = switchbackPower(10, 5, 0.3, 0.05);
    const p2 = switchbackPower(10, 20, 0.3, 0.05);
    expect(p2).toBeGreaterThan(p1);
  });

  it('power decreases with higher ICC', () => {
    const p1 = switchbackPower(10, 10, 0.3, 0.01);
    const p2 = switchbackPower(10, 10, 0.3, 0.3);
    expect(p2).toBeLessThan(p1);
  });
});

// ── M34: Bootstrap & Permutation functions ──

describe('bootstrapSample', () => {
  it('returns same length as input', () => {
    const data = [1, 2, 3, 4, 5];
    const sample = bootstrapSample(data, 42);
    expect(sample).toHaveLength(5);
  });

  it('deterministic with same seed', () => {
    const data = [1, 2, 3, 4, 5];
    expect(bootstrapSample(data, 42)).toEqual(bootstrapSample(data, 42));
  });

  it('values come from original data', () => {
    const data = [10, 20, 30];
    const sample = bootstrapSample(data, 42);
    sample.forEach((v) => expect(data).toContain(v));
  });
});

describe('bootstrapCI', () => {
  it('CI contains the true mean for normal data', () => {
    const data = Array.from({ length: 50 }, (_, i) => 100 + (i % 10) - 5);
    const mean = (d: number[]) => d.reduce((s, v) => s + v, 0) / d.length;
    const ci = bootstrapCI(data, mean, 200, 0.05, 42);
    expect(ci.lo).toBeLessThan(100);
    expect(ci.hi).toBeGreaterThan(99);
  });

  it('returns sorted distribution', () => {
    const data = [1, 2, 3, 4, 5];
    const mean = (d: number[]) => d.reduce((s, v) => s + v, 0) / d.length;
    const ci = bootstrapCI(data, mean, 100, 0.05, 42);
    for (let i = 1; i < ci.dist.length; i++) {
      expect(ci.dist[i]).toBeGreaterThanOrEqual(ci.dist[i - 1]);
    }
  });
});

describe('permutationTest', () => {
  it('detects a clear difference', () => {
    const groupA = [1, 2, 3, 4, 5];
    const groupB = [10, 11, 12, 13, 14];
    const diffMeans = (a: number[], b: number[]) =>
      b.reduce((s, v) => s + v, 0) / b.length - a.reduce((s, v) => s + v, 0) / a.length;
    const result = permutationTest(groupA, groupB, diffMeans, 500, 42);
    expect(result.pValue).toBeLessThan(0.05);
  });

  it('no difference → non-significant', () => {
    const groupA = [5, 6, 5, 6, 5];
    const groupB = [5, 6, 5, 6, 5];
    const diffMeans = (a: number[], b: number[]) =>
      b.reduce((s, v) => s + v, 0) / b.length - a.reduce((s, v) => s + v, 0) / a.length;
    const result = permutationTest(groupA, groupB, diffMeans, 200, 42);
    expect(result.pValue).toBeGreaterThan(0.05);
  });
});

// ── M32: Multi-Armed Bandits functions ──

describe('betaSample', () => {
  it('returns value in [0, 1]', () => {
    for (let s = 0; s < 20; s++) {
      const v = betaSample(5, 5, s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it('deterministic with same seed', () => {
    expect(betaSample(2, 8, 42)).toBe(betaSample(2, 8, 42));
  });
});

describe('ucb1Score', () => {
  it('infinite for untried arm', () => {
    expect(ucb1Score(0, 0, 100)).toBe(Infinity);
  });

  it('decreases exploration bonus with more trials', () => {
    const s1 = ucb1Score(5, 10, 100);
    const s2 = ucb1Score(50, 100, 1000);
    // Both have 50% win rate, but exploration bonus differs
    expect(s1).not.toEqual(s2);
  });

  it('higher win rate gives higher base score', () => {
    const s1 = ucb1Score(9, 10, 100); // 90% win rate
    const s2 = ucb1Score(1, 10, 100); // 10% win rate
    expect(s1).toBeGreaterThan(s2);
  });
});

describe('cumulativeRegret', () => {
  it('returns correct length', () => {
    const rewards = [0.5, 0.3, 0.8, 0.4];
    const regret = cumulativeRegret(rewards, 0.9);
    expect(regret).toHaveLength(4);
  });

  it('monotonically non-decreasing', () => {
    const rewards = [0.5, 0.3, 0.8, 0.4, 0.6];
    const regret = cumulativeRegret(rewards, 0.9);
    for (let i = 1; i < regret.length; i++) {
      expect(regret[i]).toBeGreaterThanOrEqual(regret[i - 1]);
    }
  });

  it('zero regret when rewards equal optimal', () => {
    const rewards = [0.5, 0.5, 0.5];
    const regret = cumulativeRegret(rewards, 0.5);
    regret.forEach((r) => expect(r).toBeCloseTo(0, 10));
  });
});
