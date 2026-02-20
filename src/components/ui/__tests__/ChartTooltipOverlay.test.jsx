import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ChartTooltipOverlay from '../ChartTooltipOverlay';

function renderInSvg(ui) {
  const { container } = render(<svg>{ui}</svg>);
  return container.querySelector('svg');
}

describe('ChartTooltipOverlay', () => {
  it('returns null when tip is null', () => {
    const svg = renderInSvg(<ChartTooltipOverlay tip={null} h={260} />);
    expect(svg.querySelector('g')).toBeNull();
  });

  it('renders crosshair line at tip.x', () => {
    const tip = {
      x: 200,
      y: 100,
      lines: [{ label: 'A', value: '1', color: '#f00' }],
    };
    const svg = renderInSvg(<ChartTooltipOverlay tip={tip} h={260} />);
    const lines = svg.querySelectorAll('line');
    expect(lines.length).toBeGreaterThanOrEqual(1);
    // Crosshair is vertical line at x=200
    const crosshair = lines[0];
    expect(crosshair.getAttribute('x1')).toBe('200');
    expect(crosshair.getAttribute('x2')).toBe('200');
  });

  it('renders markers', () => {
    const tip = {
      x: 200,
      y: 100,
      lines: [{ label: 'A', value: '1', color: '#f00' }],
      markers: [
        { y: 80, color: '#0f0' },
        { y: 120, color: '#00f' },
      ],
    };
    const svg = renderInSvg(<ChartTooltipOverlay tip={tip} h={260} />);
    const circles = svg.querySelectorAll('circle');
    // 2 markers + color dots for label rows
    expect(circles.length).toBeGreaterThanOrEqual(2);
  });

  it('renders correct number of label rows', () => {
    const tip = {
      x: 200,
      y: 100,
      lines: [
        { label: 'Metric A', value: '42', color: '#f00' },
        { label: 'Metric B', value: '7', color: '#0f0' },
        { label: 'Metric C', value: '99', color: '#00f' },
      ],
    };
    const svg = renderInSvg(<ChartTooltipOverlay tip={tip} h={260} />);
    const texts = svg.querySelectorAll('text');
    // 3 labels + 3 values = 6 text elements
    expect(texts.length).toBe(6);
  });

  it('flips box when near right edge', () => {
    const tip = {
      x: 580,
      y: 100,
      lines: [{ label: 'A', value: '1', color: '#f00' }],
    };
    const svg = renderInSvg(<ChartTooltipOverlay tip={tip} h={260} />);
    const rect = svg.querySelector('rect');
    // Box should be positioned left of cursor (x < 580)
    const rectX = parseFloat(rect.getAttribute('x'));
    expect(rectX).toBeLessThan(580);
  });

  it('uses custom w prop for flip logic', () => {
    const tip = {
      x: 250,
      y: 100,
      lines: [{ label: 'A', value: '1', color: '#f00' }],
    };
    // With w=300, x=250 should trigger a flip
    const svg = renderInSvg(<ChartTooltipOverlay tip={tip} h={260} w={300} />);
    const rect = svg.querySelector('rect');
    const rectX = parseFloat(rect.getAttribute('x'));
    expect(rectX).toBeLessThan(250);
  });
});
