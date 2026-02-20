import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import ConceptLink from '../ConceptLink';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConceptLink', () => {
  it('renders a link with correct href', () => {
    const { container } = render(
      <ConceptLink moduleId="m2" display="P-Value" desc="The probability">
        p-value
      </ConceptLink>
    );
    const link = container.querySelector('a');
    expect(link).toBeTruthy();
    expect(link.getAttribute('href')).toBe('#m2');
    expect(link.textContent).toBe('p-value');
  });

  it('has no tooltip initially', () => {
    const { container } = render(
      <ConceptLink moduleId="m2" display="P-Value" desc="The probability">
        p-value
      </ConceptLink>
    );
    // Tooltip span should not be present
    const spans = container.querySelectorAll('span');
    // Only the wrapper span should exist
    const tooltipSpans = Array.from(spans).filter(
      (s) => s.textContent.includes('The probability') && s.classList.contains('absolute')
    );
    expect(tooltipSpans.length).toBe(0);
  });

  it('shows tooltip after 400ms hover', () => {
    const { container } = render(
      <ConceptLink moduleId="m2" display="P-Value" desc="The probability">
        p-value
      </ConceptLink>
    );
    const wrapper = container.querySelector('span');

    act(() => {
      fireEvent.mouseEnter(wrapper);
    });

    // Tooltip not yet visible
    expect(container.textContent).not.toContain('The probability');

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Now tooltip should be visible
    expect(container.textContent).toContain('P-Value');
    expect(container.textContent).toContain('The probability');
  });

  it('hides tooltip on mouse leave', () => {
    const { container } = render(
      <ConceptLink moduleId="m2" display="P-Value" desc="The probability">
        p-value
      </ConceptLink>
    );
    const wrapper = container.querySelector('span');

    act(() => {
      fireEvent.mouseEnter(wrapper);
      vi.advanceTimersByTime(400);
    });

    expect(container.textContent).toContain('The probability');

    act(() => {
      fireEvent.mouseLeave(wrapper);
    });

    expect(container.textContent).not.toContain('The probability');
  });

  it('does not show tooltip if mouse leaves before 400ms', () => {
    const { container } = render(
      <ConceptLink moduleId="m2" display="P-Value" desc="The probability">
        p-value
      </ConceptLink>
    );
    const wrapper = container.querySelector('span');

    act(() => {
      fireEvent.mouseEnter(wrapper);
      vi.advanceTimersByTime(200);
      fireEvent.mouseLeave(wrapper);
      vi.advanceTimersByTime(300);
    });

    expect(container.textContent).not.toContain('The probability');
  });

  it('click sets window.location.hash', () => {
    const { container } = render(
      <ConceptLink moduleId="m5" display="Experiment" desc="Testing">
        randomization
      </ConceptLink>
    );
    const link = container.querySelector('a');

    act(() => {
      fireEvent.click(link);
    });

    expect(window.location.hash).toBe('#m5');
  });
});
