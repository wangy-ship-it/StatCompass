import { useState, useCallback, useRef, useEffect } from 'react';
import { sR, probBBeatsA, expectedLossOfB } from '../utils/math';

export interface BayesianSimState {
  visitorsA: number;
  visitorsB: number;
  conversionsA: number;
  conversionsB: number;
  postAlphaA: number;
  postBetaA: number;
  postAlphaB: number;
  postBetaB: number;
  pBbeatsA: number;
  expectedLoss: number;
  step: number;
  running: boolean;
}

interface UseBayesianSimReturn {
  state: BayesianSimState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepOnce: () => void;
}

const BATCH_SIZE = 20;
const MAX_STEPS = 100; // 100 steps * 20 visitors = 2000 per arm

export default function useBayesianSim(
  trueRateA: number,
  trueRateB: number,
  priorA: number,
  priorB: number,
  speed: number,
): UseBayesianSimReturn {
  const buildInit = useCallback((): BayesianSimState => {
    return {
      visitorsA: 0,
      visitorsB: 0,
      conversionsA: 0,
      conversionsB: 0,
      postAlphaA: priorA,
      postBetaA: priorB,
      postAlphaB: priorA,
      postBetaB: priorB,
      pBbeatsA: 0.5,
      expectedLoss: 0,
      step: 0,
      running: false,
    };
  }, [priorA, priorB]);

  const [state, setState] = useState<BayesianSimState>(buildInit);

  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doStep = useCallback(() => {
    setState((prev) => {
      if (prev.step >= MAX_STEPS) {
        return { ...prev, running: false };
      }

      const stepIdx = prev.step;
      let newConvA = 0;
      let newConvB = 0;

      // Simulate BATCH_SIZE visitors per arm
      for (let j = 0; j < BATCH_SIZE; j++) {
        const seedA = stepIdx * 1000 + j * 7 + 42;
        const seedB = stepIdx * 1000 + j * 7 + 999;
        if (sR(seedA) < trueRateA) newConvA++;
        if (sR(seedB) < trueRateB) newConvB++;
      }

      const totalConvA = prev.conversionsA + newConvA;
      const totalConvB = prev.conversionsB + newConvB;
      const totalVisA = prev.visitorsA + BATCH_SIZE;
      const totalVisB = prev.visitorsB + BATCH_SIZE;

      const postAlphaA = priorA + totalConvA;
      const postBetaA = priorB + totalVisA - totalConvA;
      const postAlphaB = priorA + totalConvB;
      const postBetaB = priorB + totalVisB - totalConvB;

      // Compute P(B>A) — use lightweight computation for real-time
      const pBB = probBBeatsA(postAlphaA, postBetaA, postAlphaB, postBetaB);
      const expLoss = expectedLossOfB(postAlphaA, postBetaA, postAlphaB, postBetaB);

      const newStep = stepIdx + 1;

      return {
        visitorsA: totalVisA,
        visitorsB: totalVisB,
        conversionsA: totalConvA,
        conversionsB: totalConvB,
        postAlphaA,
        postBetaA,
        postAlphaB,
        postBetaB,
        pBbeatsA: pBB,
        expectedLoss: expLoss,
        step: newStep,
        running: newStep >= MAX_STEPS ? false : prev.running,
      };
    });
  }, [trueRateA, trueRateB, priorA, priorB]);

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
    if (state.step >= MAX_STEPS) {
      runningRef.current = false;
      setState((prev) => ({ ...prev, running: false }));
      return;
    }
    const delay = Math.max(30, 300 - speed * 3);
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
  }, [trueRateA, trueRateB, priorA, priorB, reset]);

  return { state, start, pause, reset, stepOnce };
}
