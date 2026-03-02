import { useState, useCallback, useRef, useEffect } from 'react';
import { betaSample, ucb1Score, sR } from '../utils/math';

export type Algorithm = 'thompson' | 'epsilon' | 'ucb1';

interface ArmState {
  wins: number;
  trials: number;
}

interface SimState {
  arms: ArmState[];
  totalTrials: number;
  rewards: number[];
  selectedArms: number[];
  running: boolean;
  step: number;
}

interface UseBanditSimReturn {
  state: SimState;
  start: () => void;
  pause: () => void;
  reset: () => void;
  stepOnce: () => void;
}

export default function useBanditSim(
  nArms: number,
  trueProbs: number[],
  algorithm: Algorithm,
  epsilon: number,
  speed: number,
): UseBanditSimReturn {
  const [state, setState] = useState<SimState>(() => ({
    arms: Array.from({ length: nArms }, () => ({ wins: 0, trials: 0 })),
    totalTrials: 0,
    rewards: [],
    selectedArms: [],
    running: false,
    step: 0,
  }));

  // Stable reference for trueProbs to use in dependency arrays
  const trueProbsKey = trueProbs.join(',');

  const runningRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectArm = useCallback(
    (arms: ArmState[], totalTrials: number, step: number): number => {
      switch (algorithm) {
        case 'thompson': {
          let bestArm = 0;
          let bestSample = -1;
          for (let i = 0; i < arms.length; i++) {
            const a = arms[i].wins + 1;
            const b = arms[i].trials - arms[i].wins + 1;
            const sample = betaSample(a, b, step * 100 + i * 17);
            if (sample > bestSample) {
              bestSample = sample;
              bestArm = i;
            }
          }
          return bestArm;
        }
        case 'epsilon': {
          if (sR(step * 73 + 11) < epsilon) {
            return Math.floor(sR(step * 37 + 7) * arms.length);
          }
          let bestArm = 0;
          let bestRate = -1;
          for (let i = 0; i < arms.length; i++) {
            const rate = arms[i].trials > 0 ? arms[i].wins / arms[i].trials : 0;
            if (rate > bestRate) {
              bestRate = rate;
              bestArm = i;
            }
          }
          return bestArm;
        }
        case 'ucb1': {
          let bestArm = 0;
          let bestScore = -1;
          for (let i = 0; i < arms.length; i++) {
            const score = ucb1Score(arms[i].wins, arms[i].trials, Math.max(totalTrials, 1));
            if (score > bestScore) {
              bestScore = score;
              bestArm = i;
            }
          }
          return bestArm;
        }
      }
    },
    [algorithm, epsilon],
  );

  const doStep = useCallback(() => {
    setState((prev) => {
      const arm = selectArm(prev.arms, prev.totalTrials, prev.step);
      const reward =
        sR(prev.step * 53 + arm * 19 + 3) < trueProbs[Math.min(arm, trueProbs.length - 1)] ? 1 : 0;
      const newArms = prev.arms.map((a, i) =>
        i === arm ? { wins: a.wins + reward, trials: a.trials + 1 } : a,
      );
      const newRewards = prev.rewards.slice();
      newRewards.push(reward);
      const newSelectedArms = prev.selectedArms.slice();
      newSelectedArms.push(arm);
      return {
        ...prev,
        arms: newArms,
        totalTrials: prev.totalTrials + 1,
        rewards: newRewards,
        selectedArms: newSelectedArms,
        step: prev.step + 1,
      };
    });
  }, [selectArm, trueProbs]);

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
    setState({
      arms: Array.from({ length: nArms }, () => ({ wins: 0, trials: 0 })),
      totalTrials: 0,
      rewards: [],
      selectedArms: [],
      running: false,
      step: 0,
    });
  }, [nArms]);

  const stepOnce = useCallback(() => {
    doStep();
  }, [doStep]);

  // Auto-step when running
  useEffect(() => {
    if (!state.running) return;
    if (state.totalTrials >= 1000) {
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
  }, [state.running, state.totalTrials, speed, doStep]);

  // Reset when parameters change
  useEffect(() => {
    reset();
  }, [nArms, algorithm, trueProbsKey, reset]);

  return { state, start, pause, reset, stepOnce };
}
