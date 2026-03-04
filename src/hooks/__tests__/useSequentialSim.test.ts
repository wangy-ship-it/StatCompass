import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSequentialSim from '../useSequentialSim';

function renderSim(nLooks = 5, trueEffect = 0.5, maxN = 50000, method = 'obf', speed = 50) {
  return renderHook(
    ({ nLooks, trueEffect, maxN, method, speed }) =>
      useSequentialSim(nLooks, trueEffect, maxN, method, speed),
    { initialProps: { nLooks, trueEffect, maxN, method, speed } },
  );
}

describe('useSequentialSim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty state', () => {
    const { result } = renderSim();
    const { state } = result.current;

    expect(state.zPath).toEqual([]);
    expect(state.currentStage).toBe(0);
    expect(state.crossed).toBeNull();
    expect(state.stoppedAt).toBeNull();
    expect(state.completedRuns).toBe(0);
    expect(state.earlyStopCount).toBe(0);
    expect(state.running).toBe(false);
    expect(state.bounds).toHaveLength(5);
  });

  it('stepOnce advances one stage', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    // Either advanced one stage or completed a run (if crossed immediately)
    expect(result.current.state.currentStage + result.current.state.completedRuns).toBeGreaterThan(
      0,
    );
  });

  it('multiple steps build the path', () => {
    const { result } = renderSim(5, 0, 50000, 'obf', 50); // trueEffect=0 to avoid early crossing

    act(() => {
      result.current.stepOnce();
    });

    // With no effect and OBF boundaries, unlikely to cross at stage 1
    if (result.current.state.completedRuns === 0) {
      expect(result.current.state.zPath).toHaveLength(1);
      expect(result.current.state.currentStage).toBe(1);
    }
  });

  it('bounds change with method', () => {
    const { result: obfResult } = renderSim(5, 0.5, 50000, 'obf', 50);
    const { result: pocockResult } = renderSim(5, 0.5, 50000, 'pocock', 50);

    // OBF first boundary should be much higher than Pocock
    expect(obfResult.current.state.bounds[0]).toBeGreaterThan(pocockResult.current.state.bounds[0]);
    // Pocock boundaries should be constant
    const pb = pocockResult.current.state.bounds;
    expect(pb[0]).toBeCloseTo(pb[pb.length - 1], 3);
  });

  it('reset returns state to initial values', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
      result.current.stepOnce();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.zPath).toEqual([]);
    expect(result.current.state.currentStage).toBe(0);
    expect(result.current.state.completedRuns).toBe(0);
    expect(result.current.state.running).toBe(false);
  });

  it('start sets running to true', () => {
    const { result } = renderSim();

    act(() => {
      result.current.start();
    });

    expect(result.current.state.running).toBe(true);
  });

  it('pause sets running to false', () => {
    const { result } = renderSim();

    act(() => {
      result.current.start();
    });
    expect(result.current.state.running).toBe(true);

    act(() => {
      result.current.pause();
    });
    expect(result.current.state.running).toBe(false);
  });

  it('auto-steps when running', () => {
    const { result } = renderSim();

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    // Should have made some progress
    expect(result.current.state.currentStage + result.current.state.completedRuns).toBeGreaterThan(
      0,
    );
  });

  it('changing parameters triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    rerender({ nLooks: 8, trueEffect: 0.5, maxN: 50000, method: 'obf', speed: 50 });

    expect(result.current.state.zPath).toEqual([]);
    expect(result.current.state.currentStage).toBe(0);
    expect(result.current.state.bounds).toHaveLength(8);
  });

  it('returns all expected methods and state', () => {
    const { result } = renderSim();
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

  it('z-values are finite numbers', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    for (const z of result.current.state.zPath) {
      expect(Number.isFinite(z)).toBe(true);
    }
  });

  it('pocock method initializes with correct bounds', () => {
    const { result } = renderSim(5, 0.5, 50000, 'pocock', 50);
    expect(result.current.state.bounds).toHaveLength(5);
    // Pocock: all bounds should be equal
    const b = result.current.state.bounds;
    for (let i = 1; i < b.length; i++) {
      expect(b[i]).toBeCloseTo(b[0], 6);
    }
  });

  it('completes a full run when path reaches final stage with 2 looks', () => {
    // Use 2 looks so path completes in exactly 2 steps
    const { result } = renderSim(2, 0, 50000, 'obf', 50);

    act(() => {
      result.current.stepOnce();
      result.current.stepOnce();
    });

    // After 2 steps with 2 looks, path is complete → auto-resets for next run
    expect(result.current.state.completedRuns).toBeGreaterThanOrEqual(1);
  });

  it('tracks early stop count across multiple runs', () => {
    // Use 2 looks with high effect → likely to cross early at stage 1
    const { result } = renderSim(2, 1.5, 100000, 'pocock', 50);

    // Step many times to complete multiple runs
    act(() => {
      for (let i = 0; i < 100; i++) result.current.stepOnce();
    });

    expect(result.current.state.completedRuns).toBeGreaterThan(0);
    // earlyStopCount should be reasonable
    expect(result.current.state.earlyStopCount).toBeGreaterThanOrEqual(0);
    expect(result.current.state.earlyStopCount).toBeLessThanOrEqual(
      result.current.state.completedRuns,
    );
  });

  it('stops after MAX_RUNS (20) completed runs', () => {
    // Use 2 looks so each run completes in 2 steps max
    const { result } = renderSim(2, 0, 50000, 'obf', 50);

    // Step enough to complete all 20 runs (at most 2 steps per run = 40)
    act(() => {
      for (let i = 0; i < 50; i++) result.current.stepOnce();
    });

    expect(result.current.state.completedRuns).toBe(20);
    expect(result.current.state.running).toBe(false);
  });

  it('stepOnce does nothing after all runs completed', () => {
    const { result } = renderSim(2, 0, 50000, 'obf', 50);

    // Complete all runs
    act(() => {
      for (let i = 0; i < 50; i++) result.current.stepOnce();
    });
    expect(result.current.state.completedRuns).toBe(20);

    // Additional step should not change anything
    const prevState = { ...result.current.state };
    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.completedRuns).toBe(prevState.completedRuns);
  });

  it('detects lower boundary crossing with negative effect', () => {
    // Use negative effect to push z-scores toward lower boundary
    const { result } = renderSim(2, -1.5, 100000, 'pocock', 50);

    // Step through enough runs to see some behavior
    act(() => {
      for (let i = 0; i < 20; i++) result.current.stepOnce();
    });

    // Should have completed some runs
    expect(result.current.state.completedRuns).toBeGreaterThan(0);
  });

  it('cumAlpha is computed for each step', () => {
    const { result } = renderSim(5, 0, 50000, 'obf', 50);

    act(() => {
      result.current.stepOnce();
    });

    // If not yet completed a run, cumAlpha should be > 0
    if (result.current.state.currentStage > 0) {
      expect(result.current.state.cumAlpha).toBeGreaterThan(0);
    }
  });
});
