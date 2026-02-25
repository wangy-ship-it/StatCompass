import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock useSpring to return target instantly (no animation)
vi.mock('../useSpring', () => ({
  default: (target: number) => target,
}));

import useAnimatedParams from '../useAnimatedParams';

beforeEach(() => {
  window.location.hash = '#m1';
  vi.restoreAllMocks();
});

describe('useAnimatedParams', () => {
  it('returns defaults when no URL params', () => {
    const { result } = renderHook(() => useAnimatedParams({ alpha: 0.05, n: 100 }));
    expect(result.current[0]).toEqual({ alpha: 0.05, n: 100 });
  });

  it('returns same shape as defaults', () => {
    const defaults = { alpha: 0.05, n: 100, method: 'freq', show: false };
    const { result } = renderHook(() => useAnimatedParams(defaults));
    const keys = Object.keys(result.current[0]);
    expect(keys).toEqual(Object.keys(defaults));
  });

  it('passes string params through without spring', () => {
    window.location.hash = '#m1?method=bayes';
    const { result } = renderHook(() => useAnimatedParams({ alpha: 0.05, method: 'freq' }));
    expect(result.current[0].method).toBe('bayes');
  });

  it('passes boolean params through without spring', () => {
    window.location.hash = '#m1?show=1';
    const { result } = renderHook(() => useAnimatedParams({ show: false, n: 10 }));
    expect(result.current[0].show).toBe(true);
  });

  it('passes integer params through without rounding', () => {
    const { result } = renderHook(() => useAnimatedParams({ n: 100 }));
    // With mocked useSpring returning exact value, the raw spring value passes through
    expect(result.current[0].n).toBe(100);
  });

  it('set() updates state and URL', () => {
    const { result } = renderHook(() => useAnimatedParams({ alpha: 0.05, n: 100 }));
    act(() => result.current[1]('alpha', 0.1));
    // After setting, the mock spring returns 0.1 immediately
    expect(result.current[0].alpha).toBeCloseTo(0.1);
    expect(window.location.hash).toContain('alpha=0.1');
  });
});
