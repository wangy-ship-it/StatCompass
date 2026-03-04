import { useState, useCallback, useRef, useEffect } from 'react';
import { sR, sRNormal, bootstrapSample, zInv } from '../utils/math';

/* ── Distribution generators (same as M34) ── */

const dists: Record<string, (seed: number, n: number) => number[]> = {
  normal: (seed, n) => Array.from({ length: n }, (_, i) => sRNormal(seed + i) * 10 + 50),
  skewed: (seed, n) => Array.from({ length: n }, (_, i) => Math.exp(sRNormal(seed + i) * 0.5 + 2)),
  bimodal: (seed, n) =>
    Array.from(
      { length: n },
      (_, i) => sRNormal(seed + i) * 5 + (sR(seed + i * 3) > 0.5 ? 60 : 40),
    ),
  heavy: (seed, n) =>
    Array.from({ length: n }, (_, i) => (sRNormal(seed + i) * 10) / (0.3 + sR(seed + i * 5)) + 50),
};

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function std(arr: number[]): number {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

/* ── State interface ── */

export interface BootstrapSimState {
  groupA: number[];
  groupB: number[];
  meanA: number;
  meanB: number;
  diffMean: number;
  sdA: number;
  sdB: number;
  seDiff: number;
  paramLo: number;
  paramHi: number;
  bootDist: number[];
  bootLo: number;
  bootHi: number;
  permDist: number[];
  permPValue: number;
  observedDiff: number;
  bootBinRange: [number, number];
  permBinRange: [number, number];
  bootStep: number;
  permStep: number;
  running: boolean;
}

interface UseBootstrapSimReturn {
  state: BootstrapSimState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepOnce: () => void;
}

const BATCH = 10;

export default function useBootstrapSim(
  distKey: string,
  sampleSize: number,
  nResamples: number,
  speed: number,
): UseBootstrapSimReturn {
  const n = Math.round(sampleSize);
  const nBoot = Math.round(nResamples);
  const gen = dists[distKey] || dists.skewed;

  const buildInit = useCallback((): BootstrapSimState => {
    const groupA = gen(1000, n);
    const groupB = gen(2000, n).map((v) => v + 5);
    const meanA = mean(groupA);
    const meanB = mean(groupB);
    const diffMean = meanB - meanA;
    const sdA = std(groupA);
    const sdB = std(groupB);
    const seDiff = Math.sqrt(sdA ** 2 / n + sdB ** 2 / n);
    const z = zInv(0.05);
    const paramLo = diffMean - z * seDiff;
    const paramHi = diffMean + z * seDiff;

    // Pre-compute stable bin ranges
    const bootSpan = 4 * seDiff;
    const bootBinRange: [number, number] = [diffMean - bootSpan, diffMean + bootSpan];

    const nullSE = Math.sqrt((sdA ** 2 + sdB ** 2) / n);
    const permSpan = 4 * nullSE;
    const permBinRange: [number, number] = [-permSpan, permSpan];

    return {
      groupA,
      groupB,
      meanA,
      meanB,
      diffMean,
      sdA,
      sdB,
      seDiff,
      paramLo,
      paramHi,
      bootDist: [],
      bootLo: 0,
      bootHi: 0,
      permDist: [],
      permPValue: 1,
      observedDiff: diffMean,
      bootBinRange,
      permBinRange,
      bootStep: 0,
      permStep: 0,
      running: false,
    };
  }, [gen, n]);

  const [state, setState] = useState<BootstrapSimState>(buildInit);

  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doStep = useCallback(() => {
    setState((prev) => {
      const newBootDist = prev.bootDist.slice();
      const newPermDist = prev.permDist.slice();
      let bootStep = prev.bootStep;
      let permStep = prev.permStep;

      // Bootstrap resamples
      const bootEnd = Math.min(bootStep + BATCH, nBoot);
      for (let b = bootStep; b < bootEnd; b++) {
        const sA = bootstrapSample(prev.groupA, 42 + b * 13);
        const sB = bootstrapSample(prev.groupB, 42 + b * 13 + 7);
        newBootDist.push(mean(sB) - mean(sA));
      }
      bootStep = bootEnd;

      // Permutation resamples
      const permEnd = Math.min(permStep + BATCH, nBoot);
      const combined = [...prev.groupA, ...prev.groupB];
      const nA = prev.groupA.length;
      for (let p = permStep; p < permEnd; p++) {
        const shuffled = [...combined];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(sR(99 + p * 100 + i) * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        const permA = shuffled.slice(0, nA);
        const permB = shuffled.slice(nA);
        newPermDist.push(mean(permB) - mean(permA));
      }
      permStep = permEnd;

      // Recompute bootstrap CI
      const sorted = newBootDist.slice().sort((a, b) => a - b);
      const len = sorted.length;
      const bootLo = len > 0 ? sorted[Math.floor(0.025 * len)] : 0;
      const bootHi = len > 0 ? sorted[Math.min(Math.floor(0.975 * len), len - 1)] : 0;

      // Recompute permutation p-value
      let count = 0;
      for (const v of newPermDist) {
        if (Math.abs(v) >= Math.abs(prev.observedDiff)) count++;
      }
      const permPValue = newPermDist.length > 0 ? count / newPermDist.length : 1;

      return {
        ...prev,
        bootDist: newBootDist,
        bootLo,
        bootHi,
        permDist: newPermDist,
        permPValue,
        bootStep,
        permStep,
      };
    });
  }, [nBoot]);

  const start = useCallback(() => {
    runningRef.current = true;
    setState((prev) => ({ ...prev, running: true }));
  }, []);

  const pause = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState((prev) => ({ ...prev, running: false }));
  }, []);

  const reset = useCallback(() => {
    runningRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setState(buildInit());
  }, [buildInit]);

  const stepOnce = useCallback(() => {
    doStep();
  }, [doStep]);

  // Auto-step when running
  useEffect(() => {
    if (!state.running) return;
    if (state.bootStep >= nBoot && state.permStep >= nBoot) {
      runningRef.current = false;
      setState((prev) => ({ ...prev, running: false }));
      return;
    }
    const delay = Math.max(10, 200 - speed * 2);
    timerRef.current = setTimeout(() => {
      if (runningRef.current) doStep();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.running, state.bootStep, state.permStep, nBoot, speed, doStep]);

  // Reset when parameters change
  useEffect(() => {
    reset();
  }, [distKey, n, nBoot, reset]);

  return { state, start, pause, reset, stepOnce };
}
