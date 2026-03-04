import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useBayesianSim from '../useBayesianSim';

function renderSim(trueRateA = 0.1, trueRateB = 0.12, priorA = 1, priorB = 1, speed = 50) {
  return renderHook(
    ({ trueRateA, trueRateB, priorA, priorB, speed }) =>
      useBayesianSim(trueRateA, trueRateB, priorA, priorB, speed),
    { initialProps: { trueRateA, trueRateB, priorA, priorB, speed } },
  );
}

describe('useBayesianSim', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes with prior state', () => {
    const { result } = renderSim();
    const { state } = result.current;

    expect(state.visitorsA).toBe(0);
    expect(state.visitorsB).toBe(0);
    expect(state.conversionsA).toBe(0);
    expect(state.conversionsB).toBe(0);
    expect(state.postAlphaA).toBe(1);
    expect(state.postBetaA).toBe(1);
    expect(state.pBbeatsA).toBe(0.5);
    expect(state.step).toBe(0);
    expect(state.running).toBe(false);
  });

  it('stepOnce adds a batch of visitors', () => {
    const { result } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    expect(result.current.state.visitorsA).toBe(20);
    expect(result.current.state.visitorsB).toBe(20);
    expect(result.current.state.step).toBe(1);
  });

  it('conversions are within valid range', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 5; i++) result.current.stepOnce();
    });

    expect(result.current.state.conversionsA).toBeGreaterThanOrEqual(0);
    expect(result.current.state.conversionsA).toBeLessThanOrEqual(result.current.state.visitorsA);
    expect(result.current.state.conversionsB).toBeGreaterThanOrEqual(0);
    expect(result.current.state.conversionsB).toBeLessThanOrEqual(result.current.state.visitorsB);
  });

  it('posterior parameters update correctly', () => {
    const { result } = renderSim(0.1, 0.12, 1, 1, 50);

    act(() => {
      result.current.stepOnce();
    });

    // Alpha = prior + conversions, Beta = prior + visitors - conversions
    const s = result.current.state;
    expect(s.postAlphaA).toBe(1 + s.conversionsA);
    expect(s.postBetaA).toBe(1 + s.visitorsA - s.conversionsA);
    expect(s.postAlphaB).toBe(1 + s.conversionsB);
    expect(s.postBetaB).toBe(1 + s.visitorsB - s.conversionsB);
  });

  it('pBbeatsA is between 0 and 1', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 10; i++) result.current.stepOnce();
    });

    expect(result.current.state.pBbeatsA).toBeGreaterThanOrEqual(0);
    expect(result.current.state.pBbeatsA).toBeLessThanOrEqual(1);
  });

  it('reset returns state to initial values', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 5; i++) result.current.stepOnce();
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.visitorsA).toBe(0);
    expect(result.current.state.step).toBe(0);
    expect(result.current.state.running).toBe(false);
  });

  it('start and pause control running state', () => {
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

    expect(result.current.state.step).toBeGreaterThan(0);
  });

  it('auto-stops at 100 steps', () => {
    const { result } = renderSim(0.1, 0.12, 1, 1, 100);

    act(() => {
      for (let i = 0; i < 99; i++) result.current.stepOnce();
    });

    act(() => {
      result.current.start();
    });

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.state.step).toBe(100);
    expect(result.current.state.running).toBe(false);
  });

  it('changing true rates triggers reset', () => {
    const { result, rerender } = renderSim();

    act(() => {
      result.current.stepOnce();
    });

    rerender({ trueRateA: 0.2, trueRateB: 0.12, priorA: 1, priorB: 1, speed: 50 });

    expect(result.current.state.step).toBe(0);
  });

  it('returns all expected methods', () => {
    const { result } = renderSim();
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.pause).toBe('function');
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.stepOnce).toBe('function');
  });

  it('uses custom prior parameters', () => {
    const { result } = renderSim(0.1, 0.12, 5, 45, 50);

    expect(result.current.state.postAlphaA).toBe(5);
    expect(result.current.state.postBetaA).toBe(45);
  });

  it('expectedLoss is non-negative', () => {
    const { result } = renderSim();

    act(() => {
      for (let i = 0; i < 5; i++) result.current.stepOnce();
    });

    expect(result.current.state.expectedLoss).toBeGreaterThanOrEqual(0);
  });
});
