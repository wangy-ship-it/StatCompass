// ── Core statistical functions ──

export const nPDF = (x: number, m: number, s: number): number =>
  (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - m) / s, 2));

export const nCDF = (x: number, m: number, s: number): number => {
  const z = (x - m) / s;
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const p =
    0.3989422804 *
    Math.exp((-z * z) / 2) *
    (t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.3302744)))));
  return z > 0 ? 1 - p : p;
};

export const zInv = (a: number): number => {
  const p = 1 - a / 2;
  const A = [-39.69683, 220.9461, -275.9285, 138.3578, -30.6648, 2.506628];
  const B = [-54.4761, 161.5858, -155.699, 66.80131, -13.28068];
  const C = [-0.007784894, -0.3223965, -2.400758, -2.549733, 4.374664, 2.938164];
  const D = [0.007784696, 0.3224671, 2.445134, 3.754409];
  let q: number;
  if (p < 0.02425) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    );
  } else if (p <= 0.97575) {
    q = p - 0.5;
    const r = q * q;
    return (
      ((((((A[0] * r + A[1]) * r + A[2]) * r + A[3]) * r + A[4]) * r + A[5]) * q) /
      (((((B[0] * r + B[1]) * r + B[2]) * r + B[3]) * r + B[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(((((C[0] * q + C[1]) * q + C[2]) * q + C[3]) * q + C[4]) * q + C[5]) /
      ((((D[0] * q + D[1]) * q + D[2]) * q + D[3]) * q + 1)
    );
  }
};

export const sR = (s: number): number => {
  const x = Math.sin(s * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

// ── M7: Lift Calculator helpers ──

export const sePropDiff = (p1: number, p2: number, n: number): number =>
  Math.sqrt((p1 * (1 - p1)) / n + (p2 * (1 - p2)) / n);

export interface LiftCIResult {
  absLift: number;
  relLift: number;
  se: number;
  ciLo: number;
  ciHi: number;
  pValue: number;
  significant: boolean;
  zStat: number;
}

export const liftCI = (pC: number, pT: number, n: number, alpha = 0.05): LiftCIResult => {
  const absLift = pT - pC;
  const relLift = pC > 0 ? ((pT - pC) / pC) * 100 : 0;
  const se = sePropDiff(pC, pT, n);
  const z = zInv(alpha);
  const ciLo = absLift - z * se;
  const ciHi = absLift + z * se;
  const zStat = se > 0 ? absLift / se : 0;
  const pValue = 2 * (1 - nCDF(Math.abs(zStat), 0, 1));
  const significant = pValue < alpha;
  return { absLift, relLift, se, ciLo, ciHi, pValue, significant, zStat };
};

// ── M10: Polynomial regression ──

export const polyFit = (xs: number[], ys: number[], deg: number): number[] => {
  const n = xs.length;
  const d = deg + 1;
  const XtX = Array.from({ length: d }, () => new Array(d).fill(0) as number[]);
  const XtY = new Array(d).fill(0) as number[];

  for (let i = 0; i < n; i++) {
    const xPow = [1];
    for (let j = 1; j < d; j++) xPow.push(xPow[j - 1] * xs[i]);
    for (let j = 0; j < d; j++) {
      XtY[j] += xPow[j] * ys[i];
      for (let k = 0; k < d; k++) {
        XtX[j][k] += xPow[j] * xPow[k];
      }
    }
  }

  const aug = XtX.map((row, i) => [...row, XtY[i]]);
  for (let col = 0; col < d; col++) {
    let maxRow = col;
    for (let row = col + 1; row < d; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[maxRow][col])) maxRow = row;
    }
    [aug[col], aug[maxRow]] = [aug[maxRow], aug[col]];
    if (Math.abs(aug[col][col]) < 1e-12) continue;
    for (let row = col + 1; row < d; row++) {
      const f = aug[row][col] / aug[col][col];
      for (let j = col; j <= d; j++) aug[row][j] -= f * aug[col][j];
    }
  }

  const coeffs = new Array(d).fill(0) as number[];
  for (let i = d - 1; i >= 0; i--) {
    coeffs[i] = aug[i][d];
    for (let j = i + 1; j < d; j++) coeffs[i] -= aug[i][j] * coeffs[j];
    coeffs[i] /= aug[i][i] || 1;
  }
  return coeffs;
};

export const polyEval = (coeffs: number[], x: number): number => {
  let y = 0;
  let xp = 1;
  for (let i = 0; i < coeffs.length; i++) {
    y += coeffs[i] * xp;
    xp *= x;
  }
  return y;
};

// ── M11: Multiple testing corrections ──

export const bonferroni = (alpha: number, nTests: number): number => alpha / nTests;

export interface BHResult {
  results: boolean[];
  sortedPValues: { p: number; i: number }[];
}

export const benjaminiHochberg = (pValues: number[], alpha: number): BHResult => {
  const n = pValues.length;
  const indexed = pValues.map((p, i) => ({ p, i }));
  indexed.sort((a, b) => a.p - b.p);

  const results = new Array(n).fill(false) as boolean[];
  let maxK = -1;
  for (let k = 0; k < n; k++) {
    const threshold = ((k + 1) / n) * alpha;
    if (indexed[k].p <= threshold) maxK = k;
  }
  for (let k = 0; k <= maxK; k++) {
    results[indexed[k].i] = true;
  }
  return { results, sortedPValues: indexed };
};

// ── M13: Beta distribution / Bayesian ──

export const logGamma = (x: number): number => {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
};

export const betaPDF = (x: number, a: number, b: number): number => {
  if (x <= 0 || x >= 1) return 0;
  const logB = logGamma(a) + logGamma(b) - logGamma(a + b);
  return Math.exp((a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x) - logB);
};

// ── M16: Effect size & MDE ──

export const cohensD = (p1: number, p2: number): number => {
  const pooledSD = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / 2);
  return pooledSD > 0 ? Math.abs(p2 - p1) / pooledSD : 0;
};

export const mdeFromN = (n: number, alpha: number, power: number, p: number): number => {
  const za = zInv(alpha);
  const zb = -zInv((1 - power) * 2);
  const se = Math.sqrt((2 * p * (1 - p)) / n);
  return (za + zb) * se;
};

export const nFromMDE = (mde: number, alpha: number, power: number, p: number): number => {
  const za = zInv(alpha);
  const zb = -zInv((1 - power) * 2);
  return Math.ceil((2 * p * (1 - p) * Math.pow(za + zb, 2)) / Math.pow(mde, 2));
};

// ── M18: Sequential testing boundaries ──

export const obfBounds = (stages: number, alpha: number): number[] => {
  const za = zInv(alpha);
  return Array.from({ length: stages }, (_, k) => za * Math.sqrt(stages / (k + 1)));
};

export const pocockBounds = (stages: number, alpha: number): number[] => {
  const za = zInv(alpha / stages);
  return Array.from({ length: stages }, () => za);
};

export const alphaSpend = (stage: number, total: number, alpha: number, method: string): number => {
  const t = stage / total;
  if (method === 'obf') {
    const z = zInv(alpha) / Math.sqrt(t);
    return 2 * (1 - nCDF(z, 0, 1));
  }
  return alpha * t;
};

// ── M22: CUPED / Variance reduction ──

export const cupedVariance = (originalVar: number, rho: number): number =>
  originalVar * (1 - rho * rho);

export const effectiveN = (n: number, rho: number): number => n / (1 - rho * rho);

// ── M20: Cross-validation ──

export interface KFoldSplit {
  train: number[];
  test: number[];
}

export const kFoldSplit = (n: number, k: number, seed: number): KFoldSplit[] => {
  const indices = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(sR(seed + i * 31) * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const foldSize = Math.floor(n / k);
  return Array.from({ length: k }, (_, f) => {
    const testStart = f * foldSize;
    const testEnd = f === k - 1 ? n : testStart + foldSize;
    const test = indices.slice(testStart, testEnd);
    const train = [...indices.slice(0, testStart), ...indices.slice(testEnd)];
    return { train, test };
  });
};
