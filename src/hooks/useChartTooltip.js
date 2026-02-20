import { useState, useCallback, useRef } from 'react';

/**
 * Hook for SVG chart tooltip positioning.
 * Returns { svgRef, tip, onPointerMove, onPointerLeave }
 *
 * tip = null when no hover, or { x, y, lines, markers } from tooltipLookup.
 */
export default function useChartTooltip(tooltipLookup) {
  const svgRef = useRef(null);
  const [tip, setTip] = useState(null);

  const toViewBox = useCallback((clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const ctm = svg.getScreenCTM();
    if (!ctm) return null;
    const inv = ctm.inverse();
    const pt = svg.createSVGPoint();
    pt.x = clientX;
    pt.y = clientY;
    const svgPt = pt.matrixTransform(inv);
    return { x: svgPt.x, y: svgPt.y };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!tooltipLookup) return;
    const vb = toViewBox(e.clientX, e.clientY);
    if (!vb) return;
    const result = tooltipLookup(vb.x, vb.y);
    if (result) {
      setTip(result);
    } else {
      setTip(null);
    }
  }, [tooltipLookup, toViewBox]);

  const onPointerLeave = useCallback(() => {
    setTip(null);
  }, []);

  return { svgRef, tip, onPointerMove, onPointerLeave };
}
