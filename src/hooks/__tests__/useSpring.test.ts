import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSpring from '../useSpring';

let rafCallbacks: { id: number; cb: FrameRequestCallback }[];
let rafId: number;
let originalRAF: typeof globalThis.requestAnimationFrame;
let originalCAF: typeof globalThis.cancelAnimationFrame;
let originalMatchMedia: typeof window.matchMedia;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;

  originalRAF = globalThis.requestAnimationFrame;
  originalCAF = globalThis.cancelAnimationFrame;
  originalMatchMedia = window.matchMedia;

  globalThis.requestAnimationFrame = vi.fn((cb: FrameRequestCallback) => {
    const id = ++rafId;
    rafCallbacks.push({ id, cb });
    return id;
  });
  globalThis.cancelAnimationFrame = vi.fn((id: number) => {
    rafCallbacks = rafCallbacks.filter((r) => r.id !== id);
  });

  window.matchMedia = vi.fn(() => ({ matches: false }) as unknown as MediaQueryList);
});

afterEach(() => {
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
  window.matchMedia = originalMatchMedia;
});

function flushRAFs(maxIterations = 200) {
  for (let i = 0; i < maxIterations && rafCallbacks.length > 0; i++) {
    const batch = [...rafCallbacks];
    rafCallbacks = [];
    batch.forEach((r) => r.cb(performance.now()));
  }
}

describe('useSpring', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() => useSpring(5));
    expect(result.current).toBe(5);
  });

  it('converges toward target', () => {
    const { result, rerender } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });
    expect(result.current).toBe(0);

    rerender({ target: 1 });

    act(() => {
      flushRAFs();
    });

    expect(result.current).toBeCloseTo(1, 2);
  });

  it('respects prefers-reduced-motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }) as unknown as MediaQueryList);

    const { result, rerender } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });

    rerender({ target: 10 });

    expect(result.current).toBe(10);
  });

  it('stops scheduling RAF at convergence', () => {
    const { rerender } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });

    rerender({ target: 1 });

    act(() => {
      flushRAFs();
    });

    expect(rafCallbacks.length).toBe(0);
  });

  it('cleans up on unmount', () => {
    const { rerender, unmount } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });
    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });
});
