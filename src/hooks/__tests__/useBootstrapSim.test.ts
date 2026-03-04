import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBootstrapSim from '../useBootstrapSim';

/* ── Helpers ────────────────────────────────────────────────────── */

const DIST_KEY = 'skewed';
const SAMPLE_SIZE = 50;
const N_RESAMPLES = 100;
const SPEED = 50;

function renderSim(
  distKey = DIST_KEY,
  sampleSize = SAMPLE_SIZE,
  nResamples = N_RESAMPLES,
  speed = SPEED,
) {
  return renderHook(
    ({ distKey, sampleSize, nResamples, speed }) =>
      useBootstrapSim(distKey, sampleSize, nResamples, speed),
    {
      initialProps: { distKey, sampleSize, nResamples, speed },
    },
  );
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('useBootstrapSim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── Initialization ── */

  it('initializes with empty distributions and valid parametric stats', () => {
    const { result } = renderSim();
    const { state } = result.current;

    expect(state.bootDist).toEqual([]);
    expect(state.permDist).toEqual([]);
    expect(state.bootStep).toBe(0);
    expect(state.permStep).toBe(0);
    expect(state.running).toBe(false);
    expect(state.groupA).toHaveLength(SAMPLE_SIZE);
    expect(state.groupB).toHaveLength(SAMPLE_SIZE);
    expect(state.diffMean).toBeGreaterThan(0); // groupB = groupA + 5
    expect(state.paramLo).toBeLessThan(state.paramHi);
    expect(state.bootBinRange[0]).toBeLessThan(state.bootBinRange[1]);
    expect(state.permBinRange[0]).toBeLessThan(state.permBinRange[1]);
  });

  /* ── stepOnce ── */

  it('stepOnce adds BATCH=10 resamples to both distributions', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    expect(result.current.state.bootDist).toHaveLength(10);
    expect(result.current.state.permDist).toHaveLength(10);
    expect(result.current.state.bootStep).toBe(10);
    expect(result.current.state.permStep).toBe(10);
  });

  it('multiple stepOnce calls accumulate correctly', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
      result.current.stepOnce();
      result.current.stepOnce();
    });

    expect(result.current.state.bootDist).toHaveLength(30);
    expect(result.current.state.permDist).toHaveLength(30);
    expect(result.current.state.bootStep).toBe(30);
  });

  it('stepOnce computes valid bootstrap CI', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 5; i++) result.current.stepOnce();
    });

    const s = result.current.state;
    expect(s.bootLo).toBeLessThan(s.bootHi);
    expect(s.bootLo).toBeLessThanOrEqual(s.diffMean);
    expect(s.bootHi).toBeGreaterThanOrEqual(s.diffMean);
  });

  it('stepOnce computes valid permutation p-value', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 5; i++) result.current.stepOnce();
    });

    const s = result.current.state;
    expect(s.permPValue).toBeGreaterThanOrEqual(0);
    expect(s.permPValue).toBeLessThanOrEqual(1);
  });

  /* ── reset ── */

  it('reset returns state to initial values', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 3; i++) result.current.stepOnce();
    });
    expect(result.current.state.bootStep).toBe(30);

    act(() => {
      result.current.reset();
    });

    const s = result.current.state;
    expect(s.bootDist).toEqual([]);
    expect(s.permDist).toEqual([]);
    expect(s.bootStep).toBe(0);
    expect(s.permStep).toBe(0);
    expect(s.running).toBe(false);
  });

  /* ── start / pause ── */

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

  /* ── Auto-stepping ── */

  it('auto-steps when running via timers', () => {
    const { result } = renderSim();

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(result.current.state.bootStep).toBeGreaterThan(0);
  });

  it('stops auto-stepping after pause', () => {
    const { result } = renderSim();

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const stepsAfterRun = result.current.state.bootStep;

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.state.bootStep).toBe(stepsAfterRun);
  });

  /* ── Auto-stop ── */

  it('auto-stops when all resamples are done', () => {
    const { result } = renderSim('skewed', 50, 50, 100);

    // Step to 40 manually (4 steps of 10)
    act(() => {
      for (let i = 0; i < 4; i++) result.current.stepOnce();
    });
    expect(result.current.state.bootStep).toBe(40);

    // Start and let it finish
    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state.bootStep).toBe(50);
    expect(result.current.state.running).toBe(false);
  });

  /* ── Parameter change triggers reset ── */

  it('changing distKey triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.bootStep).toBe(10);

    rerender({ distKey: 'normal', sampleSize: SAMPLE_SIZE, nResamples: N_RESAMPLES, speed: SPEED });

    expect(result.current.state.bootStep).toBe(0);
    expect(result.current.state.bootDist).toEqual([]);
  });

  it('changing sampleSize triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.bootStep).toBe(10);

    rerender({ distKey: DIST_KEY, sampleSize: 100, nResamples: N_RESAMPLES, speed: SPEED });

    expect(result.current.state.bootStep).toBe(0);
    expect(result.current.state.groupA).toHaveLength(100);
  });

  /* ── Bin range stability ── */

  it('bin ranges remain stable across steps', () => {
    const { result } = renderSim();

    const initialBootRange = [...result.current.state.bootBinRange];
    const initialPermRange = [...result.current.state.permBinRange];

    act(() => {
      for (let i = 0; i < 5; i++) result.current.stepOnce();
    });

    expect(result.current.state.bootBinRange).toEqual(initialBootRange);
    expect(result.current.state.permBinRange).toEqual(initialPermRange);
  });

  /* ── Return shape ── */

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

  /* ── Seed reproducibility ── */

  it('produces the same initial data for same parameters', () => {
    const { result: r1 } = renderSim();
    const { result: r2 } = renderSim();

    expect(r1.current.state.diffMean).toBe(r2.current.state.diffMean);
    expect(r1.current.state.paramLo).toBe(r2.current.state.paramLo);
  });
});
