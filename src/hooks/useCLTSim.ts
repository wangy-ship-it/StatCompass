import { useState, useCallback, useRef, useEffect } from 'react';
import { sR } from '../utils/math';

/* ── Population statistics for each shape ── */

export const popStats: Record<string, { mean: number; sd: number }> = {
  uniform: { mean: 0.5, sd: 0.289 },
  exponential: { mean: 0.5, sd: 0.5 },
  bimodal: { mean: 0.5, sd: 0.21 },
};

/* ── Sampling helpers ── */

function sRNormalPair(seed: number): number {
  const u1 = Math.max(sR(seed), 1e-15);
  const u2 = sR(seed + 1);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function sampleValue(shape: string, seed: number): number {
  if (shape === 'exponential') {
    const u = Math.max(sR(seed), 1e-15);
    return -Math.log(u) / 2;
  }
  if (shape === 'bimodal') {
    const pick = sR(seed);
    const z = sRNormalPair(seed + 2);
    return pick < 0.5 ? 0.3 + 0.08 * z : 0.7 + 0.08 * z;
  }
  // uniform [0,1]
  return sR(seed);
}

/* ── State interface ── */

export interface CLTSimState {
  means: number[];
  binRange: [number, number];
  mu: number;
  seMean: number;
  step: number;
  running: boolean;
}

interface UseCLTSimReturn {
  state: CLTSimState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepOnce: () => void;
}

const BATCH = 5;
const MAX_SAMPLES = 500;

export default function useCLTSim(
  popShape: string,
  sampleSize: number,
  speed: number,
): UseCLTSimReturn {
  const n = Math.round(sampleSize);

  const buildInit = useCallback((): CLTSimState => {
    const mu = popStats[popShape]?.mean ?? 0.5;
    const sigma = popStats[popShape]?.sd ?? 0.289;
    const seMean = sigma / Math.sqrt(Math.max(n, 1));

    // Pre-compute stable bin range: μ ± 4.5·SE
    const span = 4.5 * seMean;
    const binRange: [number, number] = [mu - span, mu + span];

    return {
      means: [],
      binRange,
      mu,
      seMean,
      step: 0,
      running: false,
    };
  }, [popShape, n]);

  const [state, setState] = useState<CLTSimState>(buildInit);

  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doStep = useCallback(() => {
    setState((prev) => {
      const newMeans = prev.means.slice();
      const end = Math.min(prev.step + BATCH, MAX_SAMPLES);

      for (let i = prev.step; i < end; i++) {
        let sum = 0;
        for (let j = 0; j < n; j++) {
          const seed = i * 1000 + j * 7 + 42;
          sum += sampleValue(popShape, seed);
        }
        newMeans.push(sum / n);
      }

      return {
        ...prev,
        means: newMeans,
        step: end,
      };
    });
  }, [popShape, n]);

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
    if (state.step >= MAX_SAMPLES) {
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
  }, [state.running, state.step, speed, doStep]);

  // Reset when parameters change
  useEffect(() => {
    reset();
  }, [popShape, n, reset]);

  return { state, start, pause, reset, stepOnce };
}
