import { useState, useCallback, useRef, useEffect } from 'react';
import { sR } from '../utils/math';

export interface AASimState {
  pValues: number[];
  falsePositives: number;
  fpr: number;
  step: number;
  running: boolean;
}

interface UseAASimReturn {
  state: AASimState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepOnce: () => void;
}

const MAX_TESTS = 500;

export default function useAASim(alpha: number, speed: number): UseAASimReturn {
  const buildInit = useCallback((): AASimState => {
    return {
      pValues: [],
      falsePositives: 0,
      fpr: 0,
      step: 0,
      running: false,
    };
  }, []);

  const [state, setState] = useState<AASimState>(buildInit);

  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doStep = useCallback(() => {
    setState((prev) => {
      if (prev.step >= MAX_TESTS) {
        return { ...prev, running: false };
      }

      const i = prev.step;
      // Generate a uniform p-value (A/A test: both groups identical)
      const pValue = sR(42 * 1000 + i * 71 + 200);

      const newPValues = [...prev.pValues, pValue];
      const isFP = pValue < alpha;
      const newFP = prev.falsePositives + (isFP ? 1 : 0);
      const newStep = prev.step + 1;
      const newFPR = newFP / newStep;

      return {
        pValues: newPValues,
        falsePositives: newFP,
        fpr: newFPR,
        step: newStep,
        running: newStep >= MAX_TESTS ? false : prev.running,
      };
    });
  }, [alpha]);

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
    if (state.step >= MAX_TESTS) {
      runningRef.current = false;
      setState((prev) => ({ ...prev, running: false }));
      return;
    }
    const delay = Math.max(5, 80 - speed);
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
  }, [alpha, reset]);

  return { state, start, pause, reset, stepOnce };
}
