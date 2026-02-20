import { useState, useCallback, useRef, type PointerEvent as ReactPointerEvent } from 'react';

export interface TooltipMarker {
  y: number;
  color: string;
}

export interface TooltipLine {
  label: string;
  value: string;
  color: string;
}

export interface TooltipData {
  x: number;
  y: number;
  lines: TooltipLine[];
  markers: TooltipMarker[];
}

export type TooltipLookup = ((vbX: number, vbY: number) => TooltipData | null) | undefined;

export interface ChartTooltipReturn {
  svgRef: React.RefObject<SVGSVGElement | null>;
  tip: TooltipData | null;
  onPointerMove: (e: ReactPointerEvent<SVGSVGElement>) => void;
  onPointerLeave: () => void;
}

export default function useChartTooltip(tooltipLookup: TooltipLookup): ChartTooltipReturn {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tip, setTip] = useState<TooltipData | null>(null);

  const toViewBox = useCallback((clientX: number, clientY: number) => {
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

  const onPointerMove = useCallback(
    (e: ReactPointerEvent<SVGSVGElement>) => {
      if (!tooltipLookup) return;
      const vb = toViewBox(e.clientX, e.clientY);
      if (!vb) return;
      const result = tooltipLookup(vb.x, vb.y);
      if (result) {
        setTip(result);
      } else {
        setTip(null);
      }
    },
    [tooltipLookup, toViewBox],
  );

  const onPointerLeave = useCallback(() => {
    setTip(null);
  }, []);

  return { svgRef, tip, onPointerMove, onPointerLeave };
}
