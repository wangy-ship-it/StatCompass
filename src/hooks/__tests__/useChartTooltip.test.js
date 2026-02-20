import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useChartTooltip from '../useChartTooltip';

describe('useChartTooltip', () => {
  it('tip is null initially', () => {
    const lookup = () => null;
    const { result } = renderHook(() => useChartTooltip(lookup));
    expect(result.current.tip).toBeNull();
  });

  it('returns correct shape', () => {
    const lookup = () => null;
    const { result } = renderHook(() => useChartTooltip(lookup));
    expect(result.current).toHaveProperty('svgRef');
    expect(result.current).toHaveProperty('tip');
    expect(result.current).toHaveProperty('onPointerMove');
    expect(result.current).toHaveProperty('onPointerLeave');
    expect(typeof result.current.onPointerMove).toBe('function');
    expect(typeof result.current.onPointerLeave).toBe('function');
  });

  it('onPointerLeave clears tip', () => {
    const lookup = () => ({ x: 100, y: 50, lines: [] });
    const { result } = renderHook(() => useChartTooltip(lookup));

    // Simulate pointer leave
    act(() => {
      result.current.onPointerLeave();
    });

    expect(result.current.tip).toBeNull();
  });
});
