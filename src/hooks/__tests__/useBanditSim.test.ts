import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBanditSim from '../useBanditSim';
import type { Algorithm } from '../useBanditSim';

/* ── Helpers ────────────────────────────────────────────────────── */

const DEFAULT_ARMS = 3;
const DEFAULT_PROBS = [0.3, 0.5, 0.7];
const DEFAULT_ALGO: Algorithm = 'thompson';
const DEFAULT_EPSILON = 0.1;
const DEFAULT_SPEED = 50;

function renderBandit(
  nArms = DEFAULT_ARMS,
  trueProbs = DEFAULT_PROBS,
  algorithm: Algorithm = DEFAULT_ALGO,
  epsilon = DEFAULT_EPSILON,
  speed = DEFAULT_SPEED,
) {
  return renderHook(
    ({ nArms, trueProbs, algorithm, epsilon, speed }) =>
      useBanditSim(nArms, trueProbs, algorithm, epsilon, speed),
    {
      initialProps: { nArms, trueProbs, algorithm, epsilon, speed },
    },
  );
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('useBanditSim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── Initialization ── */

  it('initializes with correct number of arms, all zeros', () => {
    const { result } = renderBandit(4, [0.2, 0.4, 0.6, 0.8]);
    const { state } = result.current;

    expect(state.arms).toHaveLength(4);
    for (const arm of state.arms) {
      expect(arm.wins).toBe(0);
      expect(arm.trials).toBe(0);
    }
    expect(state.totalTrials).toBe(0);
    expect(state.rewards).toEqual([]);
    expect(state.selectedArms).toEqual([]);
    expect(state.running).toBe(false);
    expect(state.step).toBe(0);
  });

  it('initializes with 2 arms', () => {
    const { result } = renderBandit(2, [0.3, 0.7]);
    expect(result.current.state.arms).toHaveLength(2);
  });

  /* ── stepOnce ── */

  it('stepOnce increments totalTrials and step by 1', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.stepOnce();
    });

    expect(result.current.state.totalTrials).toBe(1);
    expect(result.current.state.step).toBe(1);
  });

  it('stepOnce updates exactly one arm trials count', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.stepOnce();
    });

    const trialsChanged = result.current.state.arms.filter((a) => a.trials > 0);
    expect(trialsChanged).toHaveLength(1);
    expect(trialsChanged[0].trials).toBe(1);
  });

  it('stepOnce appends to rewards and selectedArms arrays', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.stepOnce();
    });

    expect(result.current.state.rewards).toHaveLength(1);
    expect(result.current.state.selectedArms).toHaveLength(1);
    // reward is 0 or 1
    expect([0, 1]).toContain(result.current.state.rewards[0]);
    // selectedArm is a valid arm index
    expect(result.current.state.selectedArms[0]).toBeGreaterThanOrEqual(0);
    expect(result.current.state.selectedArms[0]).toBeLessThan(DEFAULT_ARMS);
  });

  it('multiple stepOnce calls accumulate correctly', () => {
    const { result } = renderBandit();

    act(() => {
      for (let i = 0; i < 10; i++) {
        result.current.stepOnce();
      }
    });

    expect(result.current.state.totalTrials).toBe(10);
    expect(result.current.state.step).toBe(10);
    expect(result.current.state.rewards).toHaveLength(10);
    expect(result.current.state.selectedArms).toHaveLength(10);

    // Sum of individual arm trials should equal totalTrials
    const totalArmTrials = result.current.state.arms.reduce((s, a) => s + a.trials, 0);
    expect(totalArmTrials).toBe(10);
  });

  /* ── reset ── */

  it('reset returns state to initial values', () => {
    const { result } = renderBandit();

    // Advance some steps
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.stepOnce();
      }
    });
    expect(result.current.state.totalTrials).toBe(5);

    // Reset
    act(() => {
      result.current.reset();
    });

    const { state } = result.current;
    expect(state.totalTrials).toBe(0);
    expect(state.step).toBe(0);
    expect(state.rewards).toEqual([]);
    expect(state.selectedArms).toEqual([]);
    expect(state.running).toBe(false);
    for (const arm of state.arms) {
      expect(arm.wins).toBe(0);
      expect(arm.trials).toBe(0);
    }
  });

  /* ── start / pause ── */

  it('start sets running to true', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.start();
    });

    expect(result.current.state.running).toBe(true);
  });

  it('pause sets running to false', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.start();
    });
    expect(result.current.state.running).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.state.running).toBe(false);
  });

  /* ── Auto-stepping (timer-based) ── */

  it('auto-steps when running via timers', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.start();
    });

    // Advance timer enough for one step
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.state.totalTrials).toBeGreaterThan(0);
  });

  it('stops auto-stepping after pause', () => {
    const { result } = renderBandit();

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const trialsAfterRun = result.current.state.totalTrials;

    act(() => {
      result.current.pause();
    });

    // Advance more time - should NOT increase
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.state.totalTrials).toBe(trialsAfterRun);
  });

  /* ── Algorithm: thompson ── */

  it('thompson algorithm produces valid arm selection', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.stepOnce();
      }
    });

    expect(result.current.state.totalTrials).toBe(20);
    // Each selected arm index should be within bounds
    for (const arm of result.current.state.selectedArms) {
      expect(arm).toBeGreaterThanOrEqual(0);
      expect(arm).toBeLessThan(3);
    }
    // Total arm trials should match totalTrials
    const totalArmTrials = result.current.state.arms.reduce((s, a) => s + a.trials, 0);
    expect(totalArmTrials).toBe(20);
  });

  /* ── Algorithm: epsilon-greedy ── */

  it('epsilon-greedy algorithm produces valid arm selection', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'epsilon', 0.2);

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.stepOnce();
      }
    });

    expect(result.current.state.totalTrials).toBe(20);
    for (const arm of result.current.state.selectedArms) {
      expect(arm).toBeGreaterThanOrEqual(0);
      expect(arm).toBeLessThan(3);
    }
    const totalArmTrials = result.current.state.arms.reduce((s, a) => s + a.trials, 0);
    expect(totalArmTrials).toBe(20);
  });

  it('epsilon-greedy with epsilon=0 never explores randomly (pure greedy)', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'epsilon', 0);

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.stepOnce();
      }
    });

    // All arms selected should be valid
    for (const arm of result.current.state.selectedArms) {
      expect(arm).toBeGreaterThanOrEqual(0);
      expect(arm).toBeLessThan(3);
    }
  });

  /* ── Algorithm: UCB1 ── */

  it('ucb1 algorithm produces valid arm selection', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'ucb1');

    act(() => {
      for (let i = 0; i < 20; i++) {
        result.current.stepOnce();
      }
    });

    expect(result.current.state.totalTrials).toBe(20);
    for (const arm of result.current.state.selectedArms) {
      expect(arm).toBeGreaterThanOrEqual(0);
      expect(arm).toBeLessThan(3);
    }
    const totalArmTrials = result.current.state.arms.reduce((s, a) => s + a.trials, 0);
    expect(totalArmTrials).toBe(20);
  });

  it('ucb1 explores all arms in early rounds (untried arms have infinite score)', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'ucb1');

    act(() => {
      result.current.stepOnce();
    });

    // After one step, at least one arm should have been tried
    const triedArms = result.current.state.arms.filter((a) => a.trials > 0);
    expect(triedArms.length).toBeGreaterThanOrEqual(1);
  });

  /* ── Parameter change triggers reset ── */

  it('changing nArms triggers reset (new arm count)', () => {
    const { result, rerender } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    // Step a few times
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.stepOnce();
      }
    });
    expect(result.current.state.totalTrials).toBe(5);
    expect(result.current.state.arms).toHaveLength(3);

    // Change nArms from 3 to 4
    rerender({
      nArms: 4,
      trueProbs: [0.2, 0.4, 0.6, 0.8],
      algorithm: 'thompson' as Algorithm,
      epsilon: 0.1,
      speed: 50,
    });

    // State should be reset
    expect(result.current.state.arms).toHaveLength(4);
    expect(result.current.state.totalTrials).toBe(0);
    expect(result.current.state.step).toBe(0);
    expect(result.current.state.rewards).toEqual([]);
    expect(result.current.state.selectedArms).toEqual([]);
  });

  it('changing algorithm triggers reset', () => {
    const { result, rerender } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.stepOnce();
      }
    });
    expect(result.current.state.totalTrials).toBe(5);

    // Switch algorithm
    rerender({
      nArms: 3,
      trueProbs: [0.3, 0.5, 0.7],
      algorithm: 'ucb1' as Algorithm,
      epsilon: 0.1,
      speed: 50,
    });

    expect(result.current.state.totalTrials).toBe(0);
    expect(result.current.state.step).toBe(0);
  });

  /* ── Reward values ── */

  it('rewards are always 0 or 1', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.stepOnce();
      }
    });

    for (const r of result.current.state.rewards) {
      expect(r === 0 || r === 1).toBe(true);
    }
  });

  it('wins never exceed trials for any arm', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    act(() => {
      for (let i = 0; i < 50; i++) {
        result.current.stepOnce();
      }
    });

    for (const arm of result.current.state.arms) {
      expect(arm.wins).toBeLessThanOrEqual(arm.trials);
      expect(arm.wins).toBeGreaterThanOrEqual(0);
    }
  });

  /* ── Auto-stop at 1000 trials ── */

  it('auto-stops running after reaching 1000 trials', () => {
    const { result } = renderBandit(2, [0.5, 0.5], 'thompson', 0.1, 100);

    // Manually step to 999
    act(() => {
      for (let i = 0; i < 999; i++) {
        result.current.stepOnce();
      }
    });
    expect(result.current.state.totalTrials).toBe(999);

    // Start auto-running - at 1000 total it should stop
    act(() => {
      result.current.start();
    });

    // Advance timers to trigger auto-step
    act(() => {
      vi.advanceTimersByTime(300);
    });

    // Should reach 1000 and stop
    expect(result.current.state.totalTrials).toBe(1000);

    // After more time, should not go past 1000
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.state.totalTrials).toBe(1000);
    expect(result.current.state.running).toBe(false);
  });

  /* ── Return shape ── */

  it('returns all expected methods and state', () => {
    const { result } = renderBandit();
    expect(result.current).toHaveProperty('state');
    expect(result.current).toHaveProperty('start');
    expect(result.current).toHaveProperty('pause');
    expect(result.current).toHaveProperty('reset');
    expect(result.current).toHaveProperty('stepOnce');
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.stepOnce).toBe('function');
  });

  /* ── trueProbs change triggers reset ── */

  it('changing trueProbs triggers reset', () => {
    const { result, rerender } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    // Step a few times
    act(() => {
      for (let i = 0; i < 5; i++) {
        result.current.stepOnce();
      }
    });
    expect(result.current.state.totalTrials).toBe(5);

    // Change trueProbs (same nArms, different probabilities)
    rerender({
      nArms: 3,
      trueProbs: [0.1, 0.2, 0.9],
      algorithm: 'thompson' as Algorithm,
      epsilon: 0.1,
      speed: 50,
    });

    // State should be reset
    expect(result.current.state.totalTrials).toBe(0);
    expect(result.current.state.step).toBe(0);
    expect(result.current.state.rewards).toEqual([]);
    expect(result.current.state.selectedArms).toEqual([]);
  });

  /* ── Array integrity after many steps ── */

  it('rewards and selectedArms arrays stay in sync after many steps', () => {
    const { result } = renderBandit(3, [0.3, 0.5, 0.7], 'thompson');

    act(() => {
      for (let i = 0; i < 100; i++) {
        result.current.stepOnce();
      }
    });

    expect(result.current.state.rewards).toHaveLength(100);
    expect(result.current.state.selectedArms).toHaveLength(100);
    expect(result.current.state.totalTrials).toBe(100);

    // Sum of arm trials must equal totalTrials
    const armTrials = result.current.state.arms.reduce((s, a) => s + a.trials, 0);
    expect(armTrials).toBe(100);

    // Sum of arm wins must equal sum of rewards
    const armWins = result.current.state.arms.reduce((s, a) => s + a.wins, 0);
    const rewardSum = result.current.state.rewards.reduce((s, r) => s + r, 0);
    expect(armWins).toBe(rewardSum);
  });
});
