import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useModuleParams from '../useModuleParams';

beforeEach(() => {
  window.location.hash = '#m1';
  vi.restoreAllMocks();
});

describe('useModuleParams', () => {
  it('returns defaults when no URL params', () => {
    const { result } = renderHook(() => useModuleParams({ alpha: 0.05, n: 100 }));
    expect(result.current[0]).toEqual({ alpha: 0.05, n: 100 });
  });

  it('parses numeric params from URL', () => {
    window.location.hash = '#m1?alpha=0.1&n=500';
    const { result } = renderHook(() => useModuleParams({ alpha: 0.05, n: 100 }));
    expect(result.current[0]).toEqual({ alpha: 0.1, n: 500 });
  });

  it('ignores unknown params in URL', () => {
    window.location.hash = '#m1?alpha=0.1&bogus=42';
    const { result } = renderHook(() => useModuleParams({ alpha: 0.05 }));
    expect(result.current[0]).toEqual({ alpha: 0.1 });
    expect(result.current[0]).not.toHaveProperty('bogus');
  });

  it('set() updates state and URL', () => {
    const { result } = renderHook(() => useModuleParams({ alpha: 0.05, n: 100 }));
    act(() => result.current[1]('alpha', 0.1));
    expect(result.current[0].alpha).toBe(0.1);
    expect(window.location.hash).toContain('alpha=0.1');
  });

  it('omits default values from URL', () => {
    const { result } = renderHook(() => useModuleParams({ alpha: 0.05, n: 100 }));
    act(() => result.current[1]('alpha', 0.05));
    expect(window.location.hash).toBe('#m1');
  });

  it('parses boolean params', () => {
    window.location.hash = '#m2?show=1';
    const { result } = renderHook(() => useModuleParams({ show: false }));
    expect(result.current[0].show).toBe(true);
  });

  it('parses boolean "true" string', () => {
    window.location.hash = '#m2?show=true';
    const { result } = renderHook(() => useModuleParams({ show: false }));
    expect(result.current[0].show).toBe(true);
  });

  it('parses boolean "0" as false', () => {
    window.location.hash = '#m2?show=0';
    const { result } = renderHook(() => useModuleParams({ show: true }));
    expect(result.current[0].show).toBe(false);
  });

  it('serializes booleans as 1/0', () => {
    const { result } = renderHook(() => useModuleParams({ show: false as boolean }));
    act(() => result.current[1]('show', true));
    expect(window.location.hash).toContain('show=1');
  });

  it('parses string params', () => {
    window.location.hash = '#m4?method=bayesian';
    const { result } = renderHook(() => useModuleParams({ method: 'frequentist' }));
    expect(result.current[0].method).toBe('bayesian');
  });

  it('handles mixed param types', () => {
    window.location.hash = '#m1?alpha=0.1&show=1&method=bayes';
    const { result } = renderHook(() =>
      useModuleParams({ alpha: 0.05, show: false, method: 'freq' }),
    );
    expect(result.current[0]).toEqual({ alpha: 0.1, show: true, method: 'bayes' });
  });
});
