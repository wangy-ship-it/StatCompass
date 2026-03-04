import { useState, useCallback, useRef, useEffect } from 'react';
import { sR, obfBounds, pocockBounds, alphaSpend } from '../utils/math';

export interface SeqSimState {
  zPath: number[];
  currentStage: number;
  crossed: 'upper' | 'lower' | null;
  stoppedAt: number | null;
  cumAlpha: number;
  completedRuns: number;
  earlyStopCount: number;
  running: boolean;
  bounds: number[];
}

interface UseSeqSimReturn {
  state: SeqSimState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepOnce: () => void;
}

const MAX_RUNS = 20;

export default function useSequentialSim(
  nLooks: number,
  trueEffect: number,
  maxN: number,
  method: string,
  speed: number,
): UseSeqSimReturn {
  const safeNLooks = Math.max(2, Math.round(nLooks));

  const buildInit = useCallback((): SeqSimState => {
    const bounds = method === 'obf' ? obfBounds(safeNLooks, 0.05) : pocockBounds(safeNLooks, 0.05);
    return {
      zPath: [],
      currentStage: 0,
      crossed: null,
      stoppedAt: null,
      cumAlpha: 0,
      completedRuns: 0,
      earlyStopCount: 0,
      running: false,
      bounds,
    };
  }, [safeNLooks, method]);

  const [state, setState] = useState<SeqSimState>(buildInit);

  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seedRef = useRef(1);

  const doStep = useCallback(() => {
    setState((prev) => {
      // If we've completed all runs, stop
      if (prev.completedRuns >= MAX_RUNS) {
        return { ...prev, running: false };
      }

      const nextStage = prev.currentStage + 1;
      const seed = seedRef.current * 1000 + prev.completedRuns * 200 + nextStage * 41;

      // Generate next z-score
      const noise = (sR(seed) - 0.5) * 1.2;
      const cumNoise =
        prev.zPath.reduce((sum, _, k) => {
          return (
            sum + (sR(seedRef.current * 1000 + prev.completedRuns * 200 + (k + 1) * 41) - 0.5) * 1.2
          );
        }, 0) + noise;
      const zk =
        trueEffect * Math.sqrt((nextStage * maxN) / (safeNLooks * 10000)) +
        cumNoise / Math.sqrt(nextStage);

      const newPath = [...prev.zPath, zk];

      // Check boundary crossing
      let crossed = prev.crossed;
      let stoppedAt = prev.stoppedAt;
      if (crossed === null) {
        if (zk >= prev.bounds[nextStage - 1]) {
          crossed = 'upper';
          stoppedAt = nextStage;
        } else if (zk <= -prev.bounds[nextStage - 1]) {
          crossed = 'lower';
          stoppedAt = nextStage;
        }
      }

      // Compute cumulative alpha
      let cumAlpha = 0;
      const stopStage = stoppedAt ?? nextStage;
      for (let k = 1; k <= stopStage; k++) {
        cumAlpha = alphaSpend(k, safeNLooks, 0.05, method === 'obf' ? 'obf' : 'pocock');
      }

      // Path completed: either crossed a boundary or reached final stage
      const pathDone = crossed !== null || nextStage >= safeNLooks;

      if (pathDone) {
        const newCompletedRuns = prev.completedRuns + 1;
        const earlyStop = (stoppedAt ?? nextStage) < safeNLooks;
        const newEarlyStopCount = prev.earlyStopCount + (earlyStop ? 1 : 0);

        // If we haven't hit MAX_RUNS, auto-reset for next run
        if (newCompletedRuns < MAX_RUNS) {
          seedRef.current++;
          return {
            ...prev,
            zPath: [],
            currentStage: 0,
            crossed: null,
            stoppedAt: null,
            cumAlpha: 0,
            completedRuns: newCompletedRuns,
            earlyStopCount: newEarlyStopCount,
          };
        }

        // Final run done
        return {
          ...prev,
          zPath: newPath,
          currentStage: nextStage,
          crossed,
          stoppedAt,
          cumAlpha,
          completedRuns: newCompletedRuns,
          earlyStopCount: newEarlyStopCount,
          running: false,
        };
      }

      return {
        ...prev,
        zPath: newPath,
        currentStage: nextStage,
        crossed,
        stoppedAt,
        cumAlpha,
      };
    });
  }, [trueEffect, maxN, safeNLooks, method]);

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
    seedRef.current = 1;
    setState(buildInit());
  }, [buildInit]);

  const stepOnce = useCallback(() => {
    doStep();
  }, [doStep]);

  // Auto-step when running
  useEffect(() => {
    if (!state.running) return;
    if (state.completedRuns >= MAX_RUNS) {
      runningRef.current = false;
      setState((prev) => ({ ...prev, running: false }));
      return;
    }
    const delay = Math.max(30, 400 - speed * 4);
    timerRef.current = setTimeout(() => {
      if (runningRef.current) doStep();
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state.running, state.currentStage, state.completedRuns, speed, doStep]);

  // Reset when parameters change
  useEffect(() => {
    reset();
  }, [safeNLooks, trueEffect, maxN, method, reset]);

  return { state, start, pause, reset, stepOnce };
}
