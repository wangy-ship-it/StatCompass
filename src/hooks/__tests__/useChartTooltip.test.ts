import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useChartTooltip, { type TooltipData } from '../useChartTooltip';
import type { PointerEvent as ReactPointerEvent } from 'react';

/* ── Helpers ────────────────────────────────────────────────────── */

/** Build a minimal fake SVG element whose getScreenCTM returns an identity matrix. */
function makeFakeSVG() {
  const point = {
    x: 0,
    y: 0,
    matrixTransform: vi.fn((_inv: DOMMatrix) => {
      // Simulate identity: output equals input
      return { x: point.x, y: point.y };
    }),
  };

  const svg = {
    getScreenCTM: vi.fn(() => ({
      inverse: vi.fn(() => ({
        /* identity inverse */
      })),
    })),
    createSVGPoint: vi.fn(() => point),
  };

  return { svg, point };
}

/** Build a synthetic PointerEvent that mimics React.PointerEvent<SVGSVGElement>. */
function fakePointerEvent(clientX: number, clientY: number): ReactPointerEvent<SVGSVGElement> {
  return { clientX, clientY } as unknown as ReactPointerEvent<SVGSVGElement>;
}

/* ── Tests ──────────────────────────────────────────────────────── */

describe('useChartTooltip', () => {
  it('returns null tip initially', () => {
    const lookup = vi.fn(() => null);
    const { result } = renderHook(() => useChartTooltip(lookup));
    expect(result.current.tip).toBeNull();
  });

  it('returns a ref object for svgRef', () => {
    const { result } = renderHook(() => useChartTooltip(undefined));
    // React refs have a `current` property
    expect(result.current.svgRef).toHaveProperty('current');
    expect(result.current.svgRef.current).toBeNull();
  });

  it('exposes onPointerMove and onPointerLeave as functions', () => {
    const { result } = renderHook(() => useChartTooltip(undefined));
    expect(typeof result.current.onPointerMove).toBe('function');
    expect(typeof result.current.onPointerLeave).toBe('function');
  });

  it('onPointerLeave sets tip to null', () => {
    const lookup = vi.fn(() => null);
    const { result } = renderHook(() => useChartTooltip(lookup));

    act(() => {
      result.current.onPointerLeave();
    });

    expect(result.current.tip).toBeNull();
  });

  it('handles undefined tooltipLookup without crashing on pointer move', () => {
    const { result } = renderHook(() => useChartTooltip(undefined));

    // Should not throw even with a fake pointer event
    expect(() => {
      act(() => {
        result.current.onPointerMove(fakePointerEvent(50, 60));
      });
    }).not.toThrow();

    expect(result.current.tip).toBeNull();
  });

  it('does not call lookup when svgRef.current is null (no SVG attached)', () => {
    const lookup = vi.fn(() => null);
    const { result } = renderHook(() => useChartTooltip(lookup));

    // svgRef.current is null (no DOM element assigned)
    act(() => {
      result.current.onPointerMove(fakePointerEvent(10, 20));
    });

    // toViewBox returns null because svgRef.current is null, so lookup is never called
    expect(lookup).not.toHaveBeenCalled();
    expect(result.current.tip).toBeNull();
  });

  it('when tooltipLookup returns null, tip stays null', () => {
    const lookup = vi.fn((_x: number, _y: number) => null);
    const { result } = renderHook(() => useChartTooltip(lookup));

    // Attach a fake SVG to the ref
    const { svg } = makeFakeSVG();
    (result.current.svgRef as { current: unknown }).current = svg;

    act(() => {
      result.current.onPointerMove(fakePointerEvent(100, 200));
    });

    expect(lookup).toHaveBeenCalled();
    expect(result.current.tip).toBeNull();
  });

  it('when tooltipLookup returns data, tip is updated', () => {
    const tooltipData: TooltipData = {
      x: 42,
      y: 84,
      lines: [{ label: 'Mean', value: '3.14', color: '#f00' }],
      markers: [{ y: 84, color: '#f00' }],
    };
    const lookup = vi.fn((_x: number, _y: number) => tooltipData);
    const { result } = renderHook(() => useChartTooltip(lookup));

    const { svg } = makeFakeSVG();
    (result.current.svgRef as { current: unknown }).current = svg;

    act(() => {
      result.current.onPointerMove(fakePointerEvent(100, 200));
    });

    expect(lookup).toHaveBeenCalled();
    expect(result.current.tip).toEqual(tooltipData);
  });

  it('clears previously set tip when tooltipLookup returns null', () => {
    let returnData = true;
    const tooltipData: TooltipData = {
      x: 10,
      y: 20,
      lines: [{ label: 'A', value: '1', color: '#000' }],
      markers: [],
    };
    const lookup = vi.fn(() => (returnData ? tooltipData : null));
    const { result } = renderHook(() => useChartTooltip(lookup));

    const { svg } = makeFakeSVG();
    (result.current.svgRef as { current: unknown }).current = svg;

    // First move: returns data
    act(() => {
      result.current.onPointerMove(fakePointerEvent(10, 20));
    });
    expect(result.current.tip).toEqual(tooltipData);

    // Second move: lookup returns null
    returnData = false;
    act(() => {
      result.current.onPointerMove(fakePointerEvent(30, 40));
    });
    expect(result.current.tip).toBeNull();
  });

  it('onPointerLeave clears tip that was previously set', () => {
    const tooltipData: TooltipData = {
      x: 5,
      y: 10,
      lines: [{ label: 'B', value: '2', color: '#0f0' }],
      markers: [{ y: 10, color: '#0f0' }],
    };
    const lookup = vi.fn(() => tooltipData);
    const { result } = renderHook(() => useChartTooltip(lookup));

    const { svg } = makeFakeSVG();
    (result.current.svgRef as { current: unknown }).current = svg;

    // Set tip
    act(() => {
      result.current.onPointerMove(fakePointerEvent(5, 10));
    });
    expect(result.current.tip).toEqual(tooltipData);

    // Leave clears it
    act(() => {
      result.current.onPointerLeave();
    });
    expect(result.current.tip).toBeNull();
  });

  it('does not update tip when getScreenCTM returns null', () => {
    const lookup = vi.fn(() => ({ x: 1, y: 2, lines: [], markers: [] }));
    const { result } = renderHook(() => useChartTooltip(lookup));

    // SVG with getScreenCTM returning null
    const svg = {
      getScreenCTM: vi.fn(() => null),
      createSVGPoint: vi.fn(),
    };
    (result.current.svgRef as { current: unknown }).current = svg;

    act(() => {
      result.current.onPointerMove(fakePointerEvent(10, 20));
    });

    // toViewBox returns null, so lookup should not be called
    expect(lookup).not.toHaveBeenCalled();
    expect(result.current.tip).toBeNull();
  });

  it('passes correct viewBox coordinates to tooltipLookup', () => {
    const lookup = vi.fn((_x: number, _y: number) => null);
    const { result } = renderHook(() => useChartTooltip(lookup));

    // Create a fake SVG where matrixTransform returns specific coordinates
    const transformedPoint = { x: 75, y: 150 };
    const point = {
      x: 0,
      y: 0,
      matrixTransform: vi.fn(() => transformedPoint),
    };
    const inverseMat = {};
    const svg = {
      getScreenCTM: vi.fn(() => ({ inverse: vi.fn(() => inverseMat) })),
      createSVGPoint: vi.fn(() => point),
    };
    (result.current.svgRef as { current: unknown }).current = svg;

    act(() => {
      result.current.onPointerMove(fakePointerEvent(300, 400));
    });

    // The client coordinates should be set on the point
    expect(point.x).toBe(300);
    expect(point.y).toBe(400);
    // matrixTransform should be called with the inverse matrix
    expect(point.matrixTransform).toHaveBeenCalledWith(inverseMat);
    // lookup should receive the transformed coordinates
    expect(lookup).toHaveBeenCalledWith(75, 150);
  });
});
