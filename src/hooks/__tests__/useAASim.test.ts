import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useAASim from '../useAASim';

function renderSim(alpha = 0.05, speed = 50) {
  return renderHook(({ alpha, speed }) => useAASim(alpha, speed), {
    initialProps: { alpha, speed },
  });
}

describe('useAASim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with empty state', () => {
    const { result } = renderSim();
    const { state } = result.current;

    expect(state.pValues).toEqual([]);
    expect(state.falsePositives).toBe(0);
    expect(state.fpr).toBe(0);
    expect(state.step).toBe(0);
    expect(state.running).toBe(false);
  });

  it('stepOnce adds one p-value', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    expect(result.current.state.pValues).toHaveLength(1);
    expect(result.current.state.step).toBe(1);
  });

  it('p-values are between 0 and 1', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 20; i++) result.current.stepOnce();
    });

    for (const p of result.current.state.pValues) {
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('false positive rate tracks correctly', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 50; i++) result.current.stepOnce();
    });

    const { falsePositives, step, fpr } = result.current.state;
    expect(fpr).toBeCloseTo(falsePositives / step, 10);
  });

  it('reset returns state to initial values', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 10; i++) result.current.stepOnce();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.pValues).toEqual([]);
    expect(result.current.state.step).toBe(0);
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
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state.step).toBeGreaterThan(0);
  });

  it('auto-stops at 500 tests', () => {
    const { result } = renderSim(0.05, 100);

    // Step to one before max
    act(() => {
      for (let i = 0; i < 499; i++) result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(499);

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.state.step).toBe(500);
    expect(result.current.state.running).toBe(false);
  });

  it('changing alpha triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(1);

    rerender({ alpha: 0.1, speed: 50 });

    expect(result.current.state.step).toBe(0);
    expect(result.current.state.pValues).toEqual([]);
  });

  it('returns all expected methods', () => {
    const { result } = renderSim();
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.stepOnce).toBe('function');
  });

  it('false positives counted correctly against alpha', () => {
    const { result } = renderSim(0.5, 50); // high alpha to guarantee some FPs

    act(() => {
      for (let i = 0; i < 100; i++) result.current.stepOnce();
    });

    const { pValues, falsePositives } = result.current.state;
    const manualCount = pValues.filter((p) => p < 0.5).length;
    expect(falsePositives).toBe(manualCount);
  });

  it('produces reproducible results', () => {
    const { result: r1 } = renderSim();
    const { result: r2 } = renderSim();

    act(() => {
      r1.current.stepOnce();
      r2.current.stepOnce();
    });

    expect(r1.current.state.pValues[0]).toBe(r2.current.state.pValues[0]);
  });

  it('stepOnce does nothing at max tests', () => {
    const { result } = renderSim(0.05, 100);

    act(() => {
      for (let i = 0; i < 500; i++) result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(500);

    act(() => {
      result.current.stepOnce();
    });
    expect(result.current.state.step).toBe(500);
  });
});
