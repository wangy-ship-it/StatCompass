import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCLTSim from '../useCLTSim';

/* ── Helpers ────────────────────────────────────────────────────── */

const POP_SHAPE = 'uniform';
const SAMPLE_SIZE = 30;
const SPEED = 50;

function renderSim(popShape = POP_SHAPE, sampleSize = SAMPLE_SIZE, speed = SPEED) {
  return renderHook(({ popShape, sampleSize, speed }) => useCLTSim(popShape, sampleSize, speed), {
    initialProps: { popShape, sampleSize, speed },
  });
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('useCLTSim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /* ── Initialization ── */

  it('initializes with empty means and valid parameters', () => {
    const { result } = renderSim();
    const { state } = result.current;

    expect(state.means).toEqual([]);
    expect(state.step).toBe(0);
    expect(state.running).toBe(false);
    expect(state.mu).toBe(0.5);
    expect(state.seMean).toBeGreaterThan(0);
    expect(state.binRange[0]).toBeLessThan(state.binRange[1]);
  });

  it('initializes with correct mu for exponential', () => {
    const { result } = renderSim('exponential');
    expect(result.current.state.mu).toBe(0.5);
    // SE should be larger for exponential (sd=0.5 vs sd=0.289 for uniform)
    const { result: uniformResult } = renderSim('uniform');
    expect(result.current.state.seMean).toBeGreaterThan(uniformResult.current.state.seMean);
  });

  /* ── stepOnce ── */

  it('stepOnce adds BATCH=5 sample means', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    expect(result.current.state.means).toHaveLength(5);
    expect(result.current.state.step).toBe(5);
  });

  it('multiple stepOnce calls accumulate correctly', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
      result.current.stepOnce();
      result.current.stepOnce();
    });

    expect(result.current.state.means).toHaveLength(15);
    expect(result.current.state.step).toBe(15);
  });

  it('sample means are reasonable numbers', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 10; i++) result.current.stepOnce();
    });

    for (const m of result.current.state.means) {
      expect(m).toBeGreaterThan(-10);
      expect(m).toBeLessThan(10);
      expect(Number.isFinite(m)).toBe(true);
    }
  });

  /* ── reset ── */

  it('reset returns state to initial values', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 3; i++) result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(15);

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.means).toEqual([]);
    expect(result.current.state.step).toBe(0);
    expect(result.current.state.running).toBe(false);
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

    expect(result.current.state.step).toBeGreaterThan(0);
  });

  it('stops auto-stepping after pause', () => {
    const { result } = renderSim();

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });
    const stepsAfterRun = result.current.state.step;

    act(() => {
      result.current.pause();
    });

    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.state.step).toBe(stepsAfterRun);
  });

  /* ── Auto-stop at 500 ── */

  it('auto-stops at 500 samples', () => {
    const { result } = renderSim('uniform', 30, 100);

    // Step to 495 manually (99 steps of 5)
    act(() => {
      for (let i = 0; i < 99; i++) result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(495);

    // Start and let it finish
    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state.step).toBe(500);
    expect(result.current.state.means).toHaveLength(500);
    expect(result.current.state.running).toBe(false);
  });

  /* ── Parameter change triggers reset ── */

  it('changing popShape triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(5);

    rerender({ popShape: 'exponential', sampleSize: SAMPLE_SIZE, speed: SPEED });

    expect(result.current.state.step).toBe(0);
    expect(result.current.state.means).toEqual([]);
  });

  it('changing sampleSize triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(5);

    rerender({ popShape: POP_SHAPE, sampleSize: 100, speed: SPEED });

    expect(result.current.state.step).toBe(0);
    expect(result.current.state.means).toEqual([]);
  });

  /* ── Bin range stability ── */

  it('bin range remains stable across steps', () => {
    const { result } = renderSim();

    const initialRange = [...result.current.state.binRange];

    act(() => {
      for (let i = 0; i < 10; i++) result.current.stepOnce();
    });

    expect(result.current.state.binRange).toEqual(initialRange);
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

  it('produces the same means for same parameters', () => {
    const { result: r1 } = renderSim();
    const { result: r2 } = renderSim();

    act(() => {
      r1.current.stepOnce();
      r2.current.stepOnce();
    });

    expect(r1.current.state.means).toEqual(r2.current.state.means);
  });
});
