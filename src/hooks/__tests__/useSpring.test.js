import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useSpring from '../useSpring';

let rafCallbacks;
let rafId;
let originalRAF;
let originalCAF;
let originalMatchMedia;

beforeEach(() => {
  rafCallbacks = [];
  rafId = 0;

  originalRAF = globalThis.requestAnimationFrame;
  originalCAF = globalThis.cancelAnimationFrame;
  originalMatchMedia = window.matchMedia;

  globalThis.requestAnimationFrame = vi.fn((cb) => {
    const id = ++rafId;
    rafCallbacks.push({ id, cb });
    return id;
  });
  globalThis.cancelAnimationFrame = vi.fn((id) => {
    rafCallbacks = rafCallbacks.filter((r) => r.id !== id);
  });

  // Default: no reduced motion
  window.matchMedia = vi.fn(() => ({ matches: false }));
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
    batch.forEach((r) => r.cb());
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

    // Change target
    rerender({ target: 1 });

    // Flush some RAF frames
    act(() => {
      flushRAFs();
    });

    // Should be close to 1 after convergence
    expect(result.current).toBeCloseTo(1, 2);
  });

  it('respects prefers-reduced-motion', () => {
    window.matchMedia = vi.fn(() => ({ matches: true }));

    const { result, rerender } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });

    rerender({ target: 10 });

    // Should jump immediately without animation
    expect(result.current).toBe(10);
    // No RAF calls should have been needed
  });

  it('stops scheduling RAF at convergence', () => {
    const { rerender } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });

    rerender({ target: 1 });

    act(() => {
      flushRAFs();
    });

    // After convergence, no more pending RAF callbacks
    expect(rafCallbacks.length).toBe(0);
  });

  it('cleans up on unmount', () => {
    const { rerender, unmount } = renderHook(({ target }) => useSpring(target), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });
    // At least one RAF should be scheduled
    unmount();
    expect(globalThis.cancelAnimationFrame).toHaveBeenCalled();
  });
});
